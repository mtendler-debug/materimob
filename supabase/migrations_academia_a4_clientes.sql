-- Academia de Vendas, Fase A4: Meus clientes (registro de cliente na visão do
-- corretor) e correção do pedido de acesso do dono do canal.
-- Depende de A0 a A2 e do módulo Parcerias (pc_registros_cliente).
--
-- 1) CORREÇÃO. O administrador do canal (Marcos) pediu acesso pela própria conta
--    e ficou com um pedido que ninguém pode decidir (não se altera o próprio
--    acesso), o que também levava o app dele a abrir na Academia. Agora:
--    o dono não consegue pedir, pc_meu_acesso devolve nada para ele, e o pedido
--    que já existia é apagado.
-- 2) REGISTRO DE CLIENTE pelo corretor parceiro, em função do banco (mesma regra
--    da Edge Function pc-registro-cliente: validade, conflito e elegibilidade).
--    As linhas de pc_registros_cliente continuam fechadas a parceiros: leitura só
--    pelas funções abaixo, que não devolvem anotações internas nem quem tem o
--    registro conflitante.
-- 3) Cada mudança de situação do registro vira atividade do corretor, por um
--    gatilho que nunca derruba a gravação do registro se der erro.
-- 4) Corretor autônomo: ao liberar, ganha um cadastro "Autônomo · nome" (PF), não
--    validado, para os registros terem a quem se ligar.

begin;

-- ---------------------------------------------------------------------
-- 1) Correção do dono do canal
-- ---------------------------------------------------------------------

create or replace function pc_meu_acesso()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'status', a.status,
    'papel', a.papel,
    'nome', a.nome,
    'parceira_id', a.parceira_id,
    'parceira', p.nome_fantasia
  )
  from pc_acessos a
  left join pc_parceiras p on p.id = a.parceira_id
  where a.user_id = auth.uid() and not pc_sou_dono_do_canal();
$$;

create or replace function pc_solicitar_acesso(
  p_nome text,
  p_whatsapp text,
  p_creci text,
  p_papel pc_papel_canal,
  p_parceira_id uuid default null,
  p_imobiliaria_informada text default null
)
returns pc_status_acesso
language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_parceira uuid := p_parceira_id;
  v_nome_imob text := nullif(trim(coalesce(p_imobiliaria_informada, '')), '');
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro';
  end if;
  if pc_sou_dono_do_canal() then
    raise exception 'O administrador do canal não pede acesso à Academia';
  end if;
  if nullif(trim(coalesce(p_nome, '')), '') is null then
    raise exception 'Informe o seu nome';
  end if;
  if exists (select 1 from pc_acessos where user_id = auth.uid()) then
    raise exception 'Você já tem um pedido de acesso';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if v_parceira is not null then
    select owner_id into v_owner from pc_parceiras
    where id = v_parceira and ativa_na_academia and validado and owner_id = pc_dono_padrao();
    if v_owner is null then
      raise exception 'Imobiliária não encontrada';
    end if;
  else
    v_owner := pc_dono_padrao();
    if v_owner is null then
      raise exception 'Canal indisponível no momento';
    end if;
    if v_nome_imob is not null then
      select id into v_parceira from pc_parceiras
      where owner_id = v_owner and lower(nome_fantasia) = lower(v_nome_imob)
      limit 1;
      if v_parceira is null then
        insert into pc_parceiras (owner_id, nome_fantasia, origem, validado)
        values (v_owner, v_nome_imob, 'autocadastro_academia', false)
        returning id into v_parceira;
      end if;
    end if;
  end if;

  if p_papel = 'gestor' and v_parceira is null then
    raise exception 'Para ser gestor, informe a imobiliária';
  end if;

  insert into pc_acessos (user_id, owner_id, parceira_id, papel, nome, whatsapp, creci, email, imobiliaria_informada)
  values (
    auth.uid(), v_owner, v_parceira, p_papel, trim(p_nome),
    nullif(trim(coalesce(p_whatsapp, '')), ''),
    nullif(trim(coalesce(p_creci, '')), ''),
    v_email, v_nome_imob
  );
  return 'pendente';
end;
$$;

delete from pc_acessos a
where exists (select 1 from platform_admins pa where pa.user_id = a.user_id);

-- ---------------------------------------------------------------------
-- 2) Registro de cliente
-- ---------------------------------------------------------------------

-- Registros feitos pelo corretor na Academia.
alter table pc_registros_cliente drop constraint pc_registros_cliente_origem_registro_check;
alter table pc_registros_cliente add constraint pc_registros_cliente_origem_registro_check
  check (origem_registro in ('painel', 'formulario_publico', 'academia'));

-- O mesmo cliente digitado de formas diferentes, (16) 99111-2200 e 16991112200,
-- tem que dar conflito. Compara só os dígitos.
create or replace function pc_checar_conflito(
  p_owner_id uuid,
  p_telefone text,
  p_cpf_hash text,
  p_empreendimento_id uuid,
  p_excluir_registro_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escopo text;
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
  v_id uuid;
begin
  select conflito_escopo into v_escopo from pc_config where owner_id = p_owner_id;
  v_escopo := coalesce(v_escopo, 'empreendimento');

  select id into v_id
  from pc_registros_cliente
  where owner_id = p_owner_id
    and (id is distinct from p_excluir_registro_id)
    and status in ('registrado', 'visita', 'proposta')
    and valido_ate >= now()
    and (
      (v_tel is not null and regexp_replace(cliente_telefone, '\D', '', 'g') = v_tel)
      or (p_cpf_hash is not null and cliente_cpf_hash = p_cpf_hash)
    )
    and (
      v_escopo = 'carteira'
      or empreendimento_id = p_empreendimento_id
      or empreendimento_id is null
      or p_empreendimento_id is null
    )
  order by registrado_em asc
  limit 1;

  return v_id;
end;
$$;

-- Cadastro de parceira para o corretor autônomo. Interna. Não validado: não
-- entra no funil nem no Kanban, e não dispara a sincronização com o Leadlinks.
create or replace function pc_garantir_parceira_pf(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
  v_id uuid;
begin
  select * into a from pc_acessos where user_id = p_user;
  if a.user_id is null then
    return null;
  end if;
  if a.parceira_id is not null then
    return a.parceira_id;
  end if;
  insert into pc_parceiras (owner_id, nome_fantasia, tipo_pessoa, origem, validado, responsavel_nome, responsavel_telefone, responsavel_email)
  values (a.owner_id, 'Autônomo · ' || a.nome, 'PF', 'autonomo_academia', false, a.nome, a.whatsapp, a.email)
  returning id into v_id;
  update pc_acessos set parceira_id = v_id, updated_at = now() where user_id = p_user;
  return v_id;
end;
$$;

create or replace function pc_decidir_acesso(p_user uuid, p_status pc_status_acesso)
returns void language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = p_user;
  if a.user_id is null then
    raise exception 'Pedido de acesso não encontrado';
  end if;
  if a.owner_id <> auth.uid() then
    raise exception 'Somente o administrador do canal decide acessos';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio acesso';
  end if;
  if p_status = 'pendente' then
    raise exception 'Status inválido';
  end if;

  update pc_acessos
  set status = p_status, decidido_por = auth.uid(), decidido_em = now(), updated_at = now()
  where user_id = p_user;

  if p_status = 'liberado' then
    if a.parceira_id is null then
      perform pc_garantir_parceira_pf(p_user);
    end if;
    if a.corretor_id is null then
      perform pc_vincular_corretor(p_user);
    end if;
  end if;
end;
$$;

create or replace function pc_registrar_cliente(
  p_nome text,
  p_telefone text,
  p_empreendimento uuid,
  p_perfil text default null,
  p_cpf_hash text default null,
  p_cpf_final text default null,
  p_email text default null,
  p_cidade text default null,
  p_uf text default null,
  p_renda numeric default null,
  p_possui_imovel boolean default null,
  p_observacoes text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
  k pc_kits;
  cfg pc_config;
  v_restritos text[];
  v_conflito uuid;
  v_alerta text := '';
  v_enq text;
  v_regra pc_regras_enquadramento;
  v_limite numeric;
  v_status pc_status_registro;
  v_validade int;
  v_agora timestamptz := now();
  v_id uuid;
  v_ate timestamptz;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    raise exception 'Acesso não liberado';
  end if;
  if nullif(trim(coalesce(p_nome, '')), '') is null then
    raise exception 'Informe o nome do cliente';
  end if;
  if length(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Informe o WhatsApp do cliente com DDD';
  end if;

  select * into k from pc_kits where empreendimento_id = p_empreendimento and publicado and owner_id = a.owner_id;
  if k.id is null then
    raise exception 'Projeto indisponível';
  end if;

  if a.parceira_id is null then
    perform pc_garantir_parceira_pf(a.user_id);
  end if;
  if a.corretor_id is null then
    perform pc_vincular_corretor(a.user_id);
  end if;
  select * into a from pc_acessos where user_id = a.user_id;
  if a.corretor_id is null or a.parceira_id is null then
    raise exception 'Seu cadastro de corretor não foi encontrado. Fale com a coordenação';
  end if;

  v_restritos := array(select t from unnest(coalesce(k.tags, '{}')) t where t in ('HIS-1', 'HIS-2', 'HMP'));
  if array_length(v_restritos, 1) > 0 and (p_renda is null or p_possui_imovel is null) then
    raise exception 'Este projeto tem regra de renda: informe a renda e se o cliente já possui imóvel';
  end if;

  select * into cfg from pc_config where owner_id = a.owner_id;
  v_validade := coalesce(cfg.validade_registro_dias, 90);
  v_ate := v_agora + make_interval(days => v_validade);

  v_conflito := pc_checar_conflito(a.owner_id, p_telefone, p_cpf_hash, p_empreendimento, null);

  if v_conflito is null then
    foreach v_enq in array coalesce(v_restritos, '{}') loop
      select * into v_regra from pc_regras_enquadramento
      where owner_id = a.owner_id and enquadramento = v_enq::pc_enquadramento
      order by vigente_desde desc nulls last limit 1;
      if v_regra.id is null then
        continue;
      end if;
      v_limite := coalesce(
        v_regra.renda_familiar_max,
        case when v_regra.renda_em_salarios_minimos is not null and cfg.salario_minimo_vigente is not null
             then v_regra.renda_em_salarios_minimos * cfg.salario_minimo_vigente end
      );
      if p_renda is not null and v_limite is not null and p_renda > v_limite then
        v_alerta := v_alerta || v_enq || ': renda declarada acima do limite (' || coalesce(v_regra.texto_orientacao, 'confirmar com a incorporadora') || '). ';
      end if;
      if v_regra.veda_proprietario_de_imovel and p_possui_imovel is true then
        v_alerta := v_alerta || v_enq || ': o cliente declarou possuir imóvel, e a unidade veda proprietário (' || coalesce(v_regra.texto_orientacao, 'confirmar com a incorporadora') || '). ';
      end if;
    end loop;
  end if;

  v_status := case when v_conflito is not null then 'conflito' else 'pendente' end;

  insert into pc_registros_cliente (
    owner_id, parceira_id, corretor_id, empreendimento_id, cliente_nome, cliente_telefone, cliente_email,
    cliente_cpf_hash, cliente_cpf_final, cidade_origem, uf_origem, perfil, faixa_renda_declarada,
    possui_imovel_declarado, elegibilidade_alerta, status, registrado_em, valido_ate,
    conflito_com_registro_id, origem_registro, observacoes
  ) values (
    a.owner_id, a.parceira_id, a.corretor_id, p_empreendimento, trim(p_nome), trim(p_telefone), nullif(trim(coalesce(p_email, '')), ''),
    nullif(p_cpf_hash, ''), nullif(left(p_cpf_final, 3), ''), nullif(trim(coalesce(p_cidade, '')), ''),
    nullif(upper(left(trim(coalesce(p_uf, '')), 2)), ''),
    case when p_perfil in ('investidor', 'moradia', 'estudante', 'outro') then p_perfil::pc_perfil_cliente end,
    p_renda, p_possui_imovel, nullif(trim(v_alerta), ''), v_status, v_agora, v_ate,
    v_conflito, 'academia', nullif(trim(coalesce(p_observacoes, '')), '')
  ) returning id into v_id;

  insert into pc_registro_eventos (owner_id, registro_id, tipo, descricao, criado_por)
  values (a.owner_id, v_id, 'criado', 'Registro enviado pelo corretor na Academia.', 'sistema');
  if v_conflito is not null then
    insert into pc_registro_eventos (owner_id, registro_id, tipo, descricao, criado_por)
    values (a.owner_id, v_id, 'conflito', 'Em conflito com um registro vigente. A coordenação vai decidir.', 'sistema');
  end if;

  return jsonb_build_object('id', v_id, 'status', v_status, 'valido_ate', v_ate, 'alerta', nullif(trim(v_alerta), ''));
end;
$$;

-- Registros que o corretor pode ver: os dele, ou (gestor) os da imobiliária.
-- Nunca devolve anotações internas, comissão nem o registro conflitante.
create or replace function pc_meus_registros(p_escopo text default 'meus')
returns table (
  id uuid, cliente_nome text, cliente_telefone text, cliente_email text, cpf_final text,
  cidade_origem text, uf_origem text, perfil text, empreendimento_id uuid, projeto text,
  status pc_status_registro, registrado_em timestamptz, valido_ate timestamptz,
  protocolo text, alerta text, corretor_nome text, e_meu boolean
)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    raise exception 'Acesso não liberado';
  end if;
  if p_escopo = 'equipe' and not (a.papel = 'gestor' and a.parceira_id is not null) then
    raise exception 'Só o gestor vê os registros da equipe';
  end if;

  return query
  select r.id, r.cliente_nome, r.cliente_telefone, r.cliente_email, r.cliente_cpf_final::text,
         r.cidade_origem, r.uf_origem::text, r.perfil::text, r.empreendimento_id, coalesce(k.nome, e.nome),
         r.status, r.registrado_em, r.valido_ate, r.protocolo_incorporadora, r.elegibilidade_alerta,
         c.nome, (a.corretor_id is not null and r.corretor_id is not distinct from a.corretor_id)
  from pc_registros_cliente r
  left join pc_parceira_corretores c on c.id = r.corretor_id
  left join pc_kits k on k.empreendimento_id = r.empreendimento_id
  left join pc_empreendimentos e on e.id = r.empreendimento_id
  where r.owner_id = a.owner_id
    and (
      (p_escopo <> 'equipe' and a.corretor_id is not null and r.corretor_id = a.corretor_id)
      or (p_escopo = 'equipe' and r.parceira_id = a.parceira_id)
    )
  order by r.registrado_em desc;
end;
$$;

-- Linha do tempo de um registro visível para quem chama. Sem anotações ('nota') e
-- sem o texto que a coordenação escreve ao decidir (só o texto automático do sistema).
create or replace function pc_eventos_do_registro(p_registro uuid)
returns table (tipo text, descricao text, criado_em timestamptz)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    raise exception 'Acesso não liberado';
  end if;
  if not exists (
    select 1 from pc_registros_cliente r
    where r.id = p_registro and r.owner_id = a.owner_id
      and ((a.corretor_id is not null and r.corretor_id = a.corretor_id)
        or (a.papel = 'gestor' and a.parceira_id is not null and r.parceira_id = a.parceira_id))
  ) then
    raise exception 'Registro não encontrado';
  end if;

  return query
  select e.tipo, case when e.criado_por = 'marcos' then null else e.descricao end, e.created_at
  from pc_registro_eventos e
  where e.registro_id = p_registro and e.tipo <> 'nota'
  order by e.created_at;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Mudança de situação vira atividade do corretor
-- ---------------------------------------------------------------------

create or replace function pc_registro_vira_atividade()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_tipo text;
begin
  begin
    if new.corretor_id is null then
      return new;
    end if;
    if tg_op = 'INSERT' then
      v_tipo := 'registro_criado';
    elsif new.status is distinct from old.status then
      v_tipo := 'registro_' || new.status::text;
    else
      return new;
    end if;
    select user_id into v_user from pc_acessos where corretor_id = new.corretor_id and status = 'liberado' limit 1;
    if v_user is not null then
      perform pc_log_atividade(v_user, v_tipo, new.empreendimento_id, new.cliente_nome);
    end if;
  exception when others then
    raise warning 'pc_registro_vira_atividade falhou: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists pc_registros_cliente_atividade on pc_registros_cliente;
create trigger pc_registros_cliente_atividade
  after insert or update of status on pc_registros_cliente
  for each row execute function pc_registro_vira_atividade();

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------

revoke all on function pc_meu_acesso() from public, anon, authenticated;
revoke all on function pc_solicitar_acesso(text, text, text, pc_papel_canal, uuid, text) from public, anon, authenticated;
revoke all on function pc_decidir_acesso(uuid, pc_status_acesso) from public, anon, authenticated;
revoke all on function pc_garantir_parceira_pf(uuid) from public, anon, authenticated;
revoke all on function pc_registrar_cliente(text, text, uuid, text, text, text, text, text, text, numeric, boolean, text) from public, anon, authenticated;
revoke all on function pc_meus_registros(text) from public, anon, authenticated;
revoke all on function pc_eventos_do_registro(uuid) from public, anon, authenticated;
revoke all on function pc_registro_vira_atividade() from public, anon, authenticated;

grant execute on function pc_meu_acesso() to authenticated;
grant execute on function pc_solicitar_acesso(text, text, text, pc_papel_canal, uuid, text) to authenticated;
grant execute on function pc_decidir_acesso(uuid, pc_status_acesso) to authenticated;
grant execute on function pc_registrar_cliente(text, text, uuid, text, text, text, text, text, text, numeric, boolean, text) to authenticated;
grant execute on function pc_meus_registros(text) to authenticated;
grant execute on function pc_eventos_do_registro(uuid) to authenticated;

commit;

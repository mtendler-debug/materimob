-- Academia de Vendas, Fase A0.1: acesso do corretor parceiro.
-- Ver academia-import/ACADEMIA-INTEGRACAO.md.
--
-- Até aqui todo pc_* é "owner_id = Marcos" e ninguém mais lê nada. Esta
-- migração cria o jeito de um corretor de imobiliária parceira ter login
-- próprio, sem mexer em profiles.account_type (o corretor parceiro continua
-- sendo um corretor; a parceria é um chapéu, como as organizações).
--
-- Nada aqui altera dado existente. Tabelas pc_* já existentes só ganham
-- uma coluna (ativa_na_academia). Escrita em pc_acessos passa só pelas
-- funções abaixo: o corretor nunca consegue mudar o próprio status.

begin;

create type pc_papel_canal as enum ('corretor', 'gestor');
create type pc_status_acesso as enum ('pendente', 'liberado', 'recusado', 'bloqueado');

-- Critério explícito de "ativa na Academia", separado do funil: liberar a
-- Academia para uma imobiliária não é declarar parceria firmada.
alter table pc_parceiras add column ativa_na_academia boolean not null default false;

create table pc_acessos (
  user_id               uuid primary key references auth.users on delete cascade,
  owner_id              uuid not null references auth.users,
  parceira_id           uuid references pc_parceiras(id) on delete set null,
  corretor_id           uuid references pc_parceira_corretores(id) on delete set null,
  papel                 pc_papel_canal not null default 'corretor',
  status                pc_status_acesso not null default 'pendente',
  nome                  text not null,
  whatsapp              text,
  creci                 text,
  email                 text,
  -- o que a pessoa digitou em "minha imobiliária não está na lista"
  imobiliaria_informada text,
  ultimo_acesso         timestamptz,
  decidido_por          uuid references auth.users,
  decidido_em           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index on pc_acessos (owner_id, status);
create index on pc_acessos (parceira_id);

-- ---------------------------------------------------------------------
-- Funções de apoio. security definer porque uma política de pc_acessos que
-- lesse pc_acessos reaplicaria a própria RLS (mesma razão de
-- shares_organization existir). Só devolvem dado de quem está logado.
-- ---------------------------------------------------------------------

create or replace function pc_tem_acesso()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from pc_acessos where user_id = auth.uid() and status = 'liberado');
$$;

create or replace function pc_canal_owner()
returns uuid language sql security definer stable set search_path = public as $$
  select owner_id from pc_acessos where user_id = auth.uid() and status = 'liberado';
$$;

create or replace function pc_minha_parceira()
returns uuid language sql security definer stable set search_path = public as $$
  select parceira_id from pc_acessos where user_id = auth.uid() and status = 'liberado';
$$;

create or replace function pc_meu_corretor()
returns uuid language sql security definer stable set search_path = public as $$
  select corretor_id from pc_acessos where user_id = auth.uid() and status = 'liberado';
$$;

create or replace function pc_meu_papel()
returns pc_papel_canal language sql security definer stable set search_path = public as $$
  select papel from pc_acessos where user_id = auth.uid() and status = 'liberado';
$$;

create or replace function pc_sou_gestor()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from pc_acessos
    where user_id = auth.uid() and status = 'liberado' and papel = 'gestor' and parceira_id is not null
  );
$$;

-- O dono do canal é o administrador da plataforma que tem a linha de
-- pc_config (hoje só o Marcos). Exige os dois porque pc_config, sozinha, é
-- forjável: a política dela deixa qualquer usuário criar a própria linha.
create or replace function pc_sou_dono_do_canal()
returns boolean language sql security definer stable set search_path = public as $$
  select is_platform_admin() and exists (select 1 from pc_config where owner_id = auth.uid());
$$;

-- Dono do canal para quem ainda não tem acesso (cadastro novo). Sai do
-- administrador da plataforma, nunca de "alguém que tem uma linha em
-- pc_config" nem de "alguém que criou uma parceira": as duas coisas qualquer
-- usuário consegue gravar para si. Interna.
create or replace function pc_dono_padrao()
returns uuid language sql security definer stable set search_path = public as $$
  select c.owner_id
  from pc_config c
  where exists (select 1 from platform_admins pa where pa.user_id = c.owner_id)
  order by c.owner_id
  limit 1;
$$;

-- "O outro usuário é da mesma imobiliária que a minha, e eu sou gestor".
create or replace function pc_mesma_equipe(p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select pc_sou_gestor() and exists (
    select 1 from pc_acessos a
    where a.user_id = p_user and a.parceira_id is not null and a.parceira_id = pc_minha_parceira()
  );
$$;

-- Liga o acesso ao cadastro de corretores da parceira (por e-mail ou
-- telefone) ou cria a linha. Interna: ninguém chama de fora.
create or replace function pc_vincular_corretor(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
  v_corr uuid;
  v_tel text;
begin
  select * into a from pc_acessos where user_id = p_user;
  if a.user_id is null or a.parceira_id is null then
    return null;
  end if;
  v_tel := nullif(regexp_replace(coalesce(a.whatsapp, ''), '\D', '', 'g'), '');
  select id into v_corr
  from pc_parceira_corretores
  where parceira_id = a.parceira_id
    and owner_id = a.owner_id
    and ((a.email is not null and lower(email) = lower(a.email))
      or (v_tel is not null and regexp_replace(coalesce(telefone, ''), '\D', '', 'g') = v_tel))
  limit 1;
  if v_corr is null then
    insert into pc_parceira_corretores (owner_id, parceira_id, nome, creci, telefone, email)
    values (a.owner_id, a.parceira_id, a.nome, a.creci, a.whatsapp, a.email)
    returning id into v_corr;
  end if;
  update pc_acessos set corretor_id = v_corr, updated_at = now() where user_id = p_user;
  return v_corr;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS de pc_acessos: dono vê tudo; cada um vê o próprio; gestor vê a equipe
-- da própria imobiliária.
--
-- NÃO existe política de INSERT, de propósito: o padrão "for all using
-- (auth.uid() = owner_id)" deixaria qualquer usuário criar a própria linha
-- com ele mesmo como dono, já 'liberada' e como gestor de qualquer
-- imobiliária. Linhas só nascem em pc_solicitar_acesso, que roda com
-- permissão do dono da função. O dono do canal altera e apaga.
-- ---------------------------------------------------------------------

alter table pc_acessos enable row level security;

create policy "Dono do canal vê pc_acessos" on pc_acessos
  for select using (auth.uid() = owner_id and pc_sou_dono_do_canal());

create policy "Dono do canal altera pc_acessos" on pc_acessos
  for update using (auth.uid() = owner_id and pc_sou_dono_do_canal())
  with check (auth.uid() = owner_id and pc_sou_dono_do_canal());

create policy "Dono do canal apaga pc_acessos" on pc_acessos
  for delete using (auth.uid() = owner_id and pc_sou_dono_do_canal());

create policy "Cada um vê o próprio acesso" on pc_acessos
  for select using (auth.uid() = user_id);

create policy "Gestor vê a equipe da própria imobiliária" on pc_acessos
  for select using (pc_sou_gestor() and parceira_id = pc_minha_parceira());

-- ---------------------------------------------------------------------
-- Funções para o app
-- ---------------------------------------------------------------------

-- Lista do cadastro ("escolha sua imobiliária"). Só as ativas na Academia.
create or replace function pc_parceiras_para_vinculo()
returns table (id uuid, nome_fantasia text, cidade text)
language sql security definer stable set search_path = public as $$
  select id, nome_fantasia, cidade
  from pc_parceiras
  where owner_id = pc_dono_padrao() and ativa_na_academia and validado
  order by nome_fantasia;
$$;

-- Situação de quem está logado (null = nunca pediu acesso).
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
  where a.user_id = auth.uid();
$$;

-- Pedido de acesso. Escolhendo uma imobiliária da lista, ou digitando um
-- nome (vira cadastro NÃO validado, igual ao autocadastro, e não aparece
-- nas listas normais até o Marcos revisar), ou nenhum dos dois (autônomo).
-- Liberar é sempre decisão do dono, em pc_decidir_acesso.
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

-- Liberar, recusar, bloquear ou liberar de novo. Só o dono. Liberar NÃO
-- promove a imobiliária no funil de parcerias: isso continua sendo decisão
-- do Marcos, na tela de Parcerias.
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

  if p_status = 'liberado' and a.corretor_id is null then
    perform pc_vincular_corretor(p_user);
  end if;
end;
$$;

create or replace function pc_editar_acesso(p_user uuid, p_papel pc_papel_canal, p_parceira_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = p_user;
  if a.user_id is null then
    raise exception 'Acesso não encontrado';
  end if;
  if a.owner_id <> auth.uid() then
    raise exception 'Somente o administrador do canal edita acessos';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio acesso';
  end if;
  if p_papel = 'gestor' and p_parceira_id is null then
    raise exception 'Para ser gestor, informe a imobiliária';
  end if;
  if p_parceira_id is not null
     and not exists (select 1 from pc_parceiras where id = p_parceira_id and owner_id = a.owner_id) then
    raise exception 'Imobiliária não encontrada';
  end if;

  update pc_acessos
  set papel = p_papel, parceira_id = p_parceira_id, corretor_id = null, updated_at = now()
  where user_id = p_user;

  if a.status = 'liberado' then
    perform pc_vincular_corretor(p_user);
  end if;
end;
$$;

-- "Último acesso": o app chama ao abrir. Quem não tem acesso liberado
-- (inclusive o Marcos) simplesmente não gera nada.
create or replace function pc_registrar_presenca()
returns void language sql security definer set search_path = public as $$
  update pc_acessos set ultimo_acesso = now()
  where user_id = auth.uid() and status = 'liberado';
$$;

-- ---------------------------------------------------------------------
-- Permissões de execução. O Supabase concede EXECUTE a anon e
-- authenticated por padrão em tudo que nasce em public; aqui só
-- authenticated chama, e a função interna não é chamável por ninguém.
-- ---------------------------------------------------------------------

revoke all on function pc_tem_acesso() from public, anon, authenticated;
revoke all on function pc_canal_owner() from public, anon, authenticated;
revoke all on function pc_minha_parceira() from public, anon, authenticated;
revoke all on function pc_meu_corretor() from public, anon, authenticated;
revoke all on function pc_meu_papel() from public, anon, authenticated;
revoke all on function pc_sou_gestor() from public, anon, authenticated;
revoke all on function pc_sou_dono_do_canal() from public, anon, authenticated;
revoke all on function pc_mesma_equipe(uuid) from public, anon, authenticated;
revoke all on function pc_vincular_corretor(uuid) from public, anon, authenticated;
revoke all on function pc_dono_padrao() from public, anon, authenticated;
revoke all on function pc_parceiras_para_vinculo() from public, anon, authenticated;
revoke all on function pc_meu_acesso() from public, anon, authenticated;
revoke all on function pc_solicitar_acesso(text, text, text, pc_papel_canal, uuid, text) from public, anon, authenticated;
revoke all on function pc_decidir_acesso(uuid, pc_status_acesso) from public, anon, authenticated;
revoke all on function pc_editar_acesso(uuid, pc_papel_canal, uuid) from public, anon, authenticated;
revoke all on function pc_registrar_presenca() from public, anon, authenticated;

grant execute on function pc_tem_acesso() to authenticated;
grant execute on function pc_canal_owner() to authenticated;
grant execute on function pc_minha_parceira() to authenticated;
grant execute on function pc_meu_corretor() to authenticated;
grant execute on function pc_meu_papel() to authenticated;
grant execute on function pc_sou_gestor() to authenticated;
grant execute on function pc_sou_dono_do_canal() to authenticated;
grant execute on function pc_mesma_equipe(uuid) to authenticated;
grant execute on function pc_parceiras_para_vinculo() to authenticated;
grant execute on function pc_meu_acesso() to authenticated;
grant execute on function pc_solicitar_acesso(text, text, text, pc_papel_canal, uuid, text) to authenticated;
grant execute on function pc_decidir_acesso(uuid, pc_status_acesso) to authenticated;
grant execute on function pc_editar_acesso(uuid, pc_papel_canal, uuid) to authenticated;
grant execute on function pc_registrar_presenca() to authenticated;

commit;

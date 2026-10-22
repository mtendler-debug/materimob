-- Módulos por usuário: Avaliador, CRM e Academia, com padrão da plataforma e exceção por pessoa.
-- Parcerias fica de fora (é o painel do dono do canal, preso a owner_id e a pc_sou_dono_do_canal()).
--
--  * Padrão da plataforma  -> platform_settings (chaves abaixo)
--  * Exceção por pessoa    -> user_modulos (Avaliador e CRM); a Academia usa o próprio pc_acessos.status
--  * Uma só checagem       -> tem_modulo('avaliador' | 'crm'); has_crm_access() passa a chamá-la
--  * Avaliador desligado só esconde e bloqueia as TELAS: os links públicos dos clientes (tokens) seguem abrindo.
--
-- Chaves de padrão (platform_settings.ativo):
--   avaliador_ligado_para_todos  (padrão true)
--   crm_liberado_para_todos      (já existe; true até a cobrança)
--   academia_aberta              (padrão false: o pedido continua dependendo de aprovação)
begin;

insert into platform_settings (chave, ativo) values
  ('avaliador_ligado_para_todos', true),
  ('academia_aberta', false)
on conflict (chave) do nothing;

create table if not exists user_modulos (
  user_id uuid not null references auth.users on delete cascade,
  modulo text not null check (modulo in ('avaliador', 'crm')),
  ativo boolean not null,
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users,
  primary key (user_id, modulo)
);
alter table user_modulos enable row level security;
revoke all on user_modulos from anon, authenticated;

create or replace function tem_modulo(p_modulo text)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select auth.uid() is not null and case p_modulo
    when 'avaliador' then coalesce(
      (select ativo from user_modulos where user_id = auth.uid() and modulo = 'avaliador'),
      (select ativo from platform_settings where chave = 'avaliador_ligado_para_todos'),
      true)
    when 'crm' then coalesce(
      (select ativo from user_modulos where user_id = auth.uid() and modulo = 'crm'),
      coalesce((select ativo from platform_settings where chave = 'crm_liberado_para_todos'), false)
        or coalesce((select crm_included from profiles where id = auth.uid()), false)
        or exists (
          select 1 from organization_members om
          join organizations o on o.id = om.organization_id
          where om.user_id = auth.uid() and o.crm_included = true))
    else false
  end;
$$;

create or replace function has_crm_access()
returns boolean
language sql security definer stable
set search_path = public
as $$ select tem_modulo('crm') $$;

create or replace function meus_modulos()
returns jsonb
language sql security definer stable
set search_path = public
as $$ select jsonb_build_object('avaliador', tem_modulo('avaliador'), 'crm', tem_modulo('crm')) $$;

-- ---------------------------------------------------------------- administração
create or replace function admin_modulos_padrao()
returns jsonb
language plpgsql security definer stable
set search_path = public
as $$
begin
  if not is_platform_admin() then raise exception 'acesso restrito ao time da plataforma'; end if;
  return (select coalesce(jsonb_object_agg(chave, ativo), '{}'::jsonb) from platform_settings
          where chave in ('avaliador_ligado_para_todos', 'crm_liberado_para_todos', 'academia_aberta'));
end $$;

create or replace function admin_definir_padrao(p_chave text, p_ativo boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then raise exception 'acesso restrito ao time da plataforma'; end if;
  if p_chave not in ('avaliador_ligado_para_todos', 'crm_liberado_para_todos', 'academia_aberta') then
    raise exception 'Módulo desconhecido';
  end if;
  insert into platform_settings (chave, ativo, atualizado_em) values (p_chave, coalesce(p_ativo, false), now())
  on conflict (chave) do update set ativo = excluded.ativo, atualizado_em = now();
end $$;

create or replace function admin_modulos_lista()
returns table (user_id uuid, email text, nome text, tipo text, e_admin boolean,
               avaliador boolean, crm boolean, academia text, imobiliaria text)
language plpgsql security definer stable
set search_path = public
as $$
#variable_conflict use_column
begin
  if not is_platform_admin() then raise exception 'acesso restrito ao time da plataforma'; end if;
  return query
  select u.id, u.email::text, coalesce(a.nome, p.full_name),
         coalesce(p.account_type, 'corretor')::text,
         exists (select 1 from platform_admins pa where pa.user_id = u.id),
         (select m.ativo from user_modulos m where m.user_id = u.id and m.modulo = 'avaliador'),
         (select m.ativo from user_modulos m where m.user_id = u.id and m.modulo = 'crm'),
         a.status::text,
         pp.nome_fantasia::text
  from auth.users u
  left join profiles p on p.id = u.id
  left join pc_acessos a on a.user_id = u.id
  left join pc_parceiras pp on pp.id = a.parceira_id
  order by u.created_at desc;
end $$;

-- p_valor: true liga, false desliga, null volta ao padrão (Avaliador e CRM).
-- Academia: true libera o pedido, false bloqueia; é preciso que a pessoa já tenha pedido acesso.
create or replace function admin_definir_modulo(p_user uuid, p_modulo text, p_valor boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then raise exception 'acesso restrito ao time da plataforma'; end if;
  if p_modulo in ('avaliador', 'crm') then
    if p_valor is false and p_user = auth.uid() then
      raise exception 'Você não pode desligar um módulo para a própria conta por aqui';
    end if;
    if p_valor is null then
      delete from user_modulos where user_id = p_user and modulo = p_modulo;
    else
      insert into user_modulos (user_id, modulo, ativo, atualizado_em, atualizado_por)
      values (p_user, p_modulo, p_valor, now(), auth.uid())
      on conflict (user_id, modulo) do update
        set ativo = excluded.ativo, atualizado_em = now(), atualizado_por = auth.uid();
    end if;
  elsif p_modulo = 'academia' then
    if p_valor is null then raise exception 'Escolha liberar ou bloquear'; end if;
    if not exists (select 1 from pc_acessos where user_id = p_user) then
      raise exception 'Essa pessoa ainda não pediu acesso à Academia';
    end if;
    perform pc_decidir_acesso(p_user, case when p_valor then 'liberado'::pc_status_acesso else 'bloqueado'::pc_status_acesso end);
  else
    raise exception 'Módulo desconhecido';
  end if;
end $$;

-- ---------------------------------------------------------------- Academia aberta
-- Igual à função em produção, mais um trecho no fim: com academia_aberta ligada,
-- o pedido já nasce liberado (e a pessoa recebe a imobiliária pessoa física e o vínculo de corretor,
-- como acontece quando o dono libera na mão).
create or replace function pc_solicitar_acesso(
  p_nome text, p_whatsapp text, p_creci text, p_papel pc_papel_canal,
  p_parceira_id uuid default null, p_imobiliaria_informada text default null)
returns pc_status_acesso
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_parceira uuid := p_parceira_id;
  v_nome_imob text := nullif(trim(coalesce(p_imobiliaria_informada, '')), '');
  v_email text;
  v_aberta boolean;
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

  select coalesce((select ativo from platform_settings where chave = 'academia_aberta'), false) into v_aberta;
  if v_aberta then
    update pc_acessos set status = 'liberado', decidido_em = now(), updated_at = now() where user_id = auth.uid();
    if v_parceira is null then
      perform pc_garantir_parceira_pf(auth.uid());
    end if;
    perform pc_vincular_corretor(auth.uid());
    return 'liberado';
  end if;
  return 'pendente';
end;
$$;

revoke all on function tem_modulo(text), meus_modulos(), admin_modulos_padrao(), admin_definir_padrao(text, boolean),
  admin_modulos_lista(), admin_definir_modulo(uuid, text, boolean) from public, anon, authenticated;
grant execute on function tem_modulo(text), meus_modulos(), admin_modulos_padrao(), admin_definir_padrao(text, boolean),
  admin_modulos_lista(), admin_definir_modulo(uuid, text, boolean) to authenticated;

commit;

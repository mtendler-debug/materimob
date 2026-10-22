-- CRM liberado para todos os usuários logados, enquanto a cobrança não começa.
-- Um único interruptor (platform_settings.crm_liberado_para_todos). A regra de plano
-- (profiles.crm_included / organizations.crm_included) continua intacta por baixo:
-- para voltar a cobrar, é só desligar a chave:
--   update platform_settings set ativo = false, atualizado_em = now() where chave = 'crm_liberado_para_todos';
-- Atenção ao desligar: quem criou conta durante a liberação tem crm_included = false e perde o
-- acesso, a menos que se decida antes dar a eles o mesmo tratamento dos antigos
-- (update profiles set crm_included = true where ...).
begin;

create table if not exists platform_settings (
  chave text primary key,
  ativo boolean not null default false,
  atualizado_em timestamptz not null default now()
);
-- RLS ligado e sem política: só funções security definer e o dono do banco leem ou gravam.
alter table platform_settings enable row level security;
revoke all on platform_settings from anon, authenticated;

insert into platform_settings (chave, ativo) values ('crm_liberado_para_todos', true)
  on conflict (chave) do update set ativo = true, atualizado_em = now();

create or replace function has_crm_access()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select auth.uid() is not null and (
    coalesce((select ativo from platform_settings where chave = 'crm_liberado_para_todos'), false)
    or coalesce((select crm_included from profiles where id = auth.uid()), false)
    or exists (
      select 1 from organization_members om
      join organizations o on o.id = om.organization_id
      where om.user_id = auth.uid() and o.crm_included = true
    )
  );
$$;

commit;

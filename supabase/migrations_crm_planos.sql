-- CRM vira módulo pago por organização: a imobiliária/incorporadora
-- contrata (ou não) o CRM junto com a MaterImob; quem não tem o plano
-- perde a criação de lead/oportunidade nova, mas continua enxergando o
-- que já tinha (bloqueio suave). Assinatura pessoal via Stripe fica
-- para uma rodada futura — por enquanto o mesmo campo em profiles
-- serve tanto pro grandfathering abaixo quanto pra essa assinatura
-- individual quando ela existir.
--
-- Ninguém perde acesso agora: toda organização e todo corretor que já
-- existem no banco recebem crm_included = true explicitamente; o
-- default false vale só para quem for criado a partir daqui.
alter table organizations add column crm_included boolean not null default false;
update organizations set crm_included = true;

alter table profiles add column crm_included boolean not null default false;
update profiles set crm_included = true;

-- Checagem única de acesso — mesmo padrão de is_platform_admin()
-- (schema.sql:847). Nenhuma tela ou policy deve reimplementar essa
-- lógica na mão.
create or replace function has_crm_access()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select
    coalesce((select crm_included from profiles where id = auth.uid()), false)
    or exists (
      select 1 from organization_members om
      join organizations o on o.id = om.organization_id
      where om.user_id = auth.uid() and o.crm_included = true
    );
$$;

-- av_leads/av_opportunities tinham uma única policy "for all" — troca
-- por 4 policies pra travar só a criação de dado novo. Select/update/
-- delete continuam livres pro dono, mesmo sem o plano.
drop policy "Users manage own leads" on av_leads;
create policy "Users select own leads" on av_leads for select using (auth.uid() = user_id);
create policy "Users update own leads" on av_leads for update using (auth.uid() = user_id);
create policy "Users delete own leads" on av_leads for delete using (auth.uid() = user_id);
create policy "Users insert own leads with crm access" on av_leads
  for insert with check (auth.uid() = user_id and has_crm_access());

drop policy "Users manage own opportunities" on av_opportunities;
create policy "Users select own opportunities" on av_opportunities for select using (auth.uid() = user_id);
create policy "Users update own opportunities" on av_opportunities for update using (auth.uid() = user_id);
create policy "Users delete own opportunities" on av_opportunities for delete using (auth.uid() = user_id);
create policy "Users insert own opportunities with crm access" on av_opportunities
  for insert with check (auth.uid() = user_id and has_crm_access());

-- platform_organizations() precisa devolver crm_included pro Admin
-- mostrar/alternar — muda a lista de colunas do retorno, então exige
-- DROP + CREATE (REPLACE não recria a assinatura de saída).
drop function platform_organizations();
create function platform_organizations()
returns table (
  id uuid, name text, tipo text, status text, crm_included boolean, created_at timestamptz,
  membros bigint, lancamentos bigint, unidades bigint, imoveis bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'acesso restrito ao time da plataforma';
  end if;

  return query
  select
    o.id, o.name, o.tipo, o.status, o.crm_included, o.created_at,
    (select count(*) from organization_members m where m.organization_id = o.id),
    (select count(*) from av_launches l where l.organization_id = o.id),
    (select count(*) from av_launch_units u
       join av_launches l on l.id = u.launch_id
      where l.organization_id = o.id),
    (select count(*) from av_portfolio_properties p where p.organization_id = o.id)
  from organizations o
  order by o.created_at desc;
end;
$$;

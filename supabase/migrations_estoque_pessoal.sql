-- =====================================================================
-- MaterImob · migração "Estoque pessoal do corretor"
--
-- Fase 1 real: repensando o projeto pra ser simples e direto pro
-- corretor. av_portfolio_properties só podia pertencer a uma
-- organization_id — um corretor sozinho, sem organização, não tinha
-- onde cadastrar um imóvel próprio. Agora cada corretor pode ter o
-- próprio estoque, do jeito que era no Materimob original — mas
-- PRIVADO (só o dono vê), diferente do catálogo de lançamentos das
-- incorporadoras, que continua público de propósito.
--
-- Organizações continuam existindo e funcionando nos bastidores —
-- nada aqui apaga ou muda o caminho de quem já usa organização
-- (gerente+ continua gerenciando o estoque dela normalmente).
-- =====================================================================

alter table av_portfolio_properties
  alter column organization_id drop not null,
  add column user_id uuid references auth.users,
  add constraint um_dono_por_imovel
    check (num_nonnulls(organization_id, user_id) = 1);

drop policy "Authenticated users view portfolio" on av_portfolio_properties;
create policy "Dono ou organização visível vê o imóvel" on av_portfolio_properties
  for select to authenticated using (
    (organization_id is not null and org_visivel(organization_id))
    or user_id = auth.uid()
  );

drop policy "Gerente+ manages portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono cadastra" on av_portfolio_properties
  for insert with check (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

drop policy "Gerente+ updates portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono edita" on av_portfolio_properties
  for update using (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

drop policy "Gerente+ deletes portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono remove" on av_portfolio_properties
  for delete using (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

-- av_portfolio_units segue o mesmo dono do imóvel (organização OU
-- corretor), resolvido via subconsulta em av_portfolio_properties —
-- mesmo padrão que já existia só pra organização.

drop policy "Authenticated users view portfolio units" on av_portfolio_units;
create policy "Dono ou organização visível vê a unidade" on av_portfolio_units
  for select to authenticated using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_visivel(p.organization_id))
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ manages portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono cadastra unidade" on av_portfolio_units
  for insert with check (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ updates portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono edita unidade" on av_portfolio_units
  for update using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ deletes portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono remove unidade" on av_portfolio_units
  for delete using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );

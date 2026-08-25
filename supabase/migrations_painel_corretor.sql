-- Painel do corretor: "Meu desempenho". Mesmo padrão de
-- organization_team_dashboard/organization_launches_dashboard, mas sem
-- parâmetro de organização — tudo escopado direto em auth.uid(), porque
-- aqui é sempre o próprio corretor vendo o próprio dado, sem papel
-- gerente+ pra checar.
create or replace function my_performance_dashboard()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_roteiros', (select count(*) from av_selections where user_id = auth.uid()),
    'total_clientes', (select count(distinct client_id) from av_selections
      where client_id is not null and user_id = auth.uid()),
    'total_avaliacoes', (select count(*) from av_evaluations e join av_selections s on s.id = e.selection_id
      where s.user_id = auth.uid()),
    'nota_media', (select round(avg(e.overall_score)::numeric, 1) from av_evaluations e join av_selections s on s.id = e.selection_id
      where s.user_id = auth.uid() and e.overall_score is not null),
    'total_propostas', (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
      where s.user_id = auth.uid()),
    'propostas_interesse', (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
      where s.user_id = auth.uid() and pr.buy_intent),
    'ticket_medio_previsto', (select round(avg(pr.value)::numeric, 2) from av_proposals pr join av_selections s on s.id = pr.selection_id
      where s.user_id = auth.uid() and pr.buy_intent),
    'total_vendas', (
      select count(*) from (
        select 1 from av_launch_units where reserved_by = auth.uid() and status = 'vendida'
        union all
        select 1 from av_portfolio_units where reserved_by = auth.uid() and status = 'vendida'
      ) x
    ),
    'ticket_medio_vendas', (
      select round(avg(v)::numeric, 2) from (
        select table_value v from av_launch_units where reserved_by = auth.uid() and status = 'vendida'
        union all
        select table_value v from av_portfolio_units where reserved_by = auth.uid() and status = 'vendida'
      ) x
    ),
    'atividade_periodo', (
      select coalesce(jsonb_agg(t order by t.semana), '[]'::jsonb)
      from (
        select
          gs::date as semana,
          (select count(*) from av_selections s
            where s.user_id = auth.uid() and s.created_at >= gs and s.created_at < gs + interval '1 week') as total_roteiros
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') gs
      ) t
    ),
    'clientes', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          c.id,
          c.name,
          (select count(*) from av_selections s where s.client_id = c.id and s.user_id = auth.uid()) as total_roteiros,
          (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
            where s.client_id = c.id and s.user_id = auth.uid()) as total_propostas,
          (select round(avg(e.overall_score)::numeric, 1) from av_evaluations e join av_selections s on s.id = e.selection_id
            where s.client_id = c.id and s.user_id = auth.uid() and e.overall_score is not null) as nota_media,
          case
            when exists (
              select 1 from av_properties ap
              join av_selections s on s.id = ap.selection_id
              join av_units au on au.property_id = ap.id
              left join av_launch_units lu on lu.id = au.launch_unit_id
              left join av_portfolio_units pu on pu.id = au.portfolio_unit_id
              where s.client_id = c.id and s.user_id = auth.uid()
                and ((lu.status = 'vendida' and lu.reserved_by = auth.uid())
                     or (pu.status = 'vendida' and pu.reserved_by = auth.uid()))
            ) then 'fechado'
            when exists (select 1 from av_properties ap join av_selections s on s.id = ap.selection_id
              where s.client_id = c.id and s.user_id = auth.uid() and ap.stage = 'negociacao') then 'negociacao'
            when exists (select 1 from av_properties ap join av_selections s on s.id = ap.selection_id
              where s.client_id = c.id and s.user_id = auth.uid() and ap.stage = 'visitado') then 'visitado'
            when exists (select 1 from av_properties ap join av_selections s on s.id = ap.selection_id
              where s.client_id = c.id and s.user_id = auth.uid() and ap.stage = 'a-visitar') then 'a-visitar'
            else 'descartado'
          end as estagio
        from av_clients c
        where exists (select 1 from av_selections s where s.client_id = c.id and s.user_id = auth.uid())
      ) t
    ),
    'por_incorporadora', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          o.id as organization_id,
          o.name,
          (select count(*) from av_selections s join av_launches l on l.id = s.launch_id
            where l.organization_id = o.id and s.user_id = auth.uid()) as total_roteiros,
          (select count(*) from av_launch_units lu join av_launches l on l.id = lu.launch_id
            where l.organization_id = o.id and lu.status = 'vendida' and lu.reserved_by = auth.uid()) as total_vendas,
          (select round(avg(lu.table_value)::numeric, 2) from av_launch_units lu join av_launches l on l.id = lu.launch_id
            where l.organization_id = o.id and lu.status = 'vendida' and lu.reserved_by = auth.uid()) as ticket_medio_vendas
        from (
          select distinct l.organization_id
          from av_launches l
          join av_selections s on s.launch_id = l.id
          where s.user_id = auth.uid()
        ) incorps
        join organizations o on o.id = incorps.organization_id
      ) t
    ),
    'unidades_em_roteiro', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ap.id, 'name', ap.name, 'latitude', ap.latitude, 'longitude', ap.longitude
      )), '[]'::jsonb)
      from av_properties ap
      join av_selections s on s.id = ap.selection_id
      where s.user_id = auth.uid() and ap.latitude is not null and ap.longitude is not null
    ),
    'vendas_localizacao', (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', ap.id, 'name', ap.name, 'latitude', ap.latitude, 'longitude', ap.longitude
      )), '[]'::jsonb)
      from av_properties ap
      join av_selections s on s.id = ap.selection_id
      join av_units au on au.property_id = ap.id
      left join av_launch_units lu on lu.id = au.launch_unit_id
      left join av_portfolio_units pu on pu.id = au.portfolio_unit_id
      where s.user_id = auth.uid()
        and ap.latitude is not null and ap.longitude is not null
        and ((lu.status = 'vendida' and lu.reserved_by = auth.uid())
             or (pu.status = 'vendida' and pu.reserved_by = auth.uid()))
    )
  ) into result;

  return result;
end;
$$;

-- Mapas rodada 2: estoque, projetos e imóveis em roteiro da imobiliária,
-- e ecossistema (imobiliárias/corretores com roteiro) da incorporadora.
-- Estende as duas funções de dashboard já existentes com os campos de
-- coordenada que a rodada anterior deixou prontos em latitude/longitude.

create or replace function organization_launches_dashboard(p_org_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if org_role_rank(my_org_role(p_org_id)) < 3 then
    raise exception 'acesso restrito ao gerente ou diretor da organização';
  end if;

  select jsonb_build_object(
    'total_lancamentos', (select count(*) from av_launches where organization_id = p_org_id),
    'total_unidades', (
      select count(*) from av_launch_units lu
      join av_launches l on l.id = lu.launch_id
      where l.organization_id = p_org_id
    ),
    'unidades_por_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select lu.status, count(*) cnt
        from av_launch_units lu join av_launches l on l.id = lu.launch_id
        where l.organization_id = p_org_id
        group by lu.status
      ) s
    ),
    'total_roteiros', (
      select count(*) from av_selections s
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'total_corretores', (
      select count(distinct s.user_id) from av_selections s
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'total_avaliacoes', (
      select count(*) from av_evaluations e
      join av_selections s on s.id = e.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'nota_media', (
      select round(avg(e.overall_score)::numeric, 1)
      from av_evaluations e
      join av_selections s on s.id = e.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id and e.overall_score is not null
    ),
    'total_propostas', (
      select count(*) from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'propostas_interesse', (
      select count(*) from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id and pr.buy_intent
    ),
    'por_lancamento', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          l.id,
          l.name,
          l.status,
          (select count(*) from av_launch_units lu where lu.launch_id = l.id) as total_unidades,
          (select count(*) from av_launch_units lu where lu.launch_id = l.id and lu.status = 'disponivel') as disponiveis,
          (select count(*) from av_launch_units lu where lu.launch_id = l.id and lu.status = 'reservada') as reservadas,
          (select count(*) from av_launch_units lu where lu.launch_id = l.id and lu.status = 'vendida') as vendidas,
          (select count(*) from av_selections s where s.launch_id = l.id) as total_roteiros,
          (select count(distinct s.user_id) from av_selections s where s.launch_id = l.id) as total_corretores,
          (select count(*) from av_evaluations e join av_selections s on s.id = e.selection_id where s.launch_id = l.id) as total_avaliacoes,
          (select round(avg(e.overall_score)::numeric, 1) from av_evaluations e join av_selections s on s.id = e.selection_id
            where s.launch_id = l.id and e.overall_score is not null) as nota_media,
          (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id where s.launch_id = l.id) as total_propostas,
          (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
            where s.launch_id = l.id and pr.buy_intent) as propostas_interesse
        from av_launches l
        where l.organization_id = p_org_id
      ) t
    ),
    'por_parceiro', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          o.id as organization_id,
          o.name,
          o.latitude,
          o.longitude,
          (select count(*) from av_selections s
            join av_launches l on l.id = s.launch_id
            join organization_members om on om.user_id = s.user_id and om.organization_id = o.id
            where l.organization_id = p_org_id) as total_roteiros,
          (select count(distinct s.user_id) from av_selections s
            join av_launches l on l.id = s.launch_id
            join organization_members om on om.user_id = s.user_id and om.organization_id = o.id
            where l.organization_id = p_org_id) as total_corretores,
          (select count(*) from av_proposals pr
            join av_selections s on s.id = pr.selection_id
            join av_launches l on l.id = s.launch_id
            join organization_members om on om.user_id = s.user_id and om.organization_id = o.id
            where l.organization_id = p_org_id) as total_propostas,
          (select count(*) from av_proposals pr
            join av_selections s on s.id = pr.selection_id
            join av_launches l on l.id = s.launch_id
            join organization_members om on om.user_id = s.user_id and om.organization_id = o.id
            where l.organization_id = p_org_id and pr.buy_intent) as propostas_interesse
        from (
          select distinct lp.organization_id
          from av_launch_partners lp
          join av_launches l on l.id = lp.launch_id
          where l.organization_id = p_org_id
        ) parceiros
        join organizations o on o.id = parceiros.organization_id
      ) t
    ),
    'top_corretores', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          s.user_id,
          u.email,
          p.full_name,
          p.latitude,
          p.longitude,
          (select o.name from organization_members om join organizations o on o.id = om.organization_id
            where om.user_id = s.user_id limit 1) as org_name,
          count(*) as total_roteiros,
          (select count(*) from av_proposals pr join av_selections s2 on s2.id = pr.selection_id
            where s2.user_id = s.user_id and s2.launch_id in (select id from av_launches where organization_id = p_org_id)) as total_propostas,
          (select count(*) from av_proposals pr join av_selections s2 on s2.id = pr.selection_id
            where s2.user_id = s.user_id and pr.buy_intent
              and s2.launch_id in (select id from av_launches where organization_id = p_org_id)) as propostas_interesse
        from av_selections s
        join av_launches l on l.id = s.launch_id
        join auth.users u on u.id = s.user_id
        left join profiles p on p.id = s.user_id
        where l.organization_id = p_org_id
        group by s.user_id, u.email, p.full_name, p.latitude, p.longitude
        order by count(*) desc
        limit 15
      ) t
    )
  ) into result;

  return result;
end;
$$;

create or replace function organization_team_dashboard(p_org_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if org_role_rank(my_org_role(p_org_id)) < 3 then
    raise exception 'acesso restrito ao gerente ou diretor da organização';
  end if;

  select jsonb_build_object(
    'total_membros', (select count(*) from organization_members where organization_id = p_org_id),
    'total_roteiros', (select count(*) from av_selections
      where user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'total_clientes', (select count(distinct client_id) from av_selections
      where client_id is not null
        and user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'total_avaliacoes', (select count(*) from av_evaluations e join av_selections s on s.id = e.selection_id
      where s.user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'nota_media', (select round(avg(e.overall_score)::numeric, 1) from av_evaluations e join av_selections s on s.id = e.selection_id
      where e.overall_score is not null
        and s.user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'total_propostas', (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
      where s.user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'propostas_interesse', (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
      where pr.buy_intent
        and s.user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'ativos_30d', (select count(distinct user_id) from av_selections
      where created_at > now() - interval '30 days'
        and user_id in (select user_id from organization_members where organization_id = p_org_id)),
    'total_imoveis_portfolio', (select count(*) from av_portfolio_properties where organization_id = p_org_id),
    'por_corretor', (
      select coalesce(jsonb_agg(t order by t.total_roteiros desc), '[]'::jsonb)
      from (
        select
          m.user_id,
          u.email,
          p.full_name,
          m.role,
          (select count(*) from av_selections s where s.user_id = m.user_id) as total_roteiros,
          (select count(*) from av_evaluations e join av_selections s on s.id = e.selection_id
            where s.user_id = m.user_id) as total_avaliacoes,
          (select round(avg(e.overall_score)::numeric, 1) from av_evaluations e join av_selections s on s.id = e.selection_id
            where s.user_id = m.user_id and e.overall_score is not null) as nota_media,
          (select count(*) from av_proposals pr join av_selections s on s.id = pr.selection_id
            where s.user_id = m.user_id) as total_propostas,
          exists(select 1 from av_selections s where s.user_id = m.user_id
            and s.created_at > now() - interval '30 days') as ativo_30d
        from organization_members m
        join auth.users u on u.id = m.user_id
        left join profiles p on p.id = m.user_id
        where m.organization_id = p_org_id
      ) t
    ),
    'atividade_periodo', (
      select coalesce(jsonb_agg(t order by t.semana), '[]'::jsonb)
      from (
        select
          gs::date as semana,
          (select count(*) from av_selections s
            where s.user_id in (select user_id from organization_members where organization_id = p_org_id)
              and s.created_at >= gs and s.created_at < gs + interval '1 week') as total_roteiros
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') gs
      ) t
    ),
    'portfolio_performance', (
      select coalesce(jsonb_agg(t order by t.total_usos desc), '[]'::jsonb)
      from (
        select
          pp.id,
          pp.name,
          pp.latitude,
          pp.longitude,
          (select count(*) from av_properties ap where ap.source_portfolio_property_id = pp.id) as total_usos,
          (select count(distinct ap.user_id) from av_properties ap where ap.source_portfolio_property_id = pp.id) as total_corretores,
          (select count(*) from av_evaluations e join av_properties ap on ap.id = e.property_id
            where ap.source_portfolio_property_id = pp.id) as total_avaliacoes,
          (
            select round(avg(ev.overall_score)::numeric, 1)
            from av_properties ap
            join lateral (
              select e.overall_score
              from av_evaluations e
              where e.property_id = ap.id
                and e.overall_score is not null
                and (
                  e.unit_id is null
                  or not exists (select 1 from av_evaluations ge where ge.property_id = ap.id and ge.unit_id is null)
                )
            ) ev on true
            where ap.source_portfolio_property_id = pp.id
          ) as nota_media,
          (select count(*) from av_proposals pr join av_properties ap on ap.id = pr.property_id
            where ap.source_portfolio_property_id = pp.id) as total_propostas
        from av_portfolio_properties pp
        where pp.organization_id = p_org_id
      ) t
    ),
    'launches_em_roteiro', (
      select coalesce(jsonb_agg(distinct jsonb_build_object(
        'id', l.id, 'name', l.name, 'latitude', l.latitude, 'longitude', l.longitude
      )), '[]'::jsonb)
      from av_launches l
      join av_selections s on s.launch_id = l.id
      where s.user_id in (select user_id from organization_members where organization_id = p_org_id)
        and l.latitude is not null and l.longitude is not null
    ),
    'imoveis_em_roteiro', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', ap.id, 'name', ap.name, 'latitude', ap.latitude, 'longitude', ap.longitude
      )), '[]'::jsonb)
      from av_properties ap
      join av_selections s on s.id = ap.selection_id
      where s.user_id in (select user_id from organization_members where organization_id = p_org_id)
        and ap.latitude is not null and ap.longitude is not null
    )
  ) into result;

  return result;
end;
$$;

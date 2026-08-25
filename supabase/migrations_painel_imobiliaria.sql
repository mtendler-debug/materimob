-- Painel da imobiliária: desempenho do portfólio na plataforma inteira e
-- atividade da equipe ao longo do tempo. Estende
-- organization_team_dashboard, mesmo padrão de jsonb_agg(t order by ...)
-- a partir de tabela derivada com subqueries independentes já usado nas
-- rodadas anteriores.

-- Rastro de proveniência: a partir de agora, quando um corretor (de
-- qualquer organização) importa um imóvel do portfólio pra um roteiro,
-- av_properties guarda de qual av_portfolio_properties ele veio. Sem
-- isso não tem como medir "quais imóveis do portfólio são mais usados
-- na plataforma" — roteiros importados antes desta migração ficam sem
-- esse rastro (não dá pra recuperar retroativamente sem risco de casar
-- errado por nome).
alter table av_properties
  add column source_portfolio_property_id uuid references av_portfolio_properties(id) on delete set null;

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
          (select count(*) from av_properties ap where ap.source_portfolio_property_id = pp.id) as total_usos,
          (select count(distinct ap.user_id) from av_properties ap where ap.source_portfolio_property_id = pp.id) as total_corretores,
          (select count(*) from av_evaluations e join av_properties ap on ap.id = e.property_id
            where ap.source_portfolio_property_id = pp.id) as total_avaliacoes,
          (
            -- mesma regra de aggregate.js / aval-panel: avaliação geral
            -- tem prioridade sobre avaliação de unidade, por uso — evita
            -- enviesar a média quando o mesmo imóvel tem os dois tipos
            -- no mesmo roteiro.
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
    )
  ) into result;

  return result;
end;
$$;

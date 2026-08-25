-- Painel de desempenho da equipe pra organizações (hoje ligado só pra
-- imobiliária na UI, mas genérico — incorporadora pode ganhar o mesmo
-- bloco depois). Diferente de organization_launches_dashboard, que
-- sempre entra via av_launches.organization_id: aqui não existe esse
-- caminho (imobiliária não é dona de lançamento), então a associação é
-- via organization_members.user_id = av_selections.user_id — o único
-- jeito hoje de saber "quais roteiros são desta organização".
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
    )
  ) into result;

  return result;
end;
$$;

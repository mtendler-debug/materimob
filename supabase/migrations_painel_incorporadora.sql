-- Painel da incorporadora: comparação entre lançamentos e visão do
-- ecossistema (imobiliárias parceiras + corretores de fora que mais
-- geram roteiros). Estende organization_launches_dashboard, que hoje só
-- devolve totais somados de todos os lançamentos — mantém os campos
-- existentes, adiciona três arrays. Mesmo padrão de
-- organization_team_dashboard: jsonb_agg(t order by ...) a partir de uma
-- tabela derivada com subqueries independentes por linha, pra não
-- enviesar contagens por causa de fan-out num join um-pra-muitos.
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
        group by s.user_id, u.email, p.full_name
        order by count(*) desc
        limit 15
      ) t
    )
  ) into result;

  return result;
end;
$$;

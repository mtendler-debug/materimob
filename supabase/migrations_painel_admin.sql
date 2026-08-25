-- Painel do admin: corrige unidades_vendidas (só contava lançamento,
-- portfólio ficou de fora quando essa função foi escrita, antes da
-- rodada "vendas no portfólio"), acrescenta ticket médio/previsão
-- plataforma inteira, evolução no tempo e mapa de tudo publicado.
create or replace function platform_overview()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not is_platform_admin() then
    raise exception 'acesso restrito ao time da plataforma';
  end if;

  select jsonb_build_object(
    'contas',              (select count(*) from auth.users),
    'contas_por_tipo',     (select coalesce(jsonb_object_agg(account_type, n), '{}'::jsonb)
                              from (select account_type, count(*) n from profiles group by 1) t),
    'organizacoes',        (select count(*) from organizations),
    'organizacoes_ativas', (select count(*) from organizations where status = 'ativa'),
    'lancamentos',         (select count(*) from av_launches),
    'unidades',            (select count(*) from av_launch_units),
    'unidades_vendidas',   (
      select count(*) from (
        select 1 from av_launch_units where status = 'vendida'
        union all
        select 1 from av_portfolio_units where status = 'vendida'
      ) x
    ),
    'ticket_medio_vendas', (
      select round(avg(v)::numeric, 2) from (
        select table_value v from av_launch_units where status = 'vendida'
        union all
        select table_value v from av_portfolio_units where status = 'vendida'
      ) x
    ),
    'previsao_vendas',     (select coalesce(sum(value), 0) from av_proposals where buy_intent),
    'imoveis_portfolio',   (select count(*) from av_portfolio_properties),
    'clientes',            (select count(*) from av_clients),
    'roteiros',            (select count(*) from av_selections),
    'avaliacoes',          (select count(*) from av_evaluations),
    'propostas',           (select count(*) from av_proposals),
    'contas_30d',          (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'roteiros_30d',        (select count(*) from av_selections where created_at > now() - interval '30 days'),
    'avaliacoes_30d',      (select count(*) from av_evaluations where created_at > now() - interval '30 days'),
    'ativos_30d',          (select count(distinct user_id) from av_selections
                             where created_at > now() - interval '30 days'),
    'atividade_periodo', (
      select coalesce(jsonb_agg(t order by t.semana), '[]'::jsonb)
      from (
        select
          gs::date as semana,
          (select count(*) from av_selections s where s.created_at >= gs and s.created_at < gs + interval '1 week') as total_roteiros,
          (select count(*) from av_evaluations e where e.created_at >= gs and e.created_at < gs + interval '1 week') as total_avaliacoes
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') gs
      ) t
    ),
    'mapa', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', x.id, 'name', x.name, 'latitude', x.latitude, 'longitude', x.longitude, 'tipo', x.tipo
      )), '[]'::jsonb)
      from (
        select id, name, latitude, longitude, 'lancamento' as tipo from av_launches where latitude is not null and longitude is not null
        union all
        select id, name, latitude, longitude, 'portfolio' as tipo from av_portfolio_properties where latitude is not null and longitude is not null
      ) x
    )
  ) into result;

  return result;
end;
$$;

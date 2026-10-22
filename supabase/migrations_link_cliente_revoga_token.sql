-- Segunda parte de migrations_link_cliente_por_corretor.sql. Aplicar SÓ depois
-- que o frontend que lê av_client_relations.token estiver publicado — o antigo
-- pede av_clients.token e passaria a receber "permission denied".
--
-- O token compartilhado (av_clients.token) continua abrindo /cliente/<token>
-- para quem já recebeu o link, mas nenhum corretor consegue mais lê-lo.
-- Privilégio por coluna em vez de política: a RLS decide a linha, não a coluna.
begin;

do $$
declare v_cols text;
begin
  select string_agg(column_name, ',' order by column_name) into v_cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'av_clients';
  -- Coluna nova em av_clients precisa entrar no grant abaixo de propósito.
  if v_cols <> 'created_at,email,id,name,phone,token' then
    raise exception 'av_clients mudou (%); revise o grant antes de aplicar', v_cols;
  end if;
end $$;

revoke select on av_clients from anon, authenticated;
grant select (id, name, phone, email, created_at) on av_clients to authenticated;

commit;

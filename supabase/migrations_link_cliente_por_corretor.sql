-- Link permanente do cliente passa a ser por corretor (auditoria pré-lançamento,
-- 2026-10-21). Antes, o único link do cliente era av_clients.token: qualquer
-- corretor que criasse um atendimento com o telefone de um cliente alheio
-- passava a enxergar esse token e, pelo /cliente/<token>, os roteiros (e o
-- painel com propostas) de todos os outros corretores daquele cliente.
--
-- Agora cada par corretor+cliente (av_client_relations) tem o próprio token, e
-- cliente-painel mostra só os roteiros daquele corretor. O token antigo continua
-- funcionando como antes (decisão do Marcos: link já enviado não pode quebrar),
-- mas deixa de ser legível por corretores — isso fica na segunda migração,
-- migrations_link_cliente_revoga_token.sql, aplicada só depois que o frontend
-- novo estiver publicado (o antigo ainda lê av_clients.token).
begin;

alter table av_client_relations add column if not exists token text;

-- Token gerado sempre no banco e nunca trocado depois: se o corretor pudesse
-- escolher o próprio token (a política da tabela deixa ele gravar a própria
-- linha), poderia copiar o de um link antigo e "sequestrar" o que ele mostra.
create or replace function av_client_relations_token()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.token is not null then
    new.token := old.token;
  elsif tg_op = 'INSERT' or new.token is null then
    new.token := replace(gen_random_uuid()::text, '-', '');
  end if;
  return new;
end;
$$;

drop trigger if exists av_client_relations_token on av_client_relations;
create trigger av_client_relations_token
  before insert or update on av_client_relations
  for each row execute function av_client_relations_token();

-- Todo corretor que já atende um cliente (roteiro ou lead) ganha a própria
-- relação — até aqui a linha só nascia quando ele desativava o cliente.
insert into av_client_relations (user_id, client_id)
select user_id, client_id from av_selections where client_id is not null
union
select user_id, client_id from av_leads where client_id is not null
on conflict (user_id, client_id) do nothing;

update av_client_relations set token = null where token is null;

alter table av_client_relations alter column token set not null;
alter table av_client_relations add constraint av_client_relations_token_key unique (token);

-- Roteiro ou lead novo com cliente garante a relação (e portanto o link) na
-- hora, venha da tela, do agente de WhatsApp ou do MCP.
create or replace function av_garante_relacao_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.client_id is not null and new.user_id is not null then
    insert into av_client_relations (user_id, client_id)
    values (new.user_id, new.client_id)
    on conflict (user_id, client_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function av_garante_relacao_cliente() from public, anon, authenticated;

drop trigger if exists av_selections_garante_relacao on av_selections;
create trigger av_selections_garante_relacao
  after insert or update of client_id on av_selections
  for each row execute function av_garante_relacao_cliente();

drop trigger if exists av_leads_garante_relacao on av_leads;
create trigger av_leads_garante_relacao
  after insert or update of client_id on av_leads
  for each row execute function av_garante_relacao_cliente();

commit;

-- Sincroniza pc_registros_cliente com o Leadlinks (CRM de WhatsApp em
-- paralelo que o Marcos já usa) via gatilho de banco, não via código de
-- aplicação. Fica isolado de propósito: pc-registro-cliente (Edge
-- Function) já concentra toda a regra de negócio do registro (conflito,
-- elegibilidade, validade) e não deveria também carregar chamada
-- externa com dado de cliente. O gatilho garante o envio não importa
-- qual caminho gravou o registro (painel ou formulário público).
--
-- A chave da API do Leadlinks fica no Vault do Postgres (vault.secrets),
-- nunca em texto puro neste arquivo — foi gravada uma vez via
-- `select vault.create_secret(...)` direto no banco, fora de qualquer
-- arquivo versionado.
create extension if not exists pg_net with schema extensions;

create or replace function pc_sync_registro_leadlinks() returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_nome_parceira text;
  v_api_key text;
begin
  select nome_fantasia into v_nome_parceira from pc_parceiras where id = new.parceira_id;
  select decrypted_secret into v_api_key from vault.decrypted_secrets where name = 'leadlinks_api_key';

  if v_api_key is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://api.leadlinks.app/public/tracking/create-lead',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-api-key', v_api_key),
    body := jsonb_build_object(
      'integration_source', 'materimob-parcerias',
      'contact', jsonb_build_object(
        'name', new.cliente_nome,
        'phone', new.cliente_telefone,
        'email', new.cliente_email
      ),
      'company', jsonb_build_object('name', coalesce(v_nome_parceira, 'parceria MaterImob')),
      'deal', jsonb_build_object(
        'title', new.cliente_nome || ' — via ' || coalesce(v_nome_parceira, 'parceria MaterImob'),
        'custom_fields', jsonb_build_object(
          'origem_registro', new.origem_registro,
          'status_registro', new.status
        )
      ),
      'conversion', jsonb_build_object('type', 'parcerias')
    )
  );

  return new;
exception when others then
  -- Nunca deixa uma falha de sincronização derrubar o registro em si —
  -- mesmo racional do "best-effort" já usado nas outras integrações.
  raise warning 'pc_sync_registro_leadlinks falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists pc_registros_cliente_sync_leadlinks on pc_registros_cliente;
create trigger pc_registros_cliente_sync_leadlinks
  after insert on pc_registros_cliente
  for each row execute function pc_sync_registro_leadlinks();

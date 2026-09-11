-- Sincroniza pc_parceiras (o Kanban de parcerias) com o funil "Parcerias
-- Chaincorp" no Leadlinks (CRM de WhatsApp em paralelo que o Marcos já
-- usa). As 7 etapas desse funil no Leadlinks foram renomeadas pra bater
-- exatamente com STATUS_FUNIL_LABELS do MaterImob (ver Parceiras.jsx) —
-- uma única fonte de significado, sem tradução ambígua entre os dois
-- lados.
--
-- Diferente do gatilho de registros_cliente (que usa pg_net,
-- fire-and-forget), aqui a chamada é síncrona via a extensão `http`:
-- precisamos do deal_id de volta na hora, pra saber qual negociação
-- atualizar da próxima vez que o status mudar — pg_net não devolve a
-- resposta de forma síncrona, só via response assíncrona, o que exigiria
-- um segundo gatilho só pra capturar o retorno. Como isso roda em ações
-- explícitas do usuário (criar parceira, mudar status no Kanban/ficha,
-- que já esperam uma resposta do banco), um POST/PATCH de ~alguns
-- milissegundos é aceitável.
--
-- A chave da API do Leadlinks fica no Vault do Postgres, nunca em texto
-- puro neste arquivo.
create extension if not exists http with schema extensions;

alter table pc_parceiras add column if not exists leadlinks_deal_id text;

create or replace function pc_sync_parceira_leadlinks() returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_api_key text;
  v_stage_name text;
  v_resp extensions.http_response;
  v_body jsonb;
begin
  if not coalesce(new.validado, false) then
    return new;
  end if;

  select decrypted_secret into v_api_key from vault.decrypted_secrets where name = 'leadlinks_api_key';
  if v_api_key is null then
    return new;
  end if;

  v_stage_name := case new.status_funil
    when 'nao_contatado' then 'Não contatado'
    when 'contato_iniciado' then 'Contato iniciado'
    when 'reuniao_agendada' then 'Reunião agendada'
    when 'em_negociacao' then 'Em negociação'
    when 'parceria_firmada' then 'Parceria firmada'
    when 'sem_interesse' then 'Sem interesse'
    when 'pausado' then 'Pausado'
    else 'Não contatado'
  end;

  if new.leadlinks_deal_id is null then
    -- Ainda não existe negociação no Leadlinks pra essa parceira: cria.
    select * into v_resp from extensions.http((
      'POST',
      'https://api.leadlinks.app/public/tracking/create-lead',
      ARRAY[extensions.http_header('x-api-key', v_api_key)],
      'application/json',
      jsonb_build_object(
        'integration_source', 'materimob-parcerias-kanban',
        'contact', jsonb_build_object(
          'name', coalesce(new.responsavel_nome, new.nome_fantasia),
          'phone', new.responsavel_telefone
        ),
        'company', jsonb_build_object('name', new.nome_fantasia),
        'deal', jsonb_build_object(
          'title', new.nome_fantasia,
          'pipeline_id', '2cadf436-b961-4be1-a2c2-31493d102d8c',
          'stage_name', v_stage_name
        ),
        'conversion', jsonb_build_object('type', 'parcerias')
      )::text
    )::extensions.http_request);

    v_body := nullif(v_resp.content, '')::jsonb;
    if (v_body ->> 'success') = 'true' and v_body ? 'deal_id' then
      new.leadlinks_deal_id := v_body ->> 'deal_id';
    end if;

  elsif tg_op = 'UPDATE' then
    if new.status_funil is distinct from old.status_funil then
      perform extensions.http((
        'PATCH',
        'https://api.leadlinks.app/v1/deals/' || new.leadlinks_deal_id,
        ARRAY[extensions.http_header('x-api-key', v_api_key)],
        'application/json',
        jsonb_build_object('stage_name', v_stage_name)::text
      )::extensions.http_request);
    end if;
  end if;

  return new;
exception when others then
  -- Nunca deixa uma falha de sincronização derrubar a gravação da
  -- parceira em si — mesmo racional já usado nas outras integrações.
  raise warning 'pc_sync_parceira_leadlinks falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists pc_parceiras_sync_leadlinks on pc_parceiras;
create trigger pc_parceiras_sync_leadlinks
  before insert or update of status_funil, validado on pc_parceiras
  for each row execute function pc_sync_parceira_leadlinks();

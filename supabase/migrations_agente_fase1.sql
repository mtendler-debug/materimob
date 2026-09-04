-- Fase 1 do agente de WhatsApp ("Porteiro e eco").
-- Duas tabelas novas, só o que essa fase usa. imoveis/leads/visitas ficam
-- pra Fase 3/4, e aí reaproveitando av_properties/av_leads em vez de
-- duplicar — não entram aqui.
--
-- Segue a mesma convenção do resto do schema.sql: user_id referenciando
-- auth.users, RLS por auth.uid() = user_id. A função do webhook grava via
-- service_role (que ignora RLS) e passa o user_id do Marcos explicitamente,
-- já que não existe sessão autenticada num webhook do WhatsApp.

create table conversas_agente (
  telefone          text primary key,
  user_id           uuid references auth.users not null,
  agente_ativo      boolean default false,
  estado            text default 'inativo',
  pausa_ate         timestamptz,
  ultimo_humano_em  timestamptz,
  ultima_mensagem_em timestamptz,
  resumo            text,
  criado_em         timestamptz default now()
);

alter table conversas_agente enable row level security;

create policy "dono ve suas conversas" on conversas_agente
  for all using (auth.uid() = user_id);

create table mensagens (
  id            uuid primary key default gen_random_uuid(),
  telefone      text references conversas_agente(telefone) on delete cascade,
  user_id       uuid references auth.users not null,
  direcao       text not null check (direcao in ('cliente','agente','marcos_app')),
  wa_message_id text unique,
  tipo          text,
  conteudo      text,
  midia_url     text,
  criado_em     timestamptz default now()
);

alter table mensagens enable row level security;

create policy "dono ve suas mensagens" on mensagens
  for all using (auth.uid() = user_id);

create index mensagens_telefone_idx on mensagens (telefone, criado_em);

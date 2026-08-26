-- Núcleo do CRM: leads e oportunidades, ligados a av_clients (não
-- duplicando identidade de cliente) — ativa os dois vínculos que já
-- estavam reservados no schema desde o início (av_selections.lead_id
-- e o comentário em av_proposals sobre opportunity_id).

create table av_leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  client_id   uuid references av_clients(id) not null,
  source      text check (source in ('indicacao','portal','instagram','google','site_proprio','outro')),
  stage       text not null default 'lead' check (stage in ('lead','qualificacao','visita','proposta','fechamento')),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table av_leads enable row level security;
create policy "Users manage own leads" on av_leads for all using (auth.uid() = user_id);
create index on av_leads (client_id);

create table av_opportunities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  lead_id     uuid references av_leads(id) on delete cascade not null,
  type        text not null check (type in ('compra','venda','permuta')),
  property    text,
  value       numeric(15,2),
  stage       text not null default 'aberta' check (stage in ('aberta','negociacao','proposta','fechada','perdida')),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
alter table av_opportunities enable row level security;
create policy "Users manage own opportunities" on av_opportunities for all using (auth.uid() = user_id);
create index on av_opportunities (lead_id);

-- ativa o vínculo que já estava reservado desde a criação de av_selections
alter table av_selections
  add constraint av_selections_lead_id_fkey foreign key (lead_id) references av_leads(id) on delete set null;

-- mesma ideia do lado da proposta
alter table av_proposals add column opportunity_id uuid references av_opportunities(id) on delete set null;

-- av_clients hoje só é visível pra quem tem roteiro com aquele cliente —
-- precisa valer também por lead, senão o corretor não vê o próprio
-- contato recém-criado no CRM antes de ter algum roteiro.
drop policy "Corretor vê cliente ligado à própria seleção" on av_clients;
create policy "Corretor vê cliente ligado à própria seleção ou lead" on av_clients
  for select to authenticated using (
    exists (select 1 from av_selections s where s.client_id = av_clients.id and s.user_id = auth.uid())
    or exists (select 1 from av_leads l where l.client_id = av_clients.id and l.user_id = auth.uid())
  );

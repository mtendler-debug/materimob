-- Avaliador MaterImob — tabelas do módulo, todas com prefixo av_.
-- user_id tem DEFAULT auth.uid(): o app nunca precisa informá-lo ao gravar,
-- e a RLS abaixo garante que ninguém consegue gravar em nome de outro usuário.

create table av_selections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null default auth.uid(),
  lead_id       uuid,  -- opcional: só passa a ser usado quando o CRM existir (sem FK por enquanto)
  client_name   text not null,
  client_phone  text,
  client_email  text,
  title         text not null,
  subtitle      text,
  criteria      text[] not null default '{}',
  milestones    jsonb not null default '[]',
  token_form    text unique not null,
  token_panel   text unique not null,
  archived      boolean not null default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index on av_selections (lead_id);
create index on av_selections (token_form);
create index on av_selections (token_panel);

alter table av_selections enable row level security;

create policy "Users manage own selections" on av_selections
  for all using (auth.uid() = user_id);


create table av_properties (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null default auth.uid(),
  selection_id    uuid references av_selections(id) on delete cascade not null,
  name            text not null,
  color           text default '#5C5C5C',
  stage           text not null default 'a-visitar'
                    check (stage in ('a-visitar', 'visitado', 'negociacao', 'descartado')),
  address         text,
  summary         text,
  extra_criteria  text[] not null default '{}',
  questions       text[] not null default '{}',
  phases          jsonb not null default '[]',
  position        int default 0,
  created_at      timestamptz default now()
);

alter table av_properties enable row level security;

create policy "Users manage own properties" on av_properties
  for all using (auth.uid() = user_id);


create table av_units (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null default auth.uid(),
  property_id   uuid references av_properties(id) on delete cascade not null,
  name          text not null,
  table_value   numeric(15,2),
  position      int default 0,
  created_at    timestamptz default now()
);

alter table av_units enable row level security;

create policy "Users manage own units" on av_units
  for all using (auth.uid() = user_id);


create table av_evaluations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null default auth.uid(),
  selection_id    uuid references av_selections(id) on delete cascade not null,
  property_id     uuid references av_properties(id) on delete cascade not null,
  unit_id         uuid references av_units(id) on delete set null,
  evaluator_name  text not null,
  evaluator_role  text,
  scores          jsonb not null default '{}',
  overall_score   int check (overall_score is null or overall_score between 1 and 10),
  strengths       text,
  concerns        text,
  flagged         text[] not null default '{}',
  created_at      timestamptz default now()
);

create index on av_evaluations (selection_id);
create index on av_evaluations (property_id, unit_id);

alter table av_evaluations enable row level security;

create policy "Users manage own evaluations" on av_evaluations
  for all using (auth.uid() = user_id);


-- Sem opportunity_id por enquanto: essa coluna aponta para o CRM, que não
-- existe nesta fase. Entra junto com a costura proposta -> oportunidade.
create table av_proposals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null default auth.uid(),
  selection_id    uuid references av_selections(id) on delete cascade not null,
  property_id     uuid references av_properties(id) on delete cascade not null,
  unit_id         uuid references av_units(id) on delete set null,
  proposer_name   text not null,
  value           numeric(15,2) not null,
  table_value     numeric(15,2),  -- copiado no momento da proposta, nunca recalculado
  note            text,
  buy_intent      boolean not null default false,
  created_at      timestamptz default now()
);

alter table av_proposals enable row level security;

create policy "Users manage own proposals" on av_proposals
  for all using (auth.uid() = user_id);

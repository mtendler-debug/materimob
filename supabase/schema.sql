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


-- Modelos de critérios que o corretor monta e reaproveita entre seleções.
create table av_criteria_presets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  name        text not null,
  criteria    text[] not null default '{}',
  created_at  timestamptz default now()
);

alter table av_criteria_presets enable row level security;

create policy "Users manage own criteria presets" on av_criteria_presets
  for all using (auth.uid() = user_id);
-- Fundação multi-organização: imobiliária/incorporadora licencia para um
-- time inteiro, com papéis simples (não é árvore de reporte — cada papel
-- define o que a pessoa vê, sem linha de gestão individual).

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users not null default auth.uid(),
  created_at  timestamptz default now()
);

create table organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade not null,
  user_id          uuid references auth.users not null,
  role             text not null check (role in ('diretor','gerente','coordenador','corretor')),
  created_at       timestamptz default now(),
  unique (organization_id, user_id)
);

create table organization_invites (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade not null,
  email            text not null,
  role             text not null check (role in ('diretor','gerente','coordenador','corretor')),
  token            text unique not null,
  created_by       uuid references auth.users not null default auth.uid(),
  accepted_at      timestamptz,
  created_at       timestamptz default now()
);

-- Funções auxiliares (security definer: leem organization_members sem
-- reaplicar a RLS da própria tabela, evitando recursão nas políticas).
create or replace function my_org_role(org uuid)
returns text
language sql security definer stable
set search_path = public
as $$
  select role from organization_members
  where organization_id = org and user_id = auth.uid();
$$;

create or replace function org_role_rank(r text)
returns int
language sql immutable
as $$
  select case r
    when 'diretor' then 4
    when 'gerente' then 3
    when 'coordenador' then 2
    when 'corretor' then 1
    else 0
  end;
$$;

-- Ao criar uma organização, o criador entra automaticamente como diretor.
-- security definer: nesse instante ele ainda não é membro de nada, então
-- uma inserção comum esbarraria na própria RLS de organization_members.
create or replace function handle_new_organization()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'diretor');
  return new;
end;
$$;

create trigger on_organization_created
  after insert on organizations
  for each row execute function handle_new_organization();


alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invites enable row level security;

create policy "Members view their organizations" on organizations
  for select using (my_org_role(id) is not null);

create policy "Any authenticated user creates an organization" on organizations
  for insert with check (auth.uid() = created_by);

create policy "Diretor renames organization" on organizations
  for update using (org_role_rank(my_org_role(id)) >= 4);

create policy "Members view roster" on organization_members
  for select using (my_org_role(organization_id) is not null);

create policy "Gerente+ manages membership" on organization_members
  for update using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ removes membership" on organization_members
  for delete using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ views invites" on organization_invites
  for select using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ creates invites" on organization_invites
  for insert with check (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ deletes invites" on organization_invites
  for delete using (org_role_rank(my_org_role(organization_id)) >= 3);
-- Catálogo compartilhado da organização. O corretor copia um item daqui
-- para dentro de uma seleção (av_properties/av_units) — depois da cópia,
-- os dois são independentes, do mesmo jeito que valor de tabela já
-- funciona hoje (histórico não se reescreve).
create table av_portfolio_properties (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade not null,
  created_by       uuid references auth.users not null default auth.uid(),
  name             text not null,
  color            text default '#5C5C5C',
  address          text,
  summary          text,
  extra_criteria   text[] not null default '{}',
  questions        text[] not null default '{}',
  created_at       timestamptz default now()
);

create table av_portfolio_units (
  id                     uuid primary key default gen_random_uuid(),
  portfolio_property_id  uuid references av_portfolio_properties(id) on delete cascade not null,
  name                   text not null,
  table_value            numeric(15,2),
  created_at             timestamptz default now()
);

alter table av_portfolio_properties enable row level security;
alter table av_portfolio_units enable row level security;

create policy "Members view portfolio" on av_portfolio_properties
  for select using (my_org_role(organization_id) is not null);

create policy "Gerente+ manages portfolio" on av_portfolio_properties
  for insert with check (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ updates portfolio" on av_portfolio_properties
  for update using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ deletes portfolio" on av_portfolio_properties
  for delete using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Members view portfolio units" on av_portfolio_units
  for select using (
    my_org_role((select organization_id from av_portfolio_properties where id = portfolio_property_id)) is not null
  );

create policy "Gerente+ manages portfolio units" on av_portfolio_units
  for insert with check (
    org_role_rank(my_org_role((select organization_id from av_portfolio_properties where id = portfolio_property_id))) >= 3
  );

create policy "Gerente+ updates portfolio units" on av_portfolio_units
  for update using (
    org_role_rank(my_org_role((select organization_id from av_portfolio_properties where id = portfolio_property_id))) >= 3
  );

create policy "Gerente+ deletes portfolio units" on av_portfolio_units
  for delete using (
    org_role_rank(my_org_role((select organization_id from av_portfolio_properties where id = portfolio_property_id))) >= 3
  );



-- RPC que resolve e-mail dos membros de uma organização, restrito a quem
-- já é membro dela (checado dentro da própria função).
create or replace function organization_roster(org uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql security definer stable
set search_path = public
as $$
  select m.user_id, u.email, m.role, m.created_at
  from organization_members m
  join auth.users u on u.id = m.user_id
  where m.organization_id = org
    and my_org_role(org) is not null;
$$;

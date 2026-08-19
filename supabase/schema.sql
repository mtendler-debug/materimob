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
  -- imobiliária representa corretores e vende imóveis prontos/usados
  -- (portfólio); incorporadora é dona de empreendimentos e publica
  -- lançamentos (estoque de unidades pra reserva). Só incorporadora
  -- publica lançamento — ver política de av_launches mais abaixo.
  tipo        text not null check (tipo in ('imobiliaria', 'incorporadora')),
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

-- Nome e tipo da organização não são sensíveis (mesma lógica de
-- lançamentos e portfólio já serem visíveis pra plataforma inteira) — e
-- sem isso, o embed organizations(name) usado no portfólio/lançamentos
-- volta nulo pra quem não é membro, porque o PostgREST aplica a RLS da
-- tabela embutida também. Roster (organization_members, com e-mail de
-- quem é membro) continua restrito — é outra tabela, com RLS própria.
create policy "Authenticated users view organizations" on organizations
  for select to authenticated using (true);

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

-- Plataforma inteira vê o portfólio (não só quem já é membro da
-- organização dona) — assim um corretor autônomo, ou de outra
-- organização, consegue importar um imóvel do portfólio de uma
-- imobiliária no roteiro de visita de um cliente, do mesmo jeito que já
-- acontece com lançamentos. Escrita continua exclusiva do gerente+ da
-- organização dona.
create policy "Authenticated users view portfolio" on av_portfolio_properties
  for select to authenticated using (true);

create policy "Gerente+ manages portfolio" on av_portfolio_properties
  for insert with check (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ updates portfolio" on av_portfolio_properties
  for update using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ deletes portfolio" on av_portfolio_properties
  for delete using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Authenticated users view portfolio units" on av_portfolio_units
  for select to authenticated using (true);

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
-- Lançamentos: diferente do portfólio (privado da organização, cópia ao
-- usar), um lançamento é visível a qualquer corretor autenticado da
-- plataforma — é o ecossistema descrito pelo usuário: a incorporadora
-- publica, qualquer corretor acessa. Só a gestão (gerente/diretor da
-- incorporadora dona) cria, edita e confirma vendas.
create table av_launches (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) on delete cascade not null,
  created_by       uuid references auth.users not null default auth.uid(),
  name             text not null,
  color            text default '#5C5C5C',
  address          text,
  summary          text,
  criteria         text[] not null default '{}',
  extra_criteria   text[] not null default '{}',
  questions        text[] not null default '{}',
  milestones       jsonb not null default '[]',
  status           text not null default 'ativo' check (status in ('ativo','encerrado')),
  created_at       timestamptz default now()
);

-- Estoque vivo e compartilhado. status muda na hora para todo mundo que
-- estiver olhando o mesmo lançamento — é o que evita vender a mesma
-- unidade duas vezes num plantão com vários corretores.
create table av_launch_units (
  id            uuid primary key default gen_random_uuid(),
  launch_id     uuid references av_launches(id) on delete cascade not null,
  name          text not null,
  table_value   numeric(15,2),
  status        text not null default 'disponivel'
                  check (status in ('disponivel','reservada','vendida')),
  reserved_by   uuid references auth.users,
  reserved_for  text,
  position      int default 0,
  updated_at    timestamptz default now(),
  created_at    timestamptz default now()
);

alter table av_launches enable row level security;
alter table av_launch_units enable row level security;

create policy "Authenticated users view launches" on av_launches
  for select to authenticated using (true);

-- Só incorporadora publica lançamento — imobiliária representa
-- corretores e vende imóveis prontos/usados via portfólio, não é dona de
-- empreendimento.
create policy "Gerente+ de incorporadora cria lançamentos" on av_launches
  for insert to authenticated with check (
    org_role_rank(my_org_role(organization_id)) >= 3
    and (select tipo from organizations where id = organization_id) = 'incorporadora'
  );

create policy "Gerente+ updates launches" on av_launches
  for update to authenticated using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ deletes launches" on av_launches
  for delete to authenticated using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Authenticated users view launch units" on av_launch_units
  for select to authenticated using (true);

create policy "Gerente+ creates launch units" on av_launch_units
  for insert to authenticated with check (
    org_role_rank(my_org_role((select organization_id from av_launches where id = launch_id))) >= 3
  );

-- Update direto só para gestão (confirmar venda, desfazer reserva, editar
-- nome/valor). Reservar é feito pela função reserve_launch_unit(), não por
-- update direto — assim fica atômico e qualquer corretor pode reservar
-- sem precisar de uma política mais frouxa que abriria brecha para alterar
-- outros campos (ex.: valor de tabela) junto com a reserva.
create policy "Gerente+ updates launch units" on av_launch_units
  for update to authenticated using (
    org_role_rank(my_org_role((select organization_id from av_launches where id = launch_id))) >= 3
  );

create policy "Gerente+ deletes launch units" on av_launch_units
  for delete to authenticated using (
    org_role_rank(my_org_role((select organization_id from av_launches where id = launch_id))) >= 3
  );

-- Reserva atômica: qualquer corretor autenticado pode chamar, mas só some
-- se a unidade ainda estiver disponível no exato momento da chamada.
-- corretor_id vem explícito (não de auth.uid()) porque quem chama de
-- verdade é a Edge Function aval-proposal pelo cliente admin
-- (service_role) — ali nunca há sessão de usuário, então auth.uid()
-- sempre voltaria nulo. O default auth.uid() só serve para uma eventual
-- chamada autenticada direta. Importante: nunca ter duas versões desta
-- função com listas de parâmetros diferentes — como client_name e
-- corretor_id têm default, uma chamada só com unit_id/client_name fica
-- ambígua entre as duas e o Postgres recusa a chamada.
create or replace function reserve_launch_unit(unit_id uuid, client_name text default null, corretor_id uuid default auth.uid())
returns av_launch_units
language plpgsql security definer
set search_path = public
as $$
declare
  result av_launch_units;
begin
  update av_launch_units
  set status = 'reservada', reserved_by = corretor_id, reserved_for = client_name, updated_at = now()
  where id = unit_id and status = 'disponivel'
  returning * into result;

  if result.id is null then
    raise exception 'unidade indisponível';
  end if;

  return result;
end;
$$;


-- Liga uma seleção/imóvel a um lançamento, para reaproveitar toda a
-- máquina existente (avaliação, ranking, proposta, cronograma) na
-- experiência de plantão de vendas.
alter table av_selections add column launch_id uuid references av_launches(id) on delete set null;
alter table av_units add column launch_unit_id uuid references av_launch_units(id) on delete set null;
-- Painel 360º de um lançamento, só pra gerente+ da organização dona.
-- Devolve números já agregados — nunca linha crua de avaliação, proposta
-- ou seleção de outro corretor. Isso preserva a privacidade do
-- relacionamento de cada corretor com o cliente dele, mesmo quando vários
-- corretores de organizações concorrentes trabalham o mesmo lançamento.
create or replace function launch_dashboard(p_launch_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  result jsonb;
begin
  select organization_id into v_org_id from av_launches where id = p_launch_id;
  if v_org_id is null then
    raise exception 'lançamento não encontrado';
  end if;
  if org_role_rank(my_org_role(v_org_id)) < 3 then
    raise exception 'acesso restrito ao gerente ou diretor da organização dona do lançamento';
  end if;

  select jsonb_build_object(
    'total_roteiros', (select count(*) from av_selections where launch_id = p_launch_id),
    'total_corretores', (select count(distinct user_id) from av_selections where launch_id = p_launch_id),
    'funil', (
      select coalesce(jsonb_object_agg(stage, cnt), '{}'::jsonb)
      from (
        select p.stage, count(*) cnt
        from av_properties p
        join av_selections s on s.id = p.selection_id
        where s.launch_id = p_launch_id
        group by p.stage
      ) f
    ),
    'total_avaliacoes', (
      select count(*)
      from av_evaluations e
      join av_selections s on s.id = e.selection_id
      where s.launch_id = p_launch_id
    ),
    'nota_media', (
      select round(avg(e.overall_score)::numeric, 1)
      from av_evaluations e
      join av_selections s on s.id = e.selection_id
      where s.launch_id = p_launch_id and e.overall_score is not null
    ),
    'por_unidade', (
      select coalesce(jsonb_agg(u order by u.name), '[]'::jsonb)
      from (
        select
          lu.id as launch_unit_id,
          lu.name,
          lu.status,
          count(e.id) as avaliacoes,
          round(avg(e.overall_score)::numeric, 1) as nota_media
        from av_launch_units lu
        left join av_units au on au.launch_unit_id = lu.id
        left join av_evaluations e on e.unit_id = au.id
        where lu.launch_id = p_launch_id
        group by lu.id, lu.name, lu.status
      ) u
    ),
    'total_propostas', (
      select count(*)
      from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      where s.launch_id = p_launch_id
    ),
    'propostas_interesse', (
      select count(*)
      from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      where s.launch_id = p_launch_id and pr.buy_intent
    )
  ) into result;

  return result;
end;
$$;

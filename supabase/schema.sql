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
-- Identidade permanente do cliente, pela primeira vez no sistema — até
-- aqui o cliente era só um token por roteiro, sem nada que ligasse dois
-- roteiros da mesma pessoa. Não é conta (sem senha, sem login de
-- verdade): é uma chave de busca (telefone ou e-mail) com um token
-- próprio e durável, que funciona como link permanente — mesmo padrão de
-- segurança já usado em token_form/token_panel, só que no nível do
-- cliente em vez do roteiro.
create table av_clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  token       text unique not null,
  created_at  timestamptz default now()
);

create unique index av_clients_phone_idx on av_clients (phone) where phone is not null and phone <> '';
create unique index av_clients_email_idx on av_clients (email) where email is not null and email <> '';

alter table av_selections add column client_id uuid references av_clients(id);
create index on av_selections (client_id);

alter table av_clients enable row level security;

-- Sem select geral pra "authenticated": um corretor só vê o cliente se
-- ele tiver pelo menos um roteiro daquele corretor — não dá pra listar
-- telefone/e-mail de clientes de outros corretores só por estarem na
-- mesma tabela. O find_or_create abaixo (security definer) é quem faz o
-- casamento entre corretores por baixo dos panos, sem expor o contato de
-- ninguém a quem não deveria ver.
create policy "Corretor vê cliente ligado à própria seleção" on av_clients
  for select to authenticated using (
    exists (
      select 1 from av_selections s
      where s.client_id = av_clients.id and s.user_id = auth.uid()
    )
  );

-- Acha o cliente por telefone, senão por e-mail, senão cria um novo.
-- security definer: precisa enxergar clientes de OUTROS corretores pra
-- casar corretamente (ex.: dois corretores diferentes atendendo a mesma
-- pessoa), mas só devolve o id — nunca telefone, e-mail ou nome de
-- volta pra quem chamou, então não vaza contato de ninguém.
create or replace function find_or_create_client(p_name text, p_phone text, p_email text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_phone text := nullif(trim(p_phone), '');
  v_email text := nullif(trim(p_email), '');
begin
  if v_phone is not null then
    select id into v_id from av_clients where phone = v_phone;
  end if;
  if v_id is null and v_email is not null then
    select id into v_id from av_clients where email = v_email;
  end if;
  if v_id is null then
    v_token := array_to_string(
      array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', (random() * 61)::int + 1, 1)
            from generate_series(1, 22)),
      ''
    );
    insert into av_clients (name, phone, email, token)
    values (nullif(trim(p_name), ''), v_phone, v_email, v_token)
    returning id into v_id;
  end if;
  return v_id;
end;
$$;
-- Sinalização explícita: uma imobiliária marca que está trabalhando um
-- lançamento (em vez de inferir isso implicitamente de roteiros criados
-- por corretores individuais). Nome de organização não é dado sensível —
-- já é visível em toda a plataforma via lançamentos/portfólio — então
-- leitura é liberada geral; só quem é gerente+ da própria organização
-- decide marcar/desmarcar ELA MESMA (nunca outra organização).
create table av_launch_partners (
  id               uuid primary key default gen_random_uuid(),
  launch_id        uuid references av_launches(id) on delete cascade not null,
  organization_id  uuid references organizations(id) on delete cascade not null,
  created_by       uuid references auth.users not null default auth.uid(),
  created_at       timestamptz default now(),
  unique (launch_id, organization_id)
);

alter table av_launch_partners enable row level security;

create policy "Authenticated users view launch partners" on av_launch_partners
  for select to authenticated using (true);

create policy "Gerente+ marca a própria organização como parceira" on av_launch_partners
  for insert to authenticated with check (
    org_role_rank(my_org_role(organization_id)) >= 3
  );

create policy "Gerente+ desmarca a própria organização" on av_launch_partners
  for delete to authenticated using (
    org_role_rank(my_org_role(organization_id)) >= 3
  );
-- Mesmo espírito do launch_dashboard, mas somando TODOS os lançamentos de
-- uma organização — pra incorporadora ver o panorama geral, não só
-- lançamento por lançamento. Mesmo limite de privacidade: só números
-- agregados, nunca identidade de corretor ou dado de cliente.
create or replace function organization_launches_dashboard(p_org_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if org_role_rank(my_org_role(p_org_id)) < 3 then
    raise exception 'acesso restrito ao gerente ou diretor da organização';
  end if;

  select jsonb_build_object(
    'total_lancamentos', (select count(*) from av_launches where organization_id = p_org_id),
    'total_unidades', (
      select count(*) from av_launch_units lu
      join av_launches l on l.id = lu.launch_id
      where l.organization_id = p_org_id
    ),
    'unidades_por_status', (
      select coalesce(jsonb_object_agg(status, cnt), '{}'::jsonb)
      from (
        select lu.status, count(*) cnt
        from av_launch_units lu join av_launches l on l.id = lu.launch_id
        where l.organization_id = p_org_id
        group by lu.status
      ) s
    ),
    'total_roteiros', (
      select count(*) from av_selections s
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'total_corretores', (
      select count(distinct s.user_id) from av_selections s
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'total_avaliacoes', (
      select count(*) from av_evaluations e
      join av_selections s on s.id = e.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'nota_media', (
      select round(avg(e.overall_score)::numeric, 1)
      from av_evaluations e
      join av_selections s on s.id = e.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id and e.overall_score is not null
    ),
    'total_propostas', (
      select count(*) from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id
    ),
    'propostas_interesse', (
      select count(*) from av_proposals pr
      join av_selections s on s.id = pr.selection_id
      join av_launches l on l.id = s.launch_id
      where l.organization_id = p_org_id and pr.buy_intent
    ),
    'imobiliarias_parceiras', (
      select coalesce(jsonb_agg(distinct o.name), '[]'::jsonb)
      from av_launch_partners lp
      join av_launches l on l.id = lp.launch_id
      join organizations o on o.id = lp.organization_id
      where l.organization_id = p_org_id
    )
  ) into result;

  return result;
end;
$$;


-- =====================================================================
-- MaterImob · migração "Papéis e Administração"
--
-- Rode este arquivo INTEIRO uma única vez, no SQL Editor do Supabase
-- (projeto materimob-avaliador). Ele foi testado ponta a ponta em
-- PostgreSQL 16 antes de chegar aqui: 8 verificações, incluindo tentativa
-- de corretor se promover a administrador e de diretor reativar a própria
-- organização suspensa — as duas recusadas pelo banco.
--
-- Depois de rodar, execute o comando do PASSO 2 no final do arquivo para
-- criar o primeiro administrador da plataforma.
-- =====================================================================

-- =====================================================================
-- PAPÉIS EXPLÍCITOS E ADMINISTRAÇÃO DA PLATAFORMA
--
-- Até aqui o sistema não tinha papel nenhum: quem não pertencia a uma
-- organização não era "nada", e a tela de boas-vindas que perguntava
-- "como você atua no mercado?" não gravava a resposta em lugar algum.
-- Todo mundo via o mesmo menu.
--
-- A partir daqui existe account_type — a CASA da pessoa, ou seja, a tela
-- em que ela entra e o menu principal que ela recebe. Decisão importante:
-- account_type NÃO é uma parede. Pertencer a uma organização ACRESCENTA
-- áreas ao menu, nunca substitui a casa. Um diretor de imobiliária que
-- também atende cliente continua com uma conta só e uma carteira só —
-- que é a diretriz de continuidade da jornada do corretor: o corretor é
-- a entidade permanente, a organização é um chapéu que ele usa às vezes.
-- =====================================================================

create table profiles (
  id            uuid primary key references auth.users on delete cascade,
  full_name     text,
  account_type  text not null default 'corretor'
                  check (account_type in ('corretor','imobiliaria','incorporadora')),
  creci         text,
  phone         text,
  logo_url      text,
  brand_color   text default '#1C1C1C',
  onboarded_at  timestamptz,
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

-- Mesma razão de my_org_role existir: uma política que consulta
-- organization_members reaplicaria a RLS daquela tabela e entraria em
-- recursão. security definer resolve, e a função só devolve booleano —
-- não vaza linha nenhuma pra quem chama.
create or replace function shares_organization(other_user uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from organization_members meu
    join organization_members dele
      on dele.organization_id = meu.organization_id
    where meu.user_id = auth.uid() and dele.user_id = other_user
  );
$$;

create policy "Cada um gerencia o próprio perfil" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Colega de organização vê o perfil de quem é do mesmo time — é o que
-- permite o roster mostrar nome em vez de e-mail solto. Ninguém de fora
-- da organização enxerga telefone ou CRECI de ninguém.
create policy "Colegas de organização veem o perfil" on profiles
  for select using (shares_organization(id));

-- O perfil nasce junto com a conta. account_type vem do cadastro, mas
-- passa por um case explícito: o metadata é preenchido pelo navegador e,
-- se chegasse um valor fora da lista, o check da tabela derrubaria o
-- cadastro inteiro. Valor desconhecido vira 'corretor'.
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into profiles (id, full_name, account_type)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    case new.raw_user_meta_data->>'account_type'
      when 'imobiliaria'   then 'imobiliaria'
      when 'incorporadora' then 'incorporadora'
      else 'corretor'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Contas que já existiam ganham perfil. Quem já era diretor ou gerente de
-- uma organização recebe o account_type correspondente — é exatamente o
-- comportamento que o Entry.jsx já dava a essas pessoas (mandava gerente+
-- direto pra tela da organização), agora gravado em vez de inferido.
insert into profiles (id)
select id from auth.users
on conflict (id) do nothing;

update profiles p
set account_type = o.tipo
from organization_members m
join organizations o on o.id = m.organization_id
where m.user_id = p.id
  and m.role in ('diretor','gerente')
  and o.tipo in ('imobiliaria','incorporadora');


-- ---------------------------------------------------------------------
-- Time de administração da MaterImob
--
-- Tabela separada, e não uma coluna em profiles, de propósito: profiles é
-- editável pelo próprio dono. O dia em que alguém puder editar o próprio
-- perfil e virar administrador da plataforma é o dia em que o sistema
-- acabou. Aqui só quem já é administrador escreve, e o primeiro entra por
-- comando direto no banco:
--   insert into platform_admins (user_id)
--   select id from auth.users where email = 'mtendler@gmail.com';
-- ---------------------------------------------------------------------

create table platform_admins (
  user_id     uuid primary key references auth.users on delete cascade,
  created_by  uuid references auth.users,
  created_at  timestamptz default now()
);

alter table platform_admins enable row level security;

create or replace function is_platform_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

create policy "Admin da plataforma vê a própria equipe" on platform_admins
  for select using (is_platform_admin());

create policy "Admin da plataforma adiciona outro" on platform_admins
  for insert with check (is_platform_admin());

create policy "Admin da plataforma remove outro" on platform_admins
  for delete using (is_platform_admin());


-- ---------------------------------------------------------------------
-- Status da organização — o que dá poder real ao time MaterImob.
-- Organização suspensa some das buscas e não publica mais; nada é
-- apagado, e os membros dela continuam enxergando a própria casa.
-- ---------------------------------------------------------------------

alter table organizations
  add column status text not null default 'ativa'
    check (status in ('ativa','pendente','suspensa'));

drop policy "Authenticated users view organizations" on organizations;

create policy "Authenticated users view organizations" on organizations
  for select to authenticated using (
    status = 'ativa'
    or my_org_role(id) is not null
    or is_platform_admin()
  );

create policy "Admin da plataforma administra organizações" on organizations
  for update using (is_platform_admin()) with check (is_platform_admin());

-- A política acima não basta sozinha: "Diretor renames organization" já
-- dá update na própria organização, e a RLS do Postgres é por LINHA, não
-- por coluna. Sem este gatilho, o diretor de uma organização suspensa
-- daria um update em si mesmo e voltaria pra 'ativa' — a suspensão não
-- valeria nada. Quem muda status é só o time da plataforma.
create or replace function protege_status_organizacao()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and not is_platform_admin() then
    raise exception 'só o time da plataforma altera o status de uma organização';
  end if;
  return new;
end;
$$;

create trigger on_organization_status_change
  before update on organizations
  for each row execute function protege_status_organizacao();

-- Suspensão precisa valer também para o que a organização publicou,
-- senão o estoque continuaria aparecendo na busca de imóveis com a dona
-- escondida. As duas funções abaixo existem pelo mesmo motivo de
-- my_org_role: consultar organizations dentro de uma política reaplicaria
-- a RLS de organizations.
create or replace function org_visivel(org uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from organizations o
    where o.id = org
      and (o.status = 'ativa' or my_org_role(o.id) is not null or is_platform_admin())
  );
$$;

create or replace function lancamento_visivel(p_launch uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from av_launches l where l.id = p_launch and org_visivel(l.organization_id)
  );
$$;

create or replace function imovel_portfolio_visivel(p_property uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from av_portfolio_properties p
    where p.id = p_property and org_visivel(p.organization_id)
  );
$$;

drop policy "Authenticated users view portfolio" on av_portfolio_properties;
create policy "Authenticated users view portfolio" on av_portfolio_properties
  for select to authenticated using (org_visivel(organization_id));

drop policy "Authenticated users view portfolio units" on av_portfolio_units;
create policy "Authenticated users view portfolio units" on av_portfolio_units
  for select to authenticated using (imovel_portfolio_visivel(portfolio_property_id));

drop policy "Authenticated users view launches" on av_launches;
create policy "Authenticated users view launches" on av_launches
  for select to authenticated using (org_visivel(organization_id));

drop policy "Authenticated users view launch units" on av_launch_units;
create policy "Authenticated users view launch units" on av_launch_units
  for select to authenticated using (lancamento_visivel(launch_id));


-- ---------------------------------------------------------------------
-- Seleção do time — o papel da imobiliária, que até aqui não existia.
--
-- av_launch_partners só sinaliza "estamos trabalhando este lançamento" e
-- não chega a corretor nenhum. Isto aqui é a curadoria de verdade: a
-- imobiliária escolhe, de qualquer origem da plataforma, o que o time
-- dela deve estar oferecendo — e os corretores do time veem essa lista
-- em destaque na busca de imóveis.
--
-- Mecanismo puro, sem conteúdo embutido: o sistema não sugere categoria
-- nem critério nenhum, a imobiliária escolhe o que quiser e escreve a
-- observação que quiser.
-- ---------------------------------------------------------------------

create table av_team_picks (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid references organizations(id) on delete cascade not null,
  portfolio_property_id uuid references av_portfolio_properties(id) on delete cascade,
  launch_id             uuid references av_launches(id) on delete cascade,
  note                  text,
  position              int not null default 0,
  created_by            uuid references auth.users not null default auth.uid(),
  created_at            timestamptz default now(),
  -- Uma indicação aponta para um imóvel de portfólio OU para um
  -- lançamento, nunca para os dois nem para nenhum.
  constraint um_alvo_por_indicacao
    check (num_nonnulls(portfolio_property_id, launch_id) = 1)
);

create unique index av_team_picks_portfolio_uniq
  on av_team_picks (organization_id, portfolio_property_id)
  where portfolio_property_id is not null;

create unique index av_team_picks_launch_uniq
  on av_team_picks (organization_id, launch_id)
  where launch_id is not null;

alter table av_team_picks enable row level security;

create policy "Time vê a seleção da própria organização" on av_team_picks
  for select using (my_org_role(organization_id) is not null or is_platform_admin());

create policy "Gerente+ monta a seleção do time" on av_team_picks
  for insert with check (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ edita a seleção do time" on av_team_picks
  for update using (org_role_rank(my_org_role(organization_id)) >= 3);

create policy "Gerente+ remove da seleção do time" on av_team_picks
  for delete using (org_role_rank(my_org_role(organization_id)) >= 3);


-- ---------------------------------------------------------------------
-- Painéis do time MaterImob.
--
-- Estas funções são a ÚNICA exceção deliberada à regra de privacidade que
-- vale no resto do projeto (agregado sim, identidade não). O time que
-- opera a plataforma precisa saber quem se cadastrou e o que cada
-- organização publicou — sem isso não há como suportar nem comercializar
-- nada. O limite que continua valendo, inclusive aqui: nenhuma delas
-- devolve conteúdo de avaliação, comentário de cliente ou contato de
-- cliente final. Quem paga a conta é o corretor e a organização; o
-- cliente final nunca vira linha de relatório.
-- ---------------------------------------------------------------------

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
    'unidades_vendidas',   (select count(*) from av_launch_units where status = 'vendida'),
    'imoveis_portfolio',   (select count(*) from av_portfolio_properties),
    'clientes',            (select count(*) from av_clients),
    'roteiros',            (select count(*) from av_selections),
    'avaliacoes',          (select count(*) from av_evaluations),
    'propostas',           (select count(*) from av_proposals),
    'contas_30d',          (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'roteiros_30d',        (select count(*) from av_selections where created_at > now() - interval '30 days'),
    'avaliacoes_30d',      (select count(*) from av_evaluations where created_at > now() - interval '30 days'),
    'ativos_30d',          (select count(distinct user_id) from av_selections
                             where created_at > now() - interval '30 days')
  ) into result;

  return result;
end;
$$;

create or replace function platform_organizations()
returns table (
  id uuid, name text, tipo text, status text, created_at timestamptz,
  membros bigint, lancamentos bigint, unidades bigint, imoveis bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'acesso restrito ao time da plataforma';
  end if;

  return query
  select
    o.id, o.name, o.tipo, o.status, o.created_at,
    (select count(*) from organization_members m where m.organization_id = o.id),
    (select count(*) from av_launches l where l.organization_id = o.id),
    (select count(*) from av_launch_units u
       join av_launches l on l.id = u.launch_id
      where l.organization_id = o.id),
    (select count(*) from av_portfolio_properties p where p.organization_id = o.id)
  from organizations o
  order by o.created_at desc;
end;
$$;

create or replace function platform_accounts()
returns table (
  id uuid, email text, full_name text, account_type text,
  created_at timestamptz, last_sign_in_at timestamptz,
  organizacoes text, roteiros bigint, e_admin boolean
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not is_platform_admin() then
    raise exception 'acesso restrito ao time da plataforma';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.full_name,
    coalesce(p.account_type, 'corretor'),
    u.created_at,
    u.last_sign_in_at,
    (select string_agg(o.name || ' · ' || m.role, ', ')
       from organization_members m
       join organizations o on o.id = m.organization_id
      where m.user_id = u.id),
    (select count(*) from av_selections s where s.user_id = u.id),
    exists (select 1 from platform_admins a where a.user_id = u.id)
  from auth.users u
  left join profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;


-- =====================================================================
-- PASSO 2 — o primeiro administrador da plataforma.
-- Rode isto DEPOIS do bloco acima, trocando o e-mail se for o caso.
-- É o único caminho: pela aplicação ninguém vira administrador sozinho.
-- =====================================================================
-- insert into platform_admins (user_id)
-- select id from auth.users where email = 'mtendler@gmail.com';


-- Roster mostra o nome do perfil quando existir, e-mail só como reserva —
-- mesma diretriz do painel do cliente (nome, não e-mail cru).
drop function if exists organization_roster(uuid);
create function organization_roster(org uuid)
returns table (user_id uuid, email text, full_name text, role text, created_at timestamptz)
language sql security definer stable
set search_path = public
as $$
  select m.user_id, u.email, p.full_name, m.role, m.created_at
  from organization_members m
  join auth.users u on u.id = m.user_id
  left join profiles p on p.id = m.user_id
  where m.organization_id = org
    and my_org_role(org) is not null;
$$;


-- =====================================================================
-- MaterImob · migração "Estoque pessoal do corretor"
--
-- Fase 1 real: repensando o projeto pra ser simples e direto pro
-- corretor. av_portfolio_properties só podia pertencer a uma
-- organization_id — um corretor sozinho, sem organização, não tinha
-- onde cadastrar um imóvel próprio. Agora cada corretor pode ter o
-- próprio estoque, do jeito que era no Materimob original — mas
-- PRIVADO (só o dono vê), diferente do catálogo de lançamentos das
-- incorporadoras, que continua público de propósito.
--
-- Organizações continuam existindo e funcionando nos bastidores —
-- nada aqui apaga ou muda o caminho de quem já usa organização
-- (gerente+ continua gerenciando o estoque dela normalmente).
-- =====================================================================

alter table av_portfolio_properties
  alter column organization_id drop not null,
  add column user_id uuid references auth.users,
  add constraint um_dono_por_imovel
    check (num_nonnulls(organization_id, user_id) = 1);

drop policy "Authenticated users view portfolio" on av_portfolio_properties;
create policy "Dono ou organização visível vê o imóvel" on av_portfolio_properties
  for select to authenticated using (
    (organization_id is not null and org_visivel(organization_id))
    or user_id = auth.uid()
  );

drop policy "Gerente+ manages portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono cadastra" on av_portfolio_properties
  for insert with check (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

drop policy "Gerente+ updates portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono edita" on av_portfolio_properties
  for update using (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

drop policy "Gerente+ deletes portfolio" on av_portfolio_properties;
create policy "Gerente+ da organização ou dono remove" on av_portfolio_properties
  for delete using (
    (organization_id is not null and org_role_rank(my_org_role(organization_id)) >= 3)
    or user_id = auth.uid()
  );

-- av_portfolio_units segue o mesmo dono do imóvel (organização OU
-- corretor), resolvido via subconsulta em av_portfolio_properties —
-- mesmo padrão que já existia só pra organização.

drop policy "Authenticated users view portfolio units" on av_portfolio_units;
create policy "Dono ou organização visível vê a unidade" on av_portfolio_units
  for select to authenticated using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_visivel(p.organization_id))
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ manages portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono cadastra unidade" on av_portfolio_units
  for insert with check (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ updates portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono edita unidade" on av_portfolio_units
  for update using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );

drop policy "Gerente+ deletes portfolio units" on av_portfolio_units;
create policy "Gerente+ da organização ou dono remove unidade" on av_portfolio_units
  for delete using (
    exists (
      select 1 from av_portfolio_properties p
      where p.id = portfolio_property_id
        and ((p.organization_id is not null and org_role_rank(my_org_role(p.organization_id)) >= 3)
             or p.user_id = auth.uid())
    )
  );


-- =====================================================================
-- MaterImob · migração "Imóveis: fotos, planta e condições de pagamento"
--
-- Fotos, planta e condições de pagamento são do imóvel/empreendimento —
-- mesmo espírito de summary/address, que já são assim — não da unidade.
-- Mesmas três colunas nos três lugares onde um imóvel existe: a cópia
-- dentro da seleção do cliente (av_properties), o estoque do corretor
-- (av_portfolio_properties) e o lançamento de incorporadora (av_launches).
-- =====================================================================

alter table av_properties
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_portfolio_properties
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_launches
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

-- ---------------------------------------------------------------------
-- Bucket de Storage — leitura pública (o cliente final avalia sem estar
-- logado, via token público, e precisa ver as fotos mesmo assim).
-- Escrita fica restrita à própria pasta do usuário autenticado — quem
-- pode de fato anexar aquela URL a qual imóvel continua sendo decidido
-- pela RLS de av_properties/av_portfolio_properties/av_launches, que já
-- é robusta; o Storage não precisa reproduzir essa lógica de dono.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imoveis', 'imoveis', true, 8388608, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "Leitura pública das imagens de imóveis" on storage.objects
  for select using (bucket_id = 'imoveis');

create policy "Autenticado envia dentro da própria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'imoveis' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Autenticado remove da própria pasta" on storage.objects
  for delete to authenticated using (
    bucket_id = 'imoveis' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- Fotos e condições de pagamento também no nível da unidade — uma
-- unidade específica pode ter fotos próprias e uma condição diferente
-- da geral do empreendimento.
-- ---------------------------------------------------------------------

alter table av_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_portfolio_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_launch_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

-- ---------------------------------------------------------------------
-- Valor do condomínio e do IPTU — só do imóvel/empreendimento, mesmo
-- espírito de payment_terms.
-- ---------------------------------------------------------------------

alter table av_properties
  add column condo_value numeric,
  add column iptu_value numeric;

alter table av_portfolio_properties
  add column condo_value numeric,
  add column iptu_value numeric;

alter table av_launches
  add column condo_value numeric,
  add column iptu_value numeric;

-- ---------------------------------------------------------------------
-- Modelos de critérios "do sistema" — user_id null, visíveis a todo
-- corretor. Só quem já é dono edita/exclui o próprio; um modelo do
-- sistema só é criado/removido direto no banco.
-- ---------------------------------------------------------------------

alter table av_criteria_presets alter column user_id drop not null;

drop policy "Users manage own criteria presets" on av_criteria_presets;

create policy "Corretor vê seus modelos e os do sistema" on av_criteria_presets
  for select using (auth.uid() = user_id or user_id is null);

create policy "Corretor cria só os próprios modelos" on av_criteria_presets
  for insert with check (auth.uid() = user_id);

create policy "Corretor edita só os próprios modelos" on av_criteria_presets
  for update using (auth.uid() = user_id);

create policy "Corretor exclui só os próprios modelos" on av_criteria_presets
  for delete using (auth.uid() = user_id);

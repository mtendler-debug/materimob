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

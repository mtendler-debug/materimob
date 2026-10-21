-- =====================================================================
-- CHAINCORP HUB · Central de Parcerias
-- Script 1 de 2: estrutura, regras de acesso e funções
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode ser executado de novo sem perder dados.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Configuração geral
-- ---------------------------------------------------------------------
create table if not exists public.hub_config (
  chave text primary key,
  valor text
);

-- E-mails que entram já como Super Administrador (aprovados automaticamente)
create table if not exists public.hub_admins_iniciais (
  email text primary key
);

-- ---------------------------------------------------------------------
-- Imobiliárias (carteira de parceiras e prospects)
-- ---------------------------------------------------------------------
create table if not exists public.imobiliarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  razao_social text,
  cnpj text,
  creci_j text,
  endereco text,
  cidade text default 'Ribeirão Preto',
  email text,
  telefone text,
  responsavel text,
  contato text,
  corretores int,
  situacao text not null default 'prospect'
    check (situacao in ('prospect','em_negociacao','treinada','parceira','sem_interesse','inativa')),
  prioridade text check (prioridade in ('alta','media','baixa')),
  coordenador_id uuid,
  ultimo_contato date,
  notas text,
  ativa_no_hub boolean not null default false,
  criado_em timestamptz not null default now()
);
create unique index if not exists imobiliarias_nome_uk on public.imobiliarias (lower(nome));

-- ---------------------------------------------------------------------
-- Perfis de usuário (1:1 com auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  tipo text not null check (tipo in ('autonomo','vinculado','pj','interno')),
  papel text not null check (papel in ('admin','comercial','marketing','credito','gestor','corretor')),
  departamento text,
  cpf text,
  whatsapp text,
  creci text,
  uf text,
  imobiliaria_id uuid references public.imobiliarias(id) on delete set null,
  status text not null default 'PENDENTE_APROVACAO'
    check (status in ('PENDENTE_APROVACAO','ATIVO','REJEITADO')),
  aprovado_por uuid,
  aprovado_em timestamptz,
  criado_em timestamptz not null default now()
);

do $$ begin
  alter table public.imobiliarias
    add constraint imobiliarias_coordenador_fk foreign key (coordenador_id)
    references public.profiles(id) on delete set null;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Lançamentos, copies e visibilidade por imobiliária
-- ---------------------------------------------------------------------
create table if not exists public.lancamentos (
  id text primary key,
  nome text not null,
  local text,
  fase text,
  tags text[] not null default '{}',
  cor1 text not null default '#0B3D91',
  cor2 text not null default '#1A73E8',
  arte_feed_url text,
  arte_stories_url text,
  drive_url text,
  youtube_url text,
  ordem int not null default 100,
  ativo boolean not null default true,
  atualizado_em timestamptz not null default now()
);

create table if not exists public.copies (
  lancamento_id text not null references public.lancamentos(id) on delete cascade,
  tese text not null check (tese in ('investimento','moradia','escassez')),
  texto text not null,
  atualizado_em timestamptz not null default now(),
  primary key (lancamento_id, tese)
);

create table if not exists public.visibilidade (
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  lancamento_id text not null references public.lancamentos(id) on delete cascade,
  visivel boolean not null default true,
  primary key (imobiliaria_id, lancamento_id)
);

-- ---------------------------------------------------------------------
-- Disparos (links rastreáveis) e acessos
-- ---------------------------------------------------------------------
create table if not exists public.links (
  token text primary key,
  corretor_id uuid not null references public.profiles(id) on delete cascade,
  imobiliaria_id uuid references public.imobiliarias(id) on delete set null,
  lancamento_id text not null references public.lancamentos(id) on delete cascade,
  tese text,
  criado_em timestamptz not null default now()
);
create index if not exists links_corretor_idx on public.links (corretor_id);
create index if not exists links_imob_idx on public.links (imobiliaria_id);

create table if not exists public.acessos (
  id bigserial primary key,
  token text not null references public.links(token) on delete cascade,
  user_agent text,
  criado_em timestamptz not null default now()
);
create index if not exists acessos_token_idx on public.acessos (token);

-- ---------------------------------------------------------------------
-- Propostas (Ficha Cadastral Oficial) e histórico da esteira
-- ---------------------------------------------------------------------
create table if not exists public.propostas (
  id bigint generated by default as identity (start with 1001) primary key,
  proponente text not null,
  cpf text not null,
  celular text,
  renda numeric(14,2) not null,
  papel_compra text not null check (papel_compra in ('Adquirente','Co-adquirente','Fiador')),
  objetivo text not null check (objetivo in ('Investimento','Moradia','Filhos')),
  primeiro_imovel boolean not null,
  lancamento_id text not null references public.lancamentos(id),
  unidade text not null,
  valor_unidade numeric(14,2),
  documentos jsonb not null default '{}'::jsonb,
  etapa int not null default 0 check (etapa between 0 and 4),
  corretor_id uuid not null references public.profiles(id),
  corretor_nome text,
  imobiliaria_id uuid references public.imobiliarias(id) on delete set null,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.proposta_eventos (
  id bigserial primary key,
  proposta_id bigint not null references public.propostas(id) on delete cascade,
  de_etapa int,
  para_etapa int,
  por uuid references public.profiles(id) on delete set null,
  por_nome text,
  nota text,
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Comercial: comunicados, interações e agenda
-- ---------------------------------------------------------------------
create table if not exists public.comunicados (
  id bigserial primary key,
  publico text not null default 'todos' check (publico in ('todos','gestores','corretores')),
  mensagem text not null,
  autor_id uuid references public.profiles(id) on delete set null,
  autor_nome text,
  criado_em timestamptz not null default now()
);

create table if not exists public.interacoes (
  id bigserial primary key,
  imobiliaria_id uuid not null references public.imobiliarias(id) on delete cascade,
  autor_id uuid references public.profiles(id) on delete set null,
  autor_nome text,
  nota text,
  criado_em timestamptz not null default now()
);

create table if not exists public.eventos (
  id bigserial primary key,
  tipo text not null default 'reuniao' check (tipo in ('treinamento','evento','reuniao')),
  participantes int,
  data date,
  quando_texto text,
  titulo text not null,
  detalhe text,
  imobiliaria_id uuid references public.imobiliarias(id) on delete set null,
  status text not null default 'confirmado' check (status in ('confirmado','a_confirmar','realizado','cancelado')),
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- Funções auxiliares de permissão
-- =====================================================================
create or replace function public.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where id = auth.uid() and status = 'ATIVO'
$$;

create or replace function public.minha_imob() returns uuid
language sql stable security definer set search_path = public as $$
  select imobiliaria_id from public.profiles where id = auth.uid() and status = 'ATIVO'
$$;

create or replace function public.is_interno() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() in ('admin','comercial','marketing','credito'), false)
$$;

create or replace function public.tem_papel(variadic p text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = any(p), false)
$$;

-- =====================================================================
-- Cadastro: cria o perfil a partir do formulário de Primeiro Acesso
-- =====================================================================
create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_tipo text := coalesce(m->>'tipo', 'autonomo');
  v_papel text;
  v_status text := 'PENDENTE_APROVACAO';
  v_imob uuid;
  v_nome text := coalesce(nullif(m->>'nome',''), split_part(new.email,'@',1));
begin
  if v_tipo not in ('autonomo','vinculado','pj','interno') then v_tipo := 'autonomo'; end if;

  if v_tipo = 'interno' then
    if lower(new.email) not like '%@chaincorp.com.br'
       and not exists (select 1 from hub_admins_iniciais a where lower(a.email) = lower(new.email)) then
      raise exception 'Colaborador interno precisa usar o e-mail @chaincorp.com.br';
    end if;
    v_papel := case m->>'departamento'
      when 'Marketing' then 'marketing'
      when 'Mesa de Crédito' then 'credito'
      else 'comercial' end;
  elsif v_tipo = 'pj' then
    v_papel := 'gestor';
    select id into v_imob from imobiliarias where lower(nome) = lower(coalesce(m->>'nome_fantasia', v_nome)) limit 1;
    if v_imob is null then
      insert into imobiliarias (nome, razao_social, cnpj, creci_j, email, telefone, responsavel, situacao)
      values (coalesce(nullif(m->>'nome_fantasia',''), v_nome), m->>'razao_social', m->>'cnpj', m->>'creci_j',
              new.email, m->>'telefone', m->>'responsavel', 'em_negociacao')
      returning id into v_imob;
    else
      update imobiliarias set
        razao_social = coalesce(razao_social, m->>'razao_social'),
        cnpj = coalesce(cnpj, m->>'cnpj'),
        creci_j = coalesce(creci_j, m->>'creci_j'),
        telefone = coalesce(telefone, m->>'telefone'),
        responsavel = coalesce(responsavel, m->>'responsavel')
      where id = v_imob;
    end if;
  else
    v_papel := 'corretor';
    if v_tipo = 'vinculado' then v_imob := nullif(m->>'imobiliaria_id','')::uuid; end if;
  end if;

  if exists (select 1 from hub_admins_iniciais a where lower(a.email) = lower(new.email)) then
    v_papel := 'admin'; v_tipo := 'interno'; v_status := 'ATIVO';
  end if;

  insert into profiles (id, nome, email, tipo, papel, departamento, cpf, whatsapp, creci, uf, imobiliaria_id, status)
  values (new.id, v_nome, new.email, v_tipo, v_papel, m->>'departamento', m->>'cpf', m->>'whatsapp',
          m->>'creci', m->>'uf', v_imob, v_status)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

-- Lista pública (sem login) das imobiliárias para o corretor vinculado escolher
create or replace function public.imobiliarias_para_vinculo()
returns table (id uuid, nome text, cidade text)
language sql stable security definer set search_path = public as $$
  select id, nome, cidade from imobiliarias
  where ativa_no_hub or situacao in ('treinada','parceira')
  order by nome
$$;

-- =====================================================================
-- Aprovação de acessos
-- =====================================================================
create or replace function public.decidir_acesso(p_usuario uuid, p_aprovar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare alvo profiles; eu text := meu_papel();
begin
  select * into alvo from profiles where id = p_usuario;
  if alvo.id is null then raise exception 'Usuário não encontrado'; end if;
  if eu in ('admin','comercial') then
    null;
  elsif eu = 'gestor' and alvo.tipo = 'vinculado' and alvo.imobiliaria_id = minha_imob() then
    null;
  else
    raise exception 'Você não tem permissão para decidir este acesso';
  end if;
  if alvo.papel = 'admin' and eu <> 'admin' then raise exception 'Somente o administrador altera outro administrador'; end if;

  update profiles set status = case when p_aprovar then 'ATIVO' else 'REJEITADO' end,
    aprovado_por = auth.uid(), aprovado_em = now()
  where id = p_usuario;

  if p_aprovar and alvo.tipo = 'pj' and alvo.imobiliaria_id is not null then
    update imobiliarias set ativa_no_hub = true,
      situacao = case when situacao in ('prospect','em_negociacao') then 'parceira' else situacao end
    where id = alvo.imobiliaria_id;
  end if;
end $$;

create or replace function public.reabrir_acesso(p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tem_papel('admin','comercial') then raise exception 'Sem permissão'; end if;
  update profiles set status = 'PENDENTE_APROVACAO', aprovado_por = null, aprovado_em = null where id = p_usuario;
end $$;

create or replace function public.alterar_papel(p_usuario uuid, p_papel text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tem_papel('admin') then raise exception 'Somente o administrador muda perfis'; end if;
  if p_usuario = auth.uid() and p_papel <> 'admin' then raise exception 'Você não pode remover o seu próprio acesso de administrador'; end if;
  update profiles set papel = p_papel where id = p_usuario;
end $$;

-- =====================================================================
-- Disparos e rastreio
-- =====================================================================
create or replace function public.criar_disparo(p_lancamento text, p_tese text, p_pela_imobiliaria boolean)
returns text language plpgsql security definer set search_path = public as $$
declare t text; v_imob uuid;
begin
  if meu_papel() is null then raise exception 'Acesso não liberado'; end if;
  if p_pela_imobiliaria then v_imob := minha_imob(); end if;
  loop
    t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    exit when not exists (select 1 from links where token = t);
  end loop;
  insert into links (token, corretor_id, imobiliaria_id, lancamento_id, tese)
  values (t, auth.uid(), v_imob, p_lancamento, p_tese);
  return t;
end $$;

-- Chamado pela página pública /p/{token}; registra o acesso e devolve o que mostrar
create or replace function public.abrir_link(p_token text, p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  select jsonb_build_object(
    'lancamento', jsonb_build_object('id', l.id, 'nome', l.nome, 'local', l.local, 'fase', l.fase, 'tags', l.tags,
       'cor1', l.cor1, 'cor2', l.cor2, 'arte_feed_url', l.arte_feed_url, 'arte_stories_url', l.arte_stories_url,
       'drive_url', l.drive_url, 'youtube_url', l.youtube_url),
    'corretor', jsonb_build_object('nome', p.nome, 'whatsapp', p.whatsapp),
    'imobiliaria', i.nome,
    'tese', k.tese)
  into r
  from links k join lancamentos l on l.id = k.lancamento_id
  join profiles p on p.id = k.corretor_id
  left join imobiliarias i on i.id = k.imobiliaria_id
  where k.token = p_token;
  if r is null then return null; end if;
  -- não conta duas vezes o mesmo navegador em 30 minutos
  if not exists (select 1 from acessos a where a.token = p_token and a.user_agent is not distinct from left(p_user_agent,300)
                 and a.criado_em > now() - interval '30 minutes') then
    insert into acessos (token, user_agent) values (p_token, left(p_user_agent, 300));
  end if;
  return r;
end $$;

-- =====================================================================
-- Propostas
-- =====================================================================
create or replace function public.criar_proposta(p jsonb, p_pela_imobiliaria boolean)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint; eu profiles;
begin
  select * into eu from profiles where id = auth.uid() and status = 'ATIVO';
  if eu.id is null or eu.papel not in ('corretor','gestor','admin','comercial') then
    raise exception 'Seu acesso não permite enviar fichas';
  end if;
  insert into propostas (proponente, cpf, celular, renda, papel_compra, objetivo, primeiro_imovel,
    lancamento_id, unidade, valor_unidade, documentos, corretor_id, corretor_nome, imobiliaria_id, observacao)
  values (trim(p->>'proponente'), p->>'cpf', p->>'celular', (p->>'renda')::numeric, p->>'papel_compra', p->>'objetivo',
    (p->>'primeiro_imovel')::boolean, p->>'lancamento_id', p->>'unidade', nullif(p->>'valor_unidade','')::numeric,
    coalesce(p->'documentos','{}'::jsonb), eu.id, eu.nome,
    case when p_pela_imobiliaria then eu.imobiliaria_id end, p->>'observacao')
  returning id into v_id;
  insert into proposta_eventos (proposta_id, de_etapa, para_etapa, por, por_nome, nota)
  values (v_id, null, 0, eu.id, eu.nome, 'Ficha enviada');
  return v_id;
end $$;

create or replace function public.mover_proposta(p_id bigint, p_para int, p_nota text default null)
returns void language plpgsql security definer set search_path = public as $$
declare atual int; eu profiles;
begin
  select * into eu from profiles where id = auth.uid() and status = 'ATIVO';
  if eu.papel not in ('credito','admin') then raise exception 'Somente a Mesa de Crédito move a esteira'; end if;
  if p_para < 0 or p_para > 4 then raise exception 'Etapa inválida'; end if;
  select etapa into atual from propostas where id = p_id for update;
  update propostas set etapa = p_para, atualizado_em = now() where id = p_id;
  insert into proposta_eventos (proposta_id, de_etapa, para_etapa, por, por_nome, nota)
  values (p_id, atual, p_para, eu.id, eu.nome, p_nota);
end $$;

-- =====================================================================
-- Comercial
-- =====================================================================
create or replace function public.registrar_contato(p_imob uuid, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
declare eu profiles;
begin
  select * into eu from profiles where id = auth.uid() and status = 'ATIVO';
  if eu.papel not in ('admin','comercial') then raise exception 'Sem permissão'; end if;
  insert into interacoes (imobiliaria_id, autor_id, autor_nome, nota) values (p_imob, eu.id, eu.nome, p_nota);
  update imobiliarias set ultimo_contato = current_date where id = p_imob;
end $$;

-- =====================================================================
-- Painéis (métricas calculadas no banco)
-- =====================================================================
create or replace function public.metricas_gerais()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_interno() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'parceiros_ativos', (select count(*) from profiles where status = 'ATIVO' and tipo <> 'interno'),
    'imobiliarias_ativas', (select count(*) from imobiliarias where ativa_no_hub),
    'imobiliarias_total', (select count(*) from imobiliarias),
    'disparos', (select count(*) from links),
    'disparos_mes', (select count(*) from links where criado_em >= date_trunc('month', now())),
    'acessos', (select count(*) from acessos),
    'propostas_esteira', (select count(*) from propostas where etapa < 4),
    'propostas_minuta', (select count(*) from propostas where etapa = 4),
    'vgv_potencial', (select coalesce(sum(valor_unidade),0) from propostas),
    'pendentes', (select count(*) from profiles where status = 'PENDENTE_APROVACAO' and tipo <> 'vinculado'),
    'ultimo_acesso', (select max(criado_em) from acessos)
  );
end $$;

create or replace function public.ranking_imobiliarias()
returns table (id uuid, nome text, cidade text, situacao text, corretores bigint, disparos bigint, acessos bigint, propostas bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_interno() then raise exception 'Sem permissão'; end if;
  return query
  select i.id, i.nome, i.cidade, i.situacao,
    (select count(*) from profiles p where p.imobiliaria_id = i.id and p.status = 'ATIVO' and p.tipo = 'vinculado'),
    (select count(*) from links k where k.imobiliaria_id = i.id),
    (select count(*) from acessos a join links k on k.token = a.token where k.imobiliaria_id = i.id),
    (select count(*) from propostas r where r.imobiliaria_id = i.id)
  from imobiliarias i
  where i.ativa_no_hub or i.situacao in ('treinada','parceira')
  order by 7 desc, 8 desc, i.nome;
end $$;

create or replace function public.ranking_corretores(p_imob uuid default null)
returns table (id uuid, nome text, imobiliaria text, disparos bigint, acessos bigint, propostas bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(is_interno() or (meu_papel() = 'gestor' and p_imob = minha_imob()), false) then raise exception 'Sem permissão'; end if;
  return query
  select p.id, p.nome, i.nome,
    (select count(*) from links k where k.corretor_id = p.id),
    (select count(*) from acessos a join links k on k.token = a.token where k.corretor_id = p.id),
    (select count(*) from propostas r where r.corretor_id = p.id)
  from profiles p left join imobiliarias i on i.id = p.imobiliaria_id
  where p.status = 'ATIVO' and p.papel in ('corretor','gestor')
    and (p_imob is null or p.imobiliaria_id = p_imob)
  order by 4 desc, 5 desc, p.nome;
end $$;

create or replace function public.minhas_metricas()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare pct numeric;
begin
  select nullif(valor,'')::numeric into pct from hub_config where chave = 'comissao_percentual';
  return jsonb_build_object(
    'disparos_mes', (select count(*) from links where corretor_id = auth.uid() and criado_em >= date_trunc('month', now())),
    'disparos', (select count(*) from links where corretor_id = auth.uid()),
    'acessos', (select count(*) from acessos a join links k on k.token = a.token where k.corretor_id = auth.uid()),
    'propostas', (select count(*) from propostas where corretor_id = auth.uid()),
    'comissao_percentual', pct,
    'comissao_prevista', case when pct is null then null else
      (select coalesce(sum(valor_unidade),0) * pct / 100 from propostas where corretor_id = auth.uid() and etapa >= 1) end
  );
end $$;

-- =====================================================================
-- Regras de acesso (Row Level Security)
-- =====================================================================
alter table public.hub_config enable row level security;
alter table public.hub_admins_iniciais enable row level security;
alter table public.imobiliarias enable row level security;
alter table public.profiles enable row level security;
alter table public.lancamentos enable row level security;
alter table public.copies enable row level security;
alter table public.visibilidade enable row level security;
alter table public.links enable row level security;
alter table public.acessos enable row level security;
alter table public.propostas enable row level security;
alter table public.proposta_eventos enable row level security;
alter table public.comunicados enable row level security;
alter table public.interacoes enable row level security;
alter table public.eventos enable row level security;

-- apaga políticas antigas para o script poder rodar de novo
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy cfg_ler on public.hub_config for select to authenticated using (meu_papel() is not null);
create policy cfg_gravar on public.hub_config for all to authenticated using (tem_papel('admin')) with check (tem_papel('admin'));

create policy adm_ler on public.hub_admins_iniciais for select to authenticated using (tem_papel('admin'));
create policy adm_gravar on public.hub_admins_iniciais for all to authenticated using (tem_papel('admin')) with check (tem_papel('admin'));

create policy imob_ler on public.imobiliarias for select to authenticated
  using (is_interno() or id = minha_imob());
create policy imob_gravar on public.imobiliarias for all to authenticated
  using (tem_papel('admin','comercial')) with check (tem_papel('admin','comercial'));

create policy prof_ler on public.profiles for select to authenticated
  using (id = auth.uid() or is_interno() or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()));
create policy prof_editar_proprio on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy lanc_ler on public.lancamentos for select to authenticated using (meu_papel() is not null);
create policy lanc_gravar on public.lancamentos for all to authenticated
  using (tem_papel('admin','marketing')) with check (tem_papel('admin','marketing'));

create policy copy_ler on public.copies for select to authenticated using (meu_papel() is not null);
create policy copy_gravar on public.copies for all to authenticated
  using (tem_papel('admin','marketing')) with check (tem_papel('admin','marketing'));

create policy vis_ler on public.visibilidade for select to authenticated
  using (is_interno() or imobiliaria_id = minha_imob());
create policy vis_gravar on public.visibilidade for all to authenticated
  using (tem_papel('admin') or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()))
  with check (tem_papel('admin') or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()));

create policy links_ler on public.links for select to authenticated
  using (corretor_id = auth.uid() or is_interno() or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()));

create policy acessos_ler on public.acessos for select to authenticated
  using (exists (select 1 from links k where k.token = acessos.token and
    (k.corretor_id = auth.uid() or is_interno() or (meu_papel() = 'gestor' and k.imobiliaria_id = minha_imob()))));

create policy prop_ler on public.propostas for select to authenticated
  using (corretor_id = auth.uid() or tem_papel('admin','comercial','credito')
         or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()));

create policy evt_prop_ler on public.proposta_eventos for select to authenticated
  using (exists (select 1 from propostas r where r.id = proposta_eventos.proposta_id));

create policy com_ler on public.comunicados for select to authenticated using (meu_papel() is not null);
create policy com_gravar on public.comunicados for insert to authenticated with check (tem_papel('admin','comercial'));

create policy int_ler on public.interacoes for select to authenticated using (tem_papel('admin','comercial'));

create policy ev_ler on public.eventos for select to authenticated using (is_interno());
create policy ev_gravar on public.eventos for all to authenticated
  using (tem_papel('admin','comercial')) with check (tem_papel('admin','comercial'));

-- =====================================================================
-- Armazenamento das artes (JPEG) dos lançamentos
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('criativos', 'criativos', true)
on conflict (id) do update set public = true;

drop policy if exists criativos_ler on storage.objects;
drop policy if exists criativos_enviar on storage.objects;
drop policy if exists criativos_trocar on storage.objects;
drop policy if exists criativos_apagar on storage.objects;
create policy criativos_ler on storage.objects for select using (bucket_id = 'criativos');
create policy criativos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'criativos' and public.tem_papel('admin','marketing'));
create policy criativos_trocar on storage.objects for update to authenticated
  using (bucket_id = 'criativos' and public.tem_papel('admin','marketing'));
create policy criativos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'criativos' and public.tem_papel('admin','marketing'));

-- =====================================================================
-- Atualização em tempo real (esteira, filas e acessos)
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.propostas;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.acessos;
exception when others then null; end $$;

-- =====================================================================
-- ACADEMIA DE VENDAS
-- Trilhas por nível, aulas, quiz de certificação, progresso
-- e biblioteca de abordagem (roteiros e objeções por etapa da venda)
-- =====================================================================
create table if not exists public.trilhas (
  id bigserial primary key,
  titulo text not null,
  descricao text,
  nivel int not null default 1,
  lancamento_id text references public.lancamentos(id) on delete set null,
  publico text not null default 'todos' check (publico in ('todos','corretores','gestores')),
  nota_minima int not null default 70,
  ordem int not null default 100,
  publicada boolean not null default true,
  criado_em timestamptz not null default now()
);
create unique index if not exists trilhas_titulo_uk on public.trilhas (lower(titulo));

create table if not exists public.aulas (
  id bigserial primary key,
  trilha_id bigint not null references public.trilhas(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'leitura' check (tipo in ('video','leitura','material','roteiro')),
  conteudo text,
  video_url text,
  material_url text,
  duracao_min int,
  ordem int not null default 100
);

create table if not exists public.quiz_perguntas (
  id bigserial primary key,
  trilha_id bigint not null references public.trilhas(id) on delete cascade,
  enunciado text not null,
  opcoes jsonb not null,
  correta int not null,
  explicacao text,
  ordem int not null default 100
);

create table if not exists public.progresso_aulas (
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  aula_id bigint not null references public.aulas(id) on delete cascade,
  concluida_em timestamptz not null default now(),
  primary key (usuario_id, aula_id)
);

create table if not exists public.tentativas_quiz (
  id bigserial primary key,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  trilha_id bigint not null references public.trilhas(id) on delete cascade,
  acertos int not null,
  total int not null,
  aprovado boolean not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.abordagens (
  id bigserial primary key,
  etapa text not null check (etapa in ('abordagem','qualificacao','apresentacao','objecao','fechamento','pos_venda')),
  titulo text not null,
  texto text not null,
  lancamento_id text references public.lancamentos(id) on delete set null,
  status text not null default 'publicada' check (status in ('publicada','sugerida','arquivada')),
  autor_id uuid references public.profiles(id) on delete set null,
  autor_nome text,
  usos int not null default 0,
  criado_em timestamptz not null default now()
);
create unique index if not exists abordagens_titulo_uk on public.abordagens (lower(titulo));

-- Corrige o quiz no servidor (o gabarito nunca vai para o navegador do corretor)
create or replace function public.quiz_da_trilha(p_trilha bigint)
returns table (id bigint, enunciado text, opcoes jsonb)
language sql stable security definer set search_path = public as $$
  select id, enunciado, opcoes from quiz_perguntas
  where trilha_id = p_trilha and public.meu_papel() is not null
  order by ordem, id
$$;

create or replace function public.responder_quiz(p_trilha bigint, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare total int; acertos int := 0; minimo int; aprovado boolean; r record; correcao jsonb := '[]'::jsonb; escolha int;
begin
  if meu_papel() is null then raise exception 'Acesso não liberado'; end if;
  select nota_minima into minimo from trilhas where id = p_trilha;
  select count(*) into total from quiz_perguntas where trilha_id = p_trilha;
  if total = 0 then raise exception 'Esta trilha não tem quiz'; end if;
  for r in select id, correta, explicacao from quiz_perguntas where trilha_id = p_trilha loop
    escolha := nullif(p_respostas->>(r.id::text),'')::int;
    if escolha = r.correta then acertos := acertos + 1; end if;
    correcao := correcao || jsonb_build_object('id', r.id, 'correta', r.correta, 'escolha', escolha, 'explicacao', r.explicacao);
  end loop;
  aprovado := acertos * 100 >= minimo * total;
  insert into tentativas_quiz (usuario_id, trilha_id, acertos, total, aprovado) values (auth.uid(), p_trilha, acertos, total, aprovado);
  return jsonb_build_object('acertos', acertos, 'total', total, 'aprovado', aprovado, 'correcao', correcao);
end $$;

create or replace function public.contar_uso_abordagem(p_id bigint)
returns void language sql security definer set search_path = public as $$
  update abordagens set usos = usos + 1 where id = p_id and public.meu_papel() is not null
$$;

-- Situação de cada trilha para o usuário logado
create or replace function public.minha_academia()
returns table (trilha_id bigint, aulas_total bigint, aulas_feitas bigint, tem_quiz boolean, aprovado boolean, melhor_nota int)
language sql stable security definer set search_path = public as $$
  select t.id,
    (select count(*) from aulas a where a.trilha_id = t.id),
    (select count(*) from aulas a join progresso_aulas p on p.aula_id = a.id and p.usuario_id = auth.uid() where a.trilha_id = t.id),
    exists (select 1 from quiz_perguntas q where q.trilha_id = t.id),
    exists (select 1 from tentativas_quiz x where x.trilha_id = t.id and x.usuario_id = auth.uid() and x.aprovado),
    (select max(round(acertos * 100.0 / nullif(total,0)))::int from tentativas_quiz x where x.trilha_id = t.id and x.usuario_id = auth.uid())
  from trilhas t where t.publicada
$$;

-- Certificado de uma trilha = todas as aulas concluídas + quiz aprovado (quando houver)
create or replace function public.trilhas_certificadas(p_usuario uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from trilhas t
  where t.publicada
    and not exists (select 1 from aulas a where a.trilha_id = t.id
                    and not exists (select 1 from progresso_aulas p where p.aula_id = a.id and p.usuario_id = p_usuario))
    and (not exists (select 1 from quiz_perguntas q where q.trilha_id = t.id)
         or exists (select 1 from tentativas_quiz x where x.trilha_id = t.id and x.usuario_id = p_usuario and x.aprovado))
    and exists (select 1 from aulas a where a.trilha_id = t.id)
$$;

-- Evolução da rede: capacitação x atividade comercial, por corretor
create or replace function public.evolucao_corretores(p_imob uuid default null)
returns table (id uuid, nome text, imobiliaria text, imobiliaria_id uuid, aulas bigint, certificados int, trilhas_total bigint,
               disparos bigint, acessos bigint, propostas bigint, ultimo_disparo timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(is_interno() or (meu_papel() = 'gestor' and p_imob = minha_imob()), false) then raise exception 'Sem permissão'; end if;
  return query
  select p.id, p.nome, i.nome, p.imobiliaria_id,
    (select count(*) from progresso_aulas g where g.usuario_id = p.id),
    trilhas_certificadas(p.id),
    (select count(*) from trilhas t where t.publicada),
    (select count(*) from links k where k.corretor_id = p.id),
    (select count(*) from acessos a join links k on k.token = a.token where k.corretor_id = p.id),
    (select count(*) from propostas r where r.corretor_id = p.id),
    (select max(k.criado_em) from links k where k.corretor_id = p.id)
  from profiles p left join imobiliarias i on i.id = p.imobiliaria_id
  where p.status = 'ATIVO' and p.papel in ('corretor','gestor')
    and (p_imob is null or p.imobiliaria_id = p_imob)
  order by 6 desc, 8 desc, p.nome;
end $$;

-- Evolução por imobiliária parceira
create or replace function public.evolucao_imobiliarias()
returns table (id uuid, nome text, cidade text, situacao text, corretores bigint, corretores_certificados bigint,
               aulas bigint, disparos bigint, acessos bigint, propostas bigint, treinamentos bigint, ultimo_contato date)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_interno() then raise exception 'Sem permissão'; end if;
  return query
  select i.id, i.nome, i.cidade, i.situacao,
    (select count(*) from profiles p where p.imobiliaria_id = i.id and p.status = 'ATIVO' and p.papel in ('corretor','gestor')),
    (select count(*) from profiles p where p.imobiliaria_id = i.id and p.status = 'ATIVO' and p.papel in ('corretor','gestor') and trilhas_certificadas(p.id) > 0),
    (select count(*) from progresso_aulas g join profiles p on p.id = g.usuario_id where p.imobiliaria_id = i.id),
    (select count(*) from links k where k.imobiliaria_id = i.id),
    (select count(*) from acessos a join links k on k.token = a.token where k.imobiliaria_id = i.id),
    (select count(*) from propostas r where r.imobiliaria_id = i.id),
    (select count(*) from eventos e where e.imobiliaria_id = i.id and e.tipo = 'treinamento' and e.status = 'realizado'),
    i.ultimo_contato
  from imobiliarias i
  where i.ativa_no_hub or i.situacao in ('treinada','parceira')
  order by 9 desc, 10 desc, i.nome;
end $$;

create or replace function public.metricas_academia()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_interno() then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'trilhas', (select count(*) from trilhas where publicada),
    'aulas_concluidas', (select count(*) from progresso_aulas),
    'corretores', (select count(*) from profiles where status = 'ATIVO' and papel in ('corretor','gestor')),
    'corretores_em_curso', (select count(distinct usuario_id) from progresso_aulas),
    'corretores_certificados', (select count(*) from profiles p where p.status = 'ATIVO' and p.papel in ('corretor','gestor') and trilhas_certificadas(p.id) > 0),
    'quiz_tentativas', (select count(*) from tentativas_quiz),
    'quiz_aprovacao', (select round(100.0 * count(*) filter (where aprovado) / nullif(count(*),0)) from tentativas_quiz),
    'treinamentos_presenciais', (select count(*) from eventos where tipo = 'treinamento' and status = 'realizado'),
    'participantes_presenciais', (select coalesce(sum(participantes),0) from eventos where tipo = 'treinamento' and status = 'realizado'),
    'sugestoes_pendentes', (select count(*) from abordagens where status = 'sugerida')
  );
end $$;

alter table public.trilhas enable row level security;
alter table public.aulas enable row level security;
alter table public.quiz_perguntas enable row level security;
alter table public.progresso_aulas enable row level security;
alter table public.tentativas_quiz enable row level security;
alter table public.abordagens enable row level security;

create policy tri_ler on public.trilhas for select to authenticated using (meu_papel() is not null and (publicada or tem_papel('admin','comercial','marketing')));
create policy tri_gravar on public.trilhas for all to authenticated using (tem_papel('admin','comercial','marketing')) with check (tem_papel('admin','comercial','marketing'));
create policy aula_ler on public.aulas for select to authenticated using (meu_papel() is not null);
create policy aula_gravar on public.aulas for all to authenticated using (tem_papel('admin','comercial','marketing')) with check (tem_papel('admin','comercial','marketing'));
-- o gabarito só é visível para quem edita o conteúdo
create policy quiz_ler on public.quiz_perguntas for select to authenticated using (tem_papel('admin','comercial','marketing'));
create policy quiz_gravar on public.quiz_perguntas for all to authenticated using (tem_papel('admin','comercial','marketing')) with check (tem_papel('admin','comercial','marketing'));
create policy prog_ler on public.progresso_aulas for select to authenticated using (usuario_id = auth.uid() or is_interno());
create policy prog_marcar on public.progresso_aulas for insert to authenticated with check (usuario_id = auth.uid() and meu_papel() is not null);
create policy prog_desmarcar on public.progresso_aulas for delete to authenticated using (usuario_id = auth.uid());
create policy tq_ler on public.tentativas_quiz for select to authenticated using (usuario_id = auth.uid() or is_interno());
create policy abd_ler on public.abordagens for select to authenticated
  using (meu_papel() is not null and (status = 'publicada' or autor_id = auth.uid() or tem_papel('admin','comercial','marketing')));
create policy abd_sugerir on public.abordagens for insert to authenticated
  with check (meu_papel() is not null and (status = 'sugerida' or tem_papel('admin','comercial','marketing')));
create policy abd_editar on public.abordagens for update to authenticated using (tem_papel('admin','comercial','marketing')) with check (tem_papel('admin','comercial','marketing'));
create policy abd_apagar on public.abordagens for delete to authenticated using (tem_papel('admin','comercial','marketing'));

-- Permissões das funções
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.abrir_link(text, text) to anon, authenticated;
grant execute on function public.imobiliarias_para_vinculo() to anon, authenticated;


-- Academia de Vendas, Fase A0.2: conteúdo (kits, argumentos, trilhas, aulas,
-- quiz, avisos) e o bucket de arquivos. Depende de migrations_academia_a0_1_acesso.sql.
--
-- Todo conteúdo é do dono do canal (owner_id = Marcos). Parceiro com acesso
-- liberado só LÊ, e só o que está publicado. O gabarito do quiz (resposta
-- certa e explicação) fica numa tabela à parte que ninguém além do dono lê:
-- a correção acontece no servidor (pc_responder_quiz, A0.3).
--
-- Nada aqui toca em pc_empreendimentos, que tem comissão e tabela de preço e
-- por isso NÃO ganha leitura para parceiros.

begin;

-- ---------------------------------------------------------------------
-- Storage: bucket público para capas, fotos, cards, lâminas e guias. Leitura
-- aberta (o cliente final precisa ver as imagens do link); escrita só do
-- administrador da plataforma.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('academia', 'academia', true, 20971520, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

create policy "Leitura pública dos arquivos da academia" on storage.objects
  for select using (bucket_id = 'academia');

create policy "Admin envia arquivo da academia" on storage.objects
  for insert to authenticated with check (bucket_id = 'academia' and is_platform_admin());

create policy "Admin altera arquivo da academia" on storage.objects
  for update to authenticated using (bucket_id = 'academia' and is_platform_admin());

create policy "Admin remove arquivo da academia" on storage.objects
  for delete to authenticated using (bucket_id = 'academia' and is_platform_admin());

-- ---------------------------------------------------------------------
-- Kit de venda: 1 por empreendimento. Os campos que a tela usa direto são
-- colunas; o resto do kit (pílula, números, regras, FAQ, cadência, cards...)
-- fica em JSON, que é como foi escrito e testado.
-- ---------------------------------------------------------------------

create table pc_kits (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users,
  empreendimento_id  uuid not null unique references pc_empreendimentos(id) on delete cascade,
  codigo             text not null unique,
  local_texto        text,
  fase               text,
  tags               text[] not null default '{}',
  resumo             text,
  destaques          text,
  ficha              text,
  entrega            text,
  preco_desde        text,
  comissao_texto     text,
  aviso              text,
  capa_url           text,
  lamina_url         text,
  guia_url           text,
  galeria            jsonb not null default '[]',
  drive_url          text,
  tabela_url         text,
  youtube_url        text,
  kit                jsonb not null default '{}',
  textos_whatsapp    jsonb not null default '{}',
  ordem              int not null default 100,
  publicado          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table pc_argumentos (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users,
  origem_id          text unique,
  etapa              text not null check (etapa in ('abordagem','qualificacao','apresentacao','objecao','fechamento','pos_venda')),
  titulo             text not null,
  texto              text not null,
  empreendimento_id  uuid references pc_empreendimentos(id) on delete set null,
  status             text not null default 'publicada' check (status in ('publicada','sugerida','arquivada')),
  sugerido_por       uuid references auth.users on delete set null,
  sugerido_por_nome  text,
  usos               int not null default 0,
  created_at         timestamptz not null default now()
);
create unique index pc_argumentos_titulo_unico on pc_argumentos (lower(titulo));

create table pc_trilhas (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users,
  origem_id          text unique,
  titulo             text not null,
  descricao          text,
  nivel              int not null default 1,
  empreendimento_id  uuid references pc_empreendimentos(id) on delete set null,
  publico            text not null default 'todos' check (publico in ('todos','corretor','gestor')),
  nota_minima        int not null default 70 check (nota_minima between 1 and 100),
  ordem              int not null default 100,
  publicada          boolean not null default true,
  created_at         timestamptz not null default now()
);

create table pc_aulas (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users,
  origem_id     text unique,
  trilha_id     uuid not null references pc_trilhas(id) on delete cascade,
  tipo          text not null check (tipo in ('leitura','video','material','roteiro')),
  ordem         int not null default 100,
  titulo        text not null,
  conteudo      text,
  video_url     text,
  duracao_min   int,
  material_url  text
);
create index on pc_aulas (trilha_id, ordem);

create table pc_quiz_perguntas (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users,
  origem_id   text unique,
  trilha_id   uuid not null references pc_trilhas(id) on delete cascade,
  ordem       int not null default 100,
  enunciado   text not null,
  opcoes      jsonb not null
);
create index on pc_quiz_perguntas (trilha_id, ordem);

-- Resposta certa (índice a partir de 0) e explicação. Só o dono lê.
create table pc_quiz_gabarito (
  pergunta_id  uuid primary key references pc_quiz_perguntas(id) on delete cascade,
  owner_id     uuid not null default auth.uid() references auth.users,
  correta      int not null check (correta >= 0),
  explicacao   text
);

create table pc_avisos (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users,
  titulo        text not null,
  texto         text,
  publico       text not null default 'todos' check (publico in ('todos','corretores','gestores')),
  ativo         boolean not null default true,
  publicado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table pc_kits enable row level security;
alter table pc_argumentos enable row level security;
alter table pc_trilhas enable row level security;
alter table pc_aulas enable row level security;
alter table pc_quiz_perguntas enable row level security;
alter table pc_quiz_gabarito enable row level security;
alter table pc_avisos enable row level security;

-- Dono = administrador do canal de verdade (pc_sou_dono_do_canal), não "qualquer
-- um que se declare dono de uma linha": sem isso um usuário comum gravaria
-- conteúdo próprio com owner_id = ele mesmo.
create policy "Dono gerencia pc_kits" on pc_kits for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_argumentos" on pc_argumentos for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_trilhas" on pc_trilhas for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_aulas" on pc_aulas for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_quiz_perguntas" on pc_quiz_perguntas for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_quiz_gabarito" on pc_quiz_gabarito for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());
create policy "Dono gerencia pc_avisos" on pc_avisos for all using (auth.uid() = owner_id and pc_sou_dono_do_canal());

create policy "Parceiro liberado lê kits publicados" on pc_kits
  for select using (pc_tem_acesso() and owner_id = pc_canal_owner() and publicado);

create policy "Parceiro liberado lê argumentos publicados" on pc_argumentos
  for select using (
    pc_tem_acesso() and owner_id = pc_canal_owner()
    and (status = 'publicada' or sugerido_por = auth.uid())
  );

create policy "Parceiro liberado lê trilhas do seu perfil" on pc_trilhas
  for select using (
    pc_tem_acesso() and owner_id = pc_canal_owner() and publicada
    and (publico = 'todos' or publico = pc_meu_papel()::text)
  );

-- O EXISTS roda sob a RLS de pc_trilhas: só enxerga aula de trilha visível.
create policy "Parceiro liberado lê aulas das trilhas visíveis" on pc_aulas
  for select using (exists (select 1 from pc_trilhas t where t.id = trilha_id));

create policy "Parceiro liberado lê perguntas das trilhas visíveis" on pc_quiz_perguntas
  for select using (exists (select 1 from pc_trilhas t where t.id = trilha_id));

create policy "Parceiro liberado lê avisos do seu perfil" on pc_avisos
  for select using (
    pc_tem_acesso() and owner_id = pc_canal_owner() and ativo
    and (publico = 'todos'
         or (publico = 'corretores' and pc_meu_papel() = 'corretor')
         or (publico = 'gestores' and pc_meu_papel() = 'gestor'))
  );

commit;

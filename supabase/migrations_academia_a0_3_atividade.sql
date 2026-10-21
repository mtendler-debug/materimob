-- Academia de Vendas, Fase A0.3: atividade, envio com link rastreado,
-- treinamento e quiz. Depende de A0.1 e A0.2.
--
-- pc_atividades é a fonte única do que o corretor parceiro fez; a
-- gamificação (fases G) vai ler daqui. Ninguém escreve direto: só as
-- funções abaixo, com tipos fechados validados no servidor. Não existe
-- política de UPDATE nem DELETE para ninguém.
--
-- O gatilho "mudança de status do registro de cliente vira atividade" fica
-- para a A4: mexer em pc_registros_cliente aqui arriscaria o formulário
-- público que já está no ar.

begin;

create table pc_atividades (
  id                 bigint generated always as identity primary key,
  owner_id           uuid not null references auth.users,
  user_id            uuid not null references auth.users on delete cascade,
  parceira_id        uuid references pc_parceiras(id) on delete set null,
  tipo               text not null check (tipo in (
    'abriu_projeto','abriu_book','abriu_tabela','abriu_video',
    'baixou_arte','baixou_foto','baixou_lamina','baixou_guia',
    'copiou_texto','usou_argumento','enviou_kit','cliente_abriu',
    'concluiu_aula','fez_quiz','certificou',
    'registro_criado','registro_registrado','registro_conflito','registro_visita',
    'registro_proposta','registro_venda','registro_expirado','registro_cancelado'
  )),
  empreendimento_id  uuid references pc_empreendimentos(id) on delete set null,
  detalhe            text,
  criado_em          timestamptz not null default now()
);
create index on pc_atividades (user_id, criado_em desc);
create index on pc_atividades (owner_id, criado_em desc);
create index on pc_atividades (parceira_id, criado_em desc);

create table pc_envios (
  token              text primary key,
  owner_id           uuid not null references auth.users,
  user_id            uuid not null references auth.users on delete cascade,
  parceira_id        uuid references pc_parceiras(id) on delete set null,
  empreendimento_id  uuid not null references pc_empreendimentos(id) on delete cascade,
  tese               text not null,
  cliente_nome       text,
  criado_em          timestamptz not null default now()
);
create index on pc_envios (user_id, criado_em desc);

create table pc_aberturas (
  id          bigint generated always as identity primary key,
  token       text not null references pc_envios(token) on delete cascade,
  user_agent  text,
  criado_em   timestamptz not null default now()
);
create index on pc_aberturas (token, criado_em desc);

create table pc_progresso_aulas (
  user_id      uuid not null references auth.users on delete cascade,
  aula_id      uuid not null references pc_aulas(id) on delete cascade,
  owner_id     uuid not null references auth.users,
  concluida_em timestamptz not null default now(),
  primary key (user_id, aula_id)
);

create table pc_quiz_tentativas (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null references auth.users,
  user_id     uuid not null references auth.users on delete cascade,
  trilha_id   uuid not null references pc_trilhas(id) on delete cascade,
  acertos     int not null,
  total       int not null,
  aprovado    boolean not null,
  criado_em   timestamptz not null default now()
);
create index on pc_quiz_tentativas (user_id, trilha_id);

create table pc_certificacoes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users,
  user_id     uuid not null references auth.users on delete cascade,
  trilha_id   uuid not null references pc_trilhas(id) on delete cascade,
  emitido_em  timestamptz not null default now(),
  unique (user_id, trilha_id)
);

alter table pc_atividades enable row level security;
alter table pc_envios enable row level security;
alter table pc_aberturas enable row level security;
alter table pc_progresso_aulas enable row level security;
alter table pc_quiz_tentativas enable row level security;
alter table pc_certificacoes enable row level security;

-- Leitura: o dono vê tudo, cada um vê o seu, o gestor vê a própria equipe.
-- Escrita: nenhuma política. Tudo entra pelas funções.
create policy "Ver atividades" on pc_atividades
  for select using (auth.uid() = owner_id or auth.uid() = user_id or pc_mesma_equipe(user_id));
create policy "Ver envios" on pc_envios
  for select using (auth.uid() = owner_id or auth.uid() = user_id or pc_mesma_equipe(user_id));
create policy "Ver aberturas" on pc_aberturas
  for select using (exists (select 1 from pc_envios e where e.token = pc_aberturas.token));
create policy "Ver progresso" on pc_progresso_aulas
  for select using (auth.uid() = owner_id or auth.uid() = user_id or pc_mesma_equipe(user_id));
create policy "Ver tentativas de quiz" on pc_quiz_tentativas
  for select using (auth.uid() = owner_id or auth.uid() = user_id or pc_mesma_equipe(user_id));
create policy "Ver certificações" on pc_certificacoes
  for select using (auth.uid() = owner_id or auth.uid() = user_id or pc_mesma_equipe(user_id));

-- ---------------------------------------------------------------------
-- Atividade
-- ---------------------------------------------------------------------

-- Interna. Sem acesso liberado (o Marcos, por exemplo) não grava nada.
create or replace function pc_log_atividade(p_user uuid, p_tipo text, p_emp uuid, p_detalhe text)
returns void language sql security definer set search_path = public as $$
  insert into pc_atividades (owner_id, user_id, parceira_id, tipo, empreendimento_id, detalhe)
  select a.owner_id, a.user_id, a.parceira_id, p_tipo, p_emp, left(p_detalhe, 200)
  from pc_acessos a
  where a.user_id = p_user and a.status = 'liberado';
$$;

-- Só os tipos que o próprio app informa. Os demais (enviou_kit, cliente_abriu,
-- concluiu_aula, fez_quiz, certificou) são gravados pelas funções de cada ação.
create or replace function pc_registrar_atividade(
  p_tipo text, p_empreendimento uuid default null, p_detalhe text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_tipo not in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video',
                    'baixou_arte','baixou_foto','baixou_lamina','baixou_guia',
                    'copiou_texto','usou_argumento') then
    raise exception 'Tipo de atividade inválido';
  end if;
  perform pc_log_atividade(auth.uid(), p_tipo, p_empreendimento, p_detalhe);
end;
$$;

-- ---------------------------------------------------------------------
-- Envio do kit com link rastreado
-- ---------------------------------------------------------------------

-- gen_random_uuid(), não gen_random_bytes: no Supabase a segunda vive no
-- schema extensions e uma função com search_path = public não a enxerga.
create or replace function pc_criar_envio(
  p_empreendimento uuid, p_tese text, p_cliente_nome text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
  t text;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    raise exception 'Acesso não liberado';
  end if;
  if not exists (
    select 1 from pc_kits k
    where k.empreendimento_id = p_empreendimento and k.publicado and k.owner_id = a.owner_id
      and k.textos_whatsapp ? p_tese
  ) then
    raise exception 'Projeto ou opção indisponível';
  end if;

  loop
    t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
    exit when not exists (select 1 from pc_envios where token = t);
  end loop;

  insert into pc_envios (token, owner_id, user_id, parceira_id, empreendimento_id, tese, cliente_nome)
  values (t, a.owner_id, a.user_id, a.parceira_id, p_empreendimento, p_tese, left(nullif(trim(coalesce(p_cliente_nome, '')), ''), 120));

  perform pc_log_atividade(a.user_id, 'enviou_kit', p_empreendimento, p_tese);
  return t;
end;
$$;

-- Página pública do cliente. Sem login. Devolve só o que o cliente pode ver:
-- nunca comissão, preço de tabela, aviso interno ou ficha técnica completa.
-- Cada abertura gera atividade para o corretor, no máximo 1 a cada 30 minutos
-- por aparelho.
create or replace function pc_abrir_envio(p_token text, p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e pc_envios;
  k pc_kits;
  v_nome_emp text;
  v_corretor text;
  v_whatsapp text;
  v_imob text;
  v_ua text := left(p_user_agent, 300);
begin
  select * into e from pc_envios where token = p_token;
  if e.token is null then
    return null;
  end if;
  select * into k from pc_kits where empreendimento_id = e.empreendimento_id and publicado;
  if k.id is null then
    return null;
  end if;
  select nome into v_nome_emp from pc_empreendimentos where id = e.empreendimento_id;
  select nome, whatsapp into v_corretor, v_whatsapp from pc_acessos where user_id = e.user_id;
  select nome_fantasia into v_imob from pc_parceiras where id = e.parceira_id;

  if not exists (
    select 1 from pc_aberturas b
    where b.token = p_token and b.user_agent is not distinct from v_ua
      and b.criado_em > now() - interval '30 minutes'
  ) then
    insert into pc_aberturas (token, user_agent) values (p_token, v_ua);
    perform pc_log_atividade(e.user_id, 'cliente_abriu', e.empreendimento_id, e.cliente_nome);
  end if;

  return jsonb_build_object(
    'projeto', jsonb_build_object(
      'codigo', k.codigo, 'nome', v_nome_emp, 'local', k.local_texto, 'fase', k.fase,
      'resumo', k.resumo, 'destaques', k.destaques, 'entrega', k.entrega,
      'capa_url', k.capa_url, 'galeria', k.galeria, 'lamina_url', k.lamina_url,
      'book_url', k.drive_url, 'youtube_url', k.youtube_url
    ),
    'corretor', jsonb_build_object('nome', v_corretor, 'whatsapp', v_whatsapp),
    'imobiliaria', v_imob,
    'tese', e.tese
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Argumentos
-- ---------------------------------------------------------------------

create or replace function pc_sugerir_argumento(
  p_etapa text, p_titulo text, p_texto text, p_empreendimento uuid default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    raise exception 'Acesso não liberado';
  end if;
  if nullif(trim(coalesce(p_titulo, '')), '') is null or nullif(trim(coalesce(p_texto, '')), '') is null then
    raise exception 'Informe título e texto';
  end if;
  begin
    insert into pc_argumentos (owner_id, etapa, titulo, texto, empreendimento_id, status, sugerido_por, sugerido_por_nome)
    values (a.owner_id, p_etapa, trim(p_titulo), trim(p_texto), p_empreendimento, 'sugerida', a.user_id, a.nome);
  exception when unique_violation then
    raise exception 'Já existe um argumento com esse título';
  end;
end;
$$;

create or replace function pc_usar_argumento(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
  g pc_argumentos;
begin
  select * into a from pc_acessos where user_id = auth.uid() and status = 'liberado';
  if a.user_id is null then
    return;
  end if;
  update pc_argumentos set usos = usos + 1
  where id = p_id and owner_id = a.owner_id and status = 'publicada'
  returning * into g;
  if g.id is not null then
    perform pc_log_atividade(a.user_id, 'usou_argumento', g.empreendimento_id, g.titulo);
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Treinamento
-- ---------------------------------------------------------------------

-- A trilha está publicada, é do meu canal e é para o meu perfil?
create or replace function pc_trilha_visivel(p_trilha uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from pc_trilhas t
    join pc_acessos a on a.user_id = auth.uid() and a.status = 'liberado'
    where t.id = p_trilha and t.publicada and t.owner_id = a.owner_id
      and (t.publico = 'todos' or t.publico = a.papel::text)
  );
$$;

-- Certificado = todas as aulas concluídas + quiz aprovado (quando a trilha
-- tem quiz). Emite uma vez só. Interna.
create or replace function pc_avaliar_certificado(p_user uuid, p_trilha uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
  v_owner uuid;
  v_titulo text;
begin
  select a.owner_id into v_owner from pc_acessos a where a.user_id = p_user and a.status = 'liberado';
  if v_owner is null then
    return false;
  end if;

  v_ok := exists (select 1 from pc_aulas where trilha_id = p_trilha)
    and not exists (
      select 1 from pc_aulas au
      where au.trilha_id = p_trilha
        and not exists (select 1 from pc_progresso_aulas g where g.aula_id = au.id and g.user_id = p_user)
    )
    and (
      not exists (select 1 from pc_quiz_perguntas q where q.trilha_id = p_trilha)
      or exists (select 1 from pc_quiz_tentativas x where x.trilha_id = p_trilha and x.user_id = p_user and x.aprovado)
    );

  if v_ok then
    insert into pc_certificacoes (owner_id, user_id, trilha_id) values (v_owner, p_user, p_trilha)
    on conflict (user_id, trilha_id) do nothing;
    if found then
      select titulo into v_titulo from pc_trilhas where id = p_trilha;
      perform pc_log_atividade(p_user, 'certificou', null, v_titulo);
    end if;
  end if;
  return v_ok;
end;
$$;

create or replace function pc_concluir_aula(p_aula uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_trilha uuid;
  v_titulo text;
  v_owner uuid;
begin
  select trilha_id, titulo into v_trilha, v_titulo from pc_aulas where id = p_aula;
  if v_trilha is null or not pc_trilha_visivel(v_trilha) then
    raise exception 'Aula indisponível';
  end if;
  v_owner := pc_canal_owner();

  insert into pc_progresso_aulas (user_id, aula_id, owner_id) values (auth.uid(), p_aula, v_owner)
  on conflict (user_id, aula_id) do nothing;
  if found then
    perform pc_log_atividade(auth.uid(), 'concluiu_aula', null, v_titulo);
  end if;
  perform pc_avaliar_certificado(auth.uid(), v_trilha);
end;
$$;

-- p_respostas: { "<id da pergunta>": <índice da opção escolhida, a partir de 0> }.
-- O gabarito nunca sai do servidor antes da correção.
create or replace function pc_responder_quiz(p_trilha uuid, p_respostas jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_total int;
  v_acertos int := 0;
  v_minimo int;
  v_aprovado boolean;
  v_titulo text;
  v_correcao jsonb := '[]'::jsonb;
  v_escolha int;
  v_valor text;
  r record;
begin
  if not pc_trilha_visivel(p_trilha) then
    raise exception 'Trilha indisponível';
  end if;
  select nota_minima, titulo into v_minimo, v_titulo from pc_trilhas where id = p_trilha;
  select count(*) into v_total from pc_quiz_perguntas where trilha_id = p_trilha;
  if v_total = 0 then
    raise exception 'Esta trilha não tem quiz';
  end if;

  for r in
    select q.id, g.correta, g.explicacao
    from pc_quiz_perguntas q join pc_quiz_gabarito g on g.pergunta_id = q.id
    where q.trilha_id = p_trilha
    order by q.ordem, q.id
  loop
    v_valor := p_respostas ->> r.id::text;
    v_escolha := case when v_valor ~ '^\d+$' then v_valor::int else null end;
    if v_escolha is not distinct from r.correta then
      v_acertos := v_acertos + 1;
    end if;
    v_correcao := v_correcao || jsonb_build_object(
      'id', r.id, 'escolha', v_escolha, 'correta', r.correta,
      'acertou', v_escolha is not distinct from r.correta, 'explicacao', r.explicacao
    );
  end loop;

  v_aprovado := v_acertos * 100 >= v_minimo * v_total;

  insert into pc_quiz_tentativas (owner_id, user_id, trilha_id, acertos, total, aprovado)
  values (pc_canal_owner(), auth.uid(), p_trilha, v_acertos, v_total, v_aprovado);
  perform pc_log_atividade(auth.uid(), 'fez_quiz', null, v_titulo || ' (' || v_acertos || '/' || v_total || ')');

  return jsonb_build_object(
    'acertos', v_acertos, 'total', v_total, 'aprovado', v_aprovado,
    'certificado', pc_avaliar_certificado(auth.uid(), p_trilha),
    'correcao', v_correcao
  );
end;
$$;

-- Situação de cada trilha visível para quem está logado.
create or replace function pc_minha_academia()
returns table (
  trilha_id uuid, aulas_total bigint, aulas_feitas bigint,
  tem_quiz boolean, aprovado boolean, melhor_nota int, certificado boolean
)
language sql security definer stable set search_path = public as $$
  select t.id,
    (select count(*) from pc_aulas a where a.trilha_id = t.id),
    (select count(*) from pc_aulas a join pc_progresso_aulas p on p.aula_id = a.id and p.user_id = auth.uid() where a.trilha_id = t.id),
    exists (select 1 from pc_quiz_perguntas q where q.trilha_id = t.id),
    exists (select 1 from pc_quiz_tentativas x where x.trilha_id = t.id and x.user_id = auth.uid() and x.aprovado),
    (select max(round(x.acertos * 100.0 / nullif(x.total, 0)))::int from pc_quiz_tentativas x where x.trilha_id = t.id and x.user_id = auth.uid()),
    exists (select 1 from pc_certificacoes c where c.trilha_id = t.id and c.user_id = auth.uid())
  from pc_trilhas t
  where pc_trilha_visivel(t.id)
  order by t.ordem, t.nivel;
$$;

-- ---------------------------------------------------------------------
-- Permissões de execução
-- ---------------------------------------------------------------------

revoke all on function pc_log_atividade(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function pc_avaliar_certificado(uuid, uuid) from public, anon, authenticated;
revoke all on function pc_registrar_atividade(text, uuid, text) from public, anon, authenticated;
revoke all on function pc_criar_envio(uuid, text, text) from public, anon, authenticated;
revoke all on function pc_abrir_envio(text, text) from public, anon, authenticated;
revoke all on function pc_sugerir_argumento(text, text, text, uuid) from public, anon, authenticated;
revoke all on function pc_usar_argumento(uuid) from public, anon, authenticated;
revoke all on function pc_trilha_visivel(uuid) from public, anon, authenticated;
revoke all on function pc_concluir_aula(uuid) from public, anon, authenticated;
revoke all on function pc_responder_quiz(uuid, jsonb) from public, anon, authenticated;
revoke all on function pc_minha_academia() from public, anon, authenticated;

grant execute on function pc_registrar_atividade(text, uuid, text) to authenticated;
grant execute on function pc_criar_envio(uuid, text, text) to authenticated;
-- A página do cliente final não tem login.
grant execute on function pc_abrir_envio(text, text) to anon, authenticated;
grant execute on function pc_sugerir_argumento(text, text, text, uuid) to authenticated;
grant execute on function pc_usar_argumento(uuid) to authenticated;
grant execute on function pc_trilha_visivel(uuid) to authenticated;
grant execute on function pc_concluir_aula(uuid) to authenticated;
grant execute on function pc_responder_quiz(uuid, jsonb) to authenticated;
grant execute on function pc_minha_academia() to authenticated;

commit;

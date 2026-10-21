-- =====================================================================
-- CHAINCORP HUB · Script 3: versão simplificada
-- Parceiros (corretor e gestor de imobiliária) + Administrador
-- Materiais por projeto, argumentos, treinamento, negócios e atividade
-- Pode ser executado de novo sem perder dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Remove o que saiu do escopo (esteira de crédito, CRM, agenda)
-- ---------------------------------------------------------------------
drop function if exists public.criar_proposta(jsonb, boolean);
drop function if exists public.mover_proposta(bigint, int, text);
drop function if exists public.registrar_contato(uuid, text);
drop function if exists public.metricas_gerais();
drop function if exists public.ranking_imobiliarias();
drop function if exists public.ranking_corretores(uuid);
drop function if exists public.minhas_metricas();
drop function if exists public.evolucao_corretores(uuid);
drop function if exists public.evolucao_imobiliarias();
drop function if exists public.metricas_academia();
drop function if exists public.alterar_papel(uuid, text);
drop table if exists public.proposta_eventos cascade;
drop table if exists public.propostas cascade;
drop table if exists public.interacoes cascade;
drop table if exists public.eventos cascade;
drop table if exists public.visibilidade cascade;

-- ---------------------------------------------------------------------
-- 2. Perfis: só três papéis
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_papel_check;
update public.profiles set papel = 'corretor' where papel not in ('admin','gestor','corretor');
alter table public.profiles add constraint profiles_papel_check check (papel in ('admin','gestor','corretor'));
alter table public.profiles add column if not exists ultimo_acesso timestamptz;

create or replace function public.is_interno() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.meu_papel() = 'admin', false)
$$;

-- ---------------------------------------------------------------------
-- 3. Projetos: campos de conteúdo comercial
-- ---------------------------------------------------------------------
alter table public.lancamentos add column if not exists resumo text;
alter table public.lancamentos add column if not exists destaques text;
alter table public.lancamentos add column if not exists ficha text;
alter table public.lancamentos add column if not exists entrega text;
alter table public.lancamentos add column if not exists preco_desde text;
alter table public.lancamentos add column if not exists comissao text;
alter table public.lancamentos add column if not exists aviso text;
alter table public.lancamentos add column if not exists tabela_url text;

-- ---------------------------------------------------------------------
-- 4. Atividade dos parceiros (o que cada um abre, baixa, envia, estuda)
-- ---------------------------------------------------------------------
create table if not exists public.atividades (
  id bigserial primary key,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null,
  lancamento_id text references public.lancamentos(id) on delete set null,
  detalhe text,
  criado_em timestamptz not null default now()
);
create index if not exists atividades_usuario_idx on public.atividades (usuario_id, criado_em desc);
create index if not exists atividades_data_idx on public.atividades (criado_em desc);

create or replace function public.registrar_atividade(p_tipo text, p_lancamento text default null, p_detalhe text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() is null then return; end if;
  if p_tipo not in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte','copiou_texto','usou_argumento') then
    raise exception 'Tipo de atividade inválido';
  end if;
  insert into atividades (usuario_id, tipo, lancamento_id, detalhe) values (auth.uid(), p_tipo, nullif(p_lancamento,''), left(p_detalhe, 200));
end $$;

create or replace function public.registrar_presenca()
returns void language sql security definer set search_path = public as $$
  update profiles set ultimo_acesso = now() where id = auth.uid()
$$;

-- Envio de kit vira atividade
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
  insert into links (token, corretor_id, imobiliaria_id, lancamento_id, tese) values (t, auth.uid(), v_imob, p_lancamento, p_tese);
  insert into atividades (usuario_id, tipo, lancamento_id, detalhe) values (auth.uid(), 'enviou_kit', p_lancamento, p_tese);
  return t;
end $$;

-- Cliente abrindo o link vira atividade do corretor
create or replace function public.abrir_link(p_token text, p_user_agent text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; k links;
begin
  select * into k from links where token = p_token;
  if k.token is null then return null; end if;
  select jsonb_build_object(
    'lancamento', jsonb_build_object('id', l.id, 'nome', l.nome, 'local', l.local, 'fase', l.fase, 'tags', l.tags,
       'cor1', l.cor1, 'cor2', l.cor2, 'arte_feed_url', l.arte_feed_url, 'arte_stories_url', l.arte_stories_url,
       'drive_url', l.drive_url, 'youtube_url', l.youtube_url, 'resumo', l.resumo, 'entrega', l.entrega),
    'corretor', jsonb_build_object('nome', p.nome, 'whatsapp', p.whatsapp),
    'imobiliaria', i.nome, 'tese', k.tese)
  into r
  from lancamentos l join profiles p on p.id = k.corretor_id
  left join imobiliarias i on i.id = k.imobiliaria_id
  where l.id = k.lancamento_id;
  if not exists (select 1 from acessos a where a.token = p_token and a.user_agent is not distinct from left(p_user_agent,300)
                 and a.criado_em > now() - interval '30 minutes') then
    insert into acessos (token, user_agent) values (p_token, left(p_user_agent, 300));
    insert into atividades (usuario_id, tipo, lancamento_id) values (k.corretor_id, 'cliente_abriu', k.lancamento_id);
  end if;
  return r;
end $$;

-- Aula concluída vira atividade
create or replace function public.ao_concluir_aula() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into atividades (usuario_id, tipo, detalhe)
  select new.usuario_id, 'concluiu_aula', a.titulo from aulas a where a.id = new.aula_id;
  return new;
end $$;
drop trigger if exists ao_concluir_aula on public.progresso_aulas;
create trigger ao_concluir_aula after insert on public.progresso_aulas for each row execute function public.ao_concluir_aula();

-- Quiz vira atividade
create or replace function public.ao_responder_quiz() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into atividades (usuario_id, tipo, detalhe)
  select new.usuario_id, case when new.aprovado then 'certificou' else 'fez_quiz' end, t.titulo from trilhas t where t.id = new.trilha_id;
  return new;
end $$;
drop trigger if exists ao_responder_quiz on public.tentativas_quiz;
create trigger ao_responder_quiz after insert on public.tentativas_quiz for each row execute function public.ao_responder_quiz();

-- ---------------------------------------------------------------------
-- 5. Negócios (registro simples de propostas e vendas)
-- ---------------------------------------------------------------------
create table if not exists public.negocios (
  id bigint generated by default as identity (start with 101) primary key,
  corretor_id uuid not null references public.profiles(id) on delete cascade,
  imobiliaria_id uuid references public.imobiliarias(id) on delete set null,
  cliente text not null,
  contato text,
  lancamento_id text references public.lancamentos(id) on delete set null,
  unidade text,
  valor numeric(14,2),
  status text not null default 'em_negociacao'
    check (status in ('em_negociacao','proposta_enviada','aprovada','vendida','perdida')),
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create or replace function public.ao_mudar_negocio() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.imobiliaria_id := coalesce(new.imobiliaria_id, (select imobiliaria_id from profiles where id = new.corretor_id));
    return new;
  end if;
  new.atualizado_em := now();
  return new;
end $$;
drop trigger if exists ao_mudar_negocio on public.negocios;
create trigger ao_mudar_negocio before insert or update on public.negocios for each row execute function public.ao_mudar_negocio();

create or replace function public.registrar_negocio_atividade() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into atividades (usuario_id, tipo, lancamento_id, detalhe)
    values (new.corretor_id, 'negocio_' || new.status, new.lancamento_id, new.cliente);
  end if;
  return new;
end $$;
drop trigger if exists registrar_negocio_atividade on public.negocios;
create trigger registrar_negocio_atividade after insert or update on public.negocios for each row execute function public.registrar_negocio_atividade();

-- ---------------------------------------------------------------------
-- 6. Cadastro simplificado: corretor ou dono de imobiliária
-- ---------------------------------------------------------------------
create or replace function public.ao_criar_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_perfil text := coalesce(m->>'perfil', 'corretor');
  v_papel text := 'corretor'; v_tipo text := 'autonomo'; v_status text := 'PENDENTE_APROVACAO';
  v_imob uuid := nullif(m->>'imobiliaria_id','')::uuid;
  v_imob_nome text := nullif(trim(coalesce(m->>'imobiliaria_nome','')), '');
  v_nome text := coalesce(nullif(trim(m->>'nome'),''), split_part(new.email,'@',1));
begin
  if v_imob is null and v_imob_nome is not null then
    select id into v_imob from imobiliarias where lower(nome) = lower(v_imob_nome) limit 1;
    if v_imob is null then
      insert into imobiliarias (nome, cidade, situacao, contato) values (v_imob_nome, nullif(m->>'cidade',''), 'em_negociacao', v_nome)
      returning id into v_imob;
    end if;
  end if;
  if v_perfil = 'gestor' then v_papel := 'gestor'; v_tipo := 'pj';
  elsif v_imob is not null then v_tipo := 'vinculado'; end if;

  if exists (select 1 from hub_admins_iniciais a where lower(a.email) = lower(new.email)) then
    v_papel := 'admin'; v_tipo := 'interno'; v_status := 'ATIVO';
  end if;

  insert into profiles (id, nome, email, tipo, papel, whatsapp, creci, uf, imobiliaria_id, status)
  values (new.id, v_nome, new.email, v_tipo, v_papel, m->>'whatsapp', m->>'creci', m->>'uf', v_imob, v_status)
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.imobiliarias_para_vinculo()
returns table (id uuid, nome text, cidade text)
language sql stable security definer set search_path = public as $$
  select id, nome, cidade from imobiliarias
  where ativa_no_hub or situacao in ('treinada','parceira')
  order by nome
$$;

-- ---------------------------------------------------------------------
-- 7. Gestão de parceiros (somente administrador)
-- ---------------------------------------------------------------------
create or replace function public.decidir_acesso(p_usuario uuid, p_aprovar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare alvo profiles;
begin
  if not tem_papel('admin') then raise exception 'Somente o administrador libera acessos'; end if;
  select * into alvo from profiles where id = p_usuario;
  if alvo.id is null then raise exception 'Usuário não encontrado'; end if;
  if alvo.id = auth.uid() then raise exception 'Você não pode alterar o seu próprio acesso'; end if;
  update profiles set status = case when p_aprovar then 'ATIVO' else 'REJEITADO' end, aprovado_por = auth.uid(), aprovado_em = now()
  where id = p_usuario;
  if p_aprovar and alvo.imobiliaria_id is not null then
    update imobiliarias set ativa_no_hub = true,
      situacao = case when situacao in ('prospect','em_negociacao') then 'parceira' else situacao end
    where id = alvo.imobiliaria_id;
  end if;
end $$;

create or replace function public.editar_parceiro(p_usuario uuid, p_papel text, p_imobiliaria uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not tem_papel('admin') then raise exception 'Somente o administrador edita parceiros'; end if;
  if p_usuario = auth.uid() then raise exception 'Você não pode alterar o seu próprio perfil'; end if;
  if p_papel not in ('gestor','corretor') then raise exception 'Perfil inválido'; end if;
  update profiles set papel = p_papel, imobiliaria_id = p_imobiliaria,
    tipo = case when p_papel = 'gestor' then 'pj' when p_imobiliaria is null then 'autonomo' else 'vinculado' end
  where id = p_usuario;
end $$;

-- Painel do administrador
create or replace function public.painel_admin()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not tem_papel('admin') then raise exception 'Sem permissão'; end if;
  return jsonb_build_object(
    'parceiros', (select count(*) from profiles where status = 'ATIVO' and papel <> 'admin'),
    'pendentes', (select count(*) from profiles where status = 'PENDENTE_APROVACAO'),
    'ativos_7d', (select count(*) from profiles where status = 'ATIVO' and papel <> 'admin' and ultimo_acesso > now() - interval '7 days'),
    'imobiliarias', (select count(*) from imobiliarias i where exists (select 1 from profiles p where p.imobiliaria_id = i.id and p.status = 'ATIVO')),
    'envios', (select count(*) from links),
    'envios_7d', (select count(*) from links where criado_em > now() - interval '7 days'),
    'aberturas', (select count(*) from acessos),
    'materiais_7d', (select count(*) from atividades where tipo in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte','copiou_texto','usou_argumento') and criado_em > now() - interval '7 days'),
    'aulas', (select count(*) from progresso_aulas),
    'certificados', (select count(*) from (select distinct usuario_id, trilha_id from tentativas_quiz where aprovado) x),
    'em_treinamento', (select count(distinct usuario_id) from progresso_aulas),
    'negocios_abertos', (select count(*) from negocios where status in ('em_negociacao','proposta_enviada','aprovada')),
    'vendas', (select count(*) from negocios where status = 'vendida'),
    'vgv_aberto', (select coalesce(sum(valor),0) from negocios where status in ('em_negociacao','proposta_enviada','aprovada')),
    'vgv_vendido', (select coalesce(sum(valor),0) from negocios where status = 'vendida')
  );
end $$;

-- Uma linha por parceiro com tudo o que ele fez
create or replace function public.resumo_parceiros(p_imob uuid default null)
returns table (id uuid, nome text, email text, whatsapp text, creci text, papel text, status text,
               imobiliaria_id uuid, imobiliaria text, criado_em timestamptz, ultimo_acesso timestamptz,
               materiais bigint, envios bigint, aberturas bigint, aulas bigint, certificados bigint, trilhas_total bigint,
               negocios bigint, vendas bigint, ultima_atividade timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (tem_papel('admin') or (meu_papel() = 'gestor' and p_imob is not null and p_imob = minha_imob())) then
    raise exception 'Sem permissão';
  end if;
  return query
  select p.id, p.nome, p.email, p.whatsapp, p.creci, p.papel, p.status, p.imobiliaria_id, i.nome, p.criado_em, p.ultimo_acesso,
    (select count(*) from atividades a where a.usuario_id = p.id and a.tipo in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte','copiou_texto','usou_argumento')),
    (select count(*) from links k where k.corretor_id = p.id),
    (select count(*) from acessos x join links k on k.token = x.token where k.corretor_id = p.id),
    (select count(*) from progresso_aulas g where g.usuario_id = p.id),
    (select count(distinct t.trilha_id) from tentativas_quiz t where t.usuario_id = p.id and t.aprovado),
    (select count(*) from trilhas t where t.publicada),
    (select count(*) from negocios n where n.corretor_id = p.id),
    (select count(*) from negocios n where n.corretor_id = p.id and n.status = 'vendida'),
    (select max(a.criado_em) from atividades a where a.usuario_id = p.id)
  from profiles p left join imobiliarias i on i.id = p.imobiliaria_id
  where p.papel <> 'admin' and (p_imob is null or p.imobiliaria_id = p_imob)
  order by p.status = 'PENDENTE_APROVACAO' desc, coalesce((select max(a.criado_em) from atividades a where a.usuario_id = p.id), p.criado_em) desc;
end $$;

-- Linha do tempo de atividade (admin vê tudo; gestor vê a equipe; corretor vê a sua)
create or replace function public.linha_do_tempo(p_usuario uuid default null, p_limite int default 60)
returns table (id bigint, usuario_id uuid, nome text, imobiliaria text, tipo text, lancamento text, detalhe text, criado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare eu text := meu_papel(); imob uuid := minha_imob();
begin
  if eu is null then raise exception 'Sem permissão'; end if;
  return query
  select a.id, a.usuario_id, p.nome, i.nome, a.tipo, l.nome, a.detalhe, a.criado_em
  from atividades a join profiles p on p.id = a.usuario_id
  left join imobiliarias i on i.id = p.imobiliaria_id
  left join lancamentos l on l.id = a.lancamento_id
  where (p_usuario is null or a.usuario_id = p_usuario)
    and (eu = 'admin' or a.usuario_id = auth.uid() or (eu = 'gestor' and p.imobiliaria_id = imob))
  order by a.criado_em desc
  limit least(coalesce(p_limite, 60), 300);
end $$;

-- Números do parceiro
create or replace function public.meus_numeros()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'envios', (select count(*) from links where corretor_id = auth.uid()),
    'aberturas', (select count(*) from acessos x join links k on k.token = x.token where k.corretor_id = auth.uid()),
    'negocios', (select count(*) from negocios where corretor_id = auth.uid() and status in ('em_negociacao','proposta_enviada','aprovada')),
    'vendas', (select count(*) from negocios where corretor_id = auth.uid() and status = 'vendida')
  )
$$;

-- ---------------------------------------------------------------------
-- 8. Regras de acesso das tabelas novas e ajustes
-- ---------------------------------------------------------------------
alter table public.atividades enable row level security;
alter table public.negocios enable row level security;

drop policy if exists atv_ler on public.atividades;
create policy atv_ler on public.atividades for select to authenticated
  using (usuario_id = auth.uid() or tem_papel('admin'));

drop policy if exists neg_ler on public.negocios;
drop policy if exists neg_criar on public.negocios;
drop policy if exists neg_editar on public.negocios;
drop policy if exists neg_apagar on public.negocios;
create policy neg_ler on public.negocios for select to authenticated
  using (corretor_id = auth.uid() or tem_papel('admin') or (meu_papel() = 'gestor' and imobiliaria_id = minha_imob()));
create policy neg_criar on public.negocios for insert to authenticated
  with check (corretor_id = auth.uid() and meu_papel() is not null);
create policy neg_editar on public.negocios for update to authenticated
  using (corretor_id = auth.uid() or tem_papel('admin')) with check (corretor_id = auth.uid() or tem_papel('admin'));
create policy neg_apagar on public.negocios for delete to authenticated
  using (corretor_id = auth.uid() or tem_papel('admin'));

-- avisos: só o administrador publica e apaga
drop policy if exists com_gravar on public.comunicados;
drop policy if exists com_apagar on public.comunicados;
create policy com_gravar on public.comunicados for insert to authenticated with check (tem_papel('admin'));
create policy com_apagar on public.comunicados for delete to authenticated using (tem_papel('admin'));

do $$ begin
  alter publication supabase_realtime add table public.negocios;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.atividades;
exception when others then null; end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.abrir_link(text, text) to anon, authenticated;
grant execute on function public.imobiliarias_para_vinculo() to anon, authenticated;

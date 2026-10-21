-- Academia de Vendas, Fase A2: nome do projeto no kit, página pública do cliente
-- em /p/<código> e endereço reservado. Depende das migrações A0 e A1.
--
-- O parceiro NÃO lê pc_empreendimentos (tem comissão e tabela de preço), então
-- o nome que ele e o cliente veem precisa viver no próprio kit.

begin;

alter table pc_kits add column nome text;

update pc_kits set nome = case codigo
  when 'verya' then 'Verya Jardins'
  when 'vici' then 'Vici Faria Lima'
  when 'pina' then 'Pina 1875 by 360 Suítes'
  when 'rooftop' then 'Rooftop Perdizes'
  when 'blue' then 'Blue Park'
  when 'full' then 'Full Jardim São Paulo'
  when 'vip' then 'VIP Vila Prudente'
end
where nome is null;

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
  v_nome_emp := coalesce(k.nome, v_nome_emp);
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

grant execute on function pc_abrir_envio(text, text) to anon, authenticated;

-- "p" é o prefixo das páginas de projeto enviadas aos clientes (materimob.com.br/p/...).
create or replace function valida_subdominio_reservado()
returns trigger
language plpgsql
as $$
begin
  if new.slug is not null and lower(new.slug) in
    ('app','admin','entrar','convite','c','r','p','cliente','registrar','parceria','academia') then
    raise exception 'esse endereço é reservado pelo próprio Materimob';
  end if;
  return new;
end;
$$;

commit;

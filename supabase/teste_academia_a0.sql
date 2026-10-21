-- Teste de permissões e regras da Academia (fase A0), rodando como cada papel.
--
--   npx supabase db query --linked --file supabase/teste_academia_a0.sql
--
-- Pré-requisito: migrations_academia_a0_1 a a0_4 aplicadas.
--
-- Não grava nada: o bloco termina SEMPRE com uma exceção, que desfaz tudo
-- (inclusive os usuários de teste, que são só UUIDs soltos: as chaves para
-- auth.users das tabelas novas são removidas DENTRO da transação). O resultado
-- vem na mensagem do erro: linhas "OK" e "FALHOU".
--
-- Não toca em nenhuma parceira com status_funil/validado alterado, para não
-- disparar o gatilho que fala com o Leadlinks (chamada HTTP real, que não
-- se desfaz com rollback).

create temp table t_res (nome text, ok boolean);

create function pg_temp.chk(p_nome text, p_ok boolean) returns void
language sql as $f$ insert into t_res values (p_nome, coalesce(p_ok, false)) $f$;

create function pg_temp.login(p uuid) returns void
language plpgsql as $f$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', p::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $f$;

do $teste$
declare
  m uuid; p1 uuid; p2 uuid;
  ua uuid := gen_random_uuid();  -- corretor da imobiliária p1
  ub uuid := gen_random_uuid();  -- corretor da imobiliária p2
  ug uuid := gen_random_uuid();  -- gestor da imobiliária p1
  uc uuid := gen_random_uuid();  -- pediu com nome de imobiliária que não está na lista
  ud uuid := gen_random_uuid();  -- ninguém: nunca pediu acesso
  n bigint; n2 bigint; t text; j jsonb; err text; tok text;
  emp1 uuid; emp2 uuid; emp3 uuid;
  tr1 uuid; tr2 uuid; tr3 uuid; au1 uuid; au2 uuid; au3 uuid; q1 uuid; q2 uuid;
  arg_ok uuid; r record; v_log text;
  ue uuid := gen_random_uuid();  -- corretor autônomo (A4)
  emp_vici uuid; emp_blue uuid; reg1 uuid; b1 boolean; b2 boolean; b3 boolean;
begin
  -- ----------------------------------------------------------------
  -- Preparação (como administrador do banco)
  -- ----------------------------------------------------------------
  select owner_id into m from pc_config limit 1;
  select id into p1 from pc_parceiras where owner_id = m and status_funil = 'nao_contatado' and validado order by id limit 1;
  select id into p2 from pc_parceiras where owner_id = m and status_funil = 'nao_contatado' and validado and id <> p1 order by id limit 1;
  if m is null or p1 is null or p2 is null then
    raise exception 'Preparação falhou: sem dono do canal ou sem 2 parceiras não contatadas';
  end if;

  for r in
    select (select relname from pg_class where oid = conrelid) as tbl, conname
    from pg_constraint
    where contype = 'f' and confrelid = 'auth.users'::regclass
      and (select relname from pg_class where oid = conrelid) in
          ('pc_acessos','pc_atividades','pc_envios','pc_progresso_aulas','pc_quiz_tentativas','pc_certificacoes','pc_argumentos','pc_config')
  loop
    execute format('alter table %I drop constraint %I', r.tbl, r.conname);
  end loop;

  update pc_parceiras set ativa_na_academia = true where id in (p1, p2);

  -- ----------------------------------------------------------------
  -- A0.1  Acesso
  -- ----------------------------------------------------------------
  reset role; perform pg_temp.login(ua);
  perform pc_solicitar_acesso('Ana', '11 99999-0001', '111', 'corretor', p1, null);
  reset role; perform pg_temp.login(ub);
  perform pc_solicitar_acesso('Bruno', '11 99999-0002', '222', 'corretor', p2, null);
  reset role; perform pg_temp.login(ug);
  perform pc_solicitar_acesso('Gabi', '11 99999-0003', '333', 'gestor', p1, null);
  reset role; perform pg_temp.login(uc);
  perform pc_solicitar_acesso('Carlos', '11 99999-0004', null, 'corretor', null, 'Imobiliária Nova XYZ');

  reset role; perform pg_temp.login(ud);
  begin perform pc_solicitar_acesso('Dani', null, null, 'corretor', gen_random_uuid(), null); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.login(ud);
  begin perform pc_solicitar_acesso('Dani', null, null, 'gestor', null, null); err := coalesce(err, '') || '|' ;
  exception when others then err := coalesce(err, '') || '|' || sqlerrm; end;
  reset role;
  perform pg_temp.chk('A0.1 imobiliária fora da lista de ativas é recusada', err like '%Imobiliária não encontrada%');
  perform pg_temp.chk('A0.1 gestor sem imobiliária é recusado', err like '%gestor%');

  reset role; perform pg_temp.login(ua);
  begin perform pc_solicitar_acesso('Ana', null, null, 'corretor', p1, null); err := null;
  exception when others then err := sqlerrm; end;
  reset role;
  perform pg_temp.chk('A0.1 pedido duplicado é recusado', err like '%já tem um pedido%');

  select status::text into t from pc_acessos where user_id = ua;
  perform pg_temp.chk('A0.1 pedido nasce pendente', t = 'pendente');

  select validado, ativa_na_academia, origem into r from pc_parceiras where nome_fantasia = 'Imobiliária Nova XYZ' and owner_id = m;
  perform pg_temp.chk('A0.1 nome digitado vira cadastro NÃO validado, fora da lista', r.validado = false and r.ativa_na_academia = false and r.origem = 'autocadastro_academia');

  reset role; perform pg_temp.login(ua);
  select pc_tem_acesso()::text into t;
  select count(*) into n from pc_acessos;
  update pc_acessos set status = 'liberado' where user_id = ua;
  get diagnostics n = row_count;
  begin perform pc_decidir_acesso(ua, 'liberado'); err := null; exception when others then err := sqlerrm; end;
  reset role;
  select status::text into t from pc_acessos where user_id = ua;
  perform pg_temp.chk('A0.1 corretor pendente não se libera por UPDATE', n = 0 and t = 'pendente');
  perform pg_temp.chk('A0.1 corretor pendente não se libera pela função', err like '%Somente o administrador%');

  reset role; perform pg_temp.login(m);
  perform pc_decidir_acesso(ua, 'liberado');
  perform pc_decidir_acesso(ub, 'liberado');
  perform pc_decidir_acesso(ug, 'liberado');
  perform pc_decidir_acesso(uc, 'liberado');
  reset role;
  select count(*) into n from pc_acessos where user_id in (ua, ub, ug, uc) and status = 'liberado' and corretor_id is not null;
  perform pg_temp.chk('A0.1 dono libera e o corretor é ligado ao cadastro da parceira', n = 4);
  select count(*) into n from pc_parceira_corretores c join pc_acessos a on a.corretor_id = c.id
    where a.user_id = ua and c.parceira_id = p1 and c.owner_id = m;
  perform pg_temp.chk('A0.1 cadastro de corretor criado na imobiliária certa, do dono do canal', n = 1);
  select count(*) into n from pc_parceiras where nome_fantasia = 'Imobiliária Nova XYZ' and validado = false;
  perform pg_temp.chk('A0.1 liberar não valida nem promove a imobiliária', n = 1);

  reset role; perform pg_temp.login(ua); select count(*) into n from pc_acessos;
  reset role; perform pg_temp.chk('A0.1 corretor vê só o próprio acesso', n = 1);
  reset role; perform pg_temp.login(ub); select count(*) into n from pc_acessos;
  reset role; perform pg_temp.chk('A0.1 corretor de outra imobiliária também vê só o próprio', n = 1);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_acessos;
  reset role; perform pg_temp.chk('A0.1 gestor vê a própria equipe (2) e não a de outra imobiliária', n = 2);
  reset role; perform pg_temp.login(m); select count(*) into n from pc_acessos where user_id in (ua, ub, ug, uc);
  reset role; perform pg_temp.chk('A0.1 dono vê todos', n = 4);
  reset role; perform pg_temp.login(ud); select count(*) into n from pc_acessos;
  reset role; perform pg_temp.chk('A0.1 quem nunca pediu acesso não vê ninguém', n = 0);

  reset role; perform pg_temp.login(ud);
  begin
    insert into pc_acessos (user_id, owner_id, status, papel, parceira_id, nome)
    values (ud, ud, 'liberado', 'gestor', p1, 'Invasor'); err := null;
  exception when others then err := sqlerrm; end;
  reset role;
  select count(*) into n from pc_acessos where user_id = ud;
  perform pg_temp.chk('A0.1 usuário comum NÃO cria o próprio acesso liberado', err is not null and n = 0);
  reset role; perform pg_temp.login(ud);
  begin
    insert into pc_config (owner_id) values (ud); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.login(ud);
  select pc_sou_dono_do_canal()::text into t;
  reset role; perform pg_temp.chk('A0.1 usuário comum não é dono do canal, mesmo com linha própria em pc_config', t = 'false');

  reset role; perform pg_temp.login(ua); select count(*) into n from pc_parceiras;
  reset role; perform pg_temp.chk('A0.1 corretor não lê pc_parceiras (tem token e comissão)', n = 0);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_empreendimentos;
  reset role; perform pg_temp.chk('A0.1 corretor não lê pc_empreendimentos (tem comissão e tabela)', n = 0);

  reset role; perform pg_temp.login(ug);
  begin perform pc_decidir_acesso(ub, 'bloqueado'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.1 gestor não libera nem bloqueia ninguém', err like '%Somente o administrador%');

  reset role; perform pg_temp.login(ud); select count(*) into n from pc_parceiras_para_vinculo() where nome_fantasia = 'Imobiliária Nova XYZ';
  select count(*) into n2 from pc_parceiras_para_vinculo();
  reset role; perform pg_temp.chk('A0.1 lista de cadastro mostra só ativas e validadas', n = 0 and n2 >= 2);
  select count(*) into n from pc_parceiras_para_vinculo() v join pc_parceiras p on p.id = v.id where p.owner_id <> m;
  perform pg_temp.chk('A0.1 lista de cadastro só traz imobiliárias do dono do canal', n = 0);

  reset role; perform pg_temp.login(ua); select pc_meu_acesso() into j;
  reset role; perform pg_temp.chk('A0.1 pc_meu_acesso devolve status e imobiliária', j->>'status' = 'liberado' and j->>'papel' = 'corretor' and j->>'parceira_id' = p1::text);

  reset role; set local role anon;
  begin perform pc_meu_acesso(); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.1 visitante sem login não executa as funções do canal', err like '%permission denied%');

  reset role; perform pg_temp.login(m); perform pc_decidir_acesso(ub, 'bloqueado');
  reset role; reset role; perform pg_temp.login(ub); select pc_tem_acesso()::text into t;
  reset role; perform pg_temp.chk('A0.1 bloqueado perde o acesso na hora', t = 'false');
  reset role; perform pg_temp.login(m); perform pc_decidir_acesso(ub, 'liberado');

  reset role; perform pg_temp.login(m); perform pc_editar_acesso(uc, 'corretor', p2);
  reset role;
  select count(*) into n from pc_acessos where user_id = uc and parceira_id = p2 and corretor_id is not null;
  perform pg_temp.chk('A0.1 trocar a imobiliária religa o cadastro do corretor', n = 1);

  reset role; perform pg_temp.login(ua); perform pc_registrar_presenca();
  reset role; perform pg_temp.login(m); perform pc_registrar_presenca();
  reset role;
  select count(*) into n from pc_acessos where user_id = ua and ultimo_acesso is not null;
  perform pg_temp.chk('A0.1 último acesso registrado para o corretor', n = 1);

  -- ----------------------------------------------------------------
  -- A0.2  Conteúdo (dados de teste, desfeitos no fim)
  -- ----------------------------------------------------------------
  select id into emp1 from pc_empreendimentos where owner_id = m and id not in (select empreendimento_id from pc_kits) order by id limit 1;
  select id into emp2 from pc_empreendimentos where owner_id = m and id not in (select empreendimento_id from pc_kits) and id <> emp1 order by id limit 1;
  select id into emp3 from pc_empreendimentos where owner_id = m and id not in (select empreendimento_id from pc_kits) and id not in (emp1, emp2) order by id limit 1;
  if emp1 is null or emp2 is null or emp3 is null then
    raise exception 'Preparação falhou: preciso de 3 empreendimentos sem kit';
  end if;

  insert into pc_kits (owner_id, empreendimento_id, codigo, nome, textos_whatsapp, resumo, comissao_texto, preco_desde, publicado, drive_url, local_texto)
  values (m, emp1, 'teste-kit-1', 'Nome Kit Teste', '{"investimento":"Olá [Nome do Cliente]"}', 'Resumo teste', 'PF 2%', 'a partir de R$ 1', true, 'https://exemplo.test/book', 'Local teste');
  insert into pc_kits (owner_id, empreendimento_id, codigo, textos_whatsapp, publicado)
  values (m, emp2, 'teste-kit-2', '{"investimento":"x"}', false);

  insert into pc_trilhas (owner_id, titulo, publico, nota_minima, publicada) values (m, 'Teste trilha geral', 'todos', 70, true) returning id into tr1;
  insert into pc_trilhas (owner_id, titulo, publico, nota_minima, publicada) values (m, 'Teste trilha gestor', 'gestor', 70, true) returning id into tr2;
  insert into pc_trilhas (owner_id, titulo, publico, nota_minima, publicada) values (m, 'Teste trilha rascunho', 'todos', 70, false) returning id into tr3;
  insert into pc_aulas (owner_id, trilha_id, tipo, ordem, titulo) values (m, tr1, 'leitura', 1, 'Teste aula 1') returning id into au1;
  insert into pc_aulas (owner_id, trilha_id, tipo, ordem, titulo) values (m, tr1, 'leitura', 2, 'Teste aula 2') returning id into au2;
  insert into pc_aulas (owner_id, trilha_id, tipo, ordem, titulo) values (m, tr2, 'leitura', 1, 'Teste aula gestor') returning id into au3;
  insert into pc_quiz_perguntas (owner_id, trilha_id, ordem, enunciado, opcoes) values (m, tr1, 1, 'Teste P1', '["a","b","c"]') returning id into q1;
  insert into pc_quiz_perguntas (owner_id, trilha_id, ordem, enunciado, opcoes) values (m, tr1, 2, 'Teste P2', '["a","b","c"]') returning id into q2;
  insert into pc_quiz_gabarito (owner_id, pergunta_id, correta, explicacao) values (m, q1, 1, 'porque b'), (m, q2, 0, 'porque a');

  insert into pc_argumentos (owner_id, etapa, titulo, texto, status) values (m, 'objecao', 'Teste arg publicada', 't', 'publicada') returning id into arg_ok;
  insert into pc_argumentos (owner_id, etapa, titulo, texto, status) values (m, 'objecao', 'Teste arg arquivada', 't', 'arquivada');
  insert into pc_avisos (owner_id, titulo, publico, ativo) values (m, 'Teste aviso todos', 'todos', true), (m, 'Teste aviso gestores', 'gestores', true), (m, 'Teste aviso inativo', 'todos', false);

  reset role; perform pg_temp.login(ud);
  select count(*) into n from pc_kits; select n + count(*) into n from pc_trilhas; select n + count(*) into n from pc_argumentos; select n + count(*) into n from pc_avisos;
  reset role; perform pg_temp.chk('A0.2 quem não tem acesso não lê nenhum conteúdo', n = 0);

  reset role; perform pg_temp.login(ua);
  select count(*) into n from pc_kits where codigo like 'teste-kit%';
  reset role; perform pg_temp.chk('A0.2 corretor lê só kit publicado', n = 1);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_trilhas where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 corretor lê só trilha publicada do próprio perfil', n = 1);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_aulas where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 corretor lê só aula de trilha visível', n = 2);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_quiz_perguntas where enunciado like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 corretor lê as perguntas do quiz', n = 2);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_quiz_gabarito;
  reset role; perform pg_temp.chk('A0.2 corretor NÃO lê o gabarito do quiz', n = 0);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_argumentos where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 corretor lê só argumento publicado', n = 1);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_avisos where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 corretor lê só aviso ativo do próprio perfil', n = 1);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_trilhas where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 gestor também lê a trilha de gestor', n = 2);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_avisos where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 gestor lê o aviso de gestores', n = 2);
  reset role; perform pg_temp.login(ub); select count(*) into n from pc_kits where codigo like 'teste-kit%';
  reset role; perform pg_temp.chk('A0.2 corretor de outra imobiliária lê o mesmo conteúdo do canal', n = 1);
  reset role; perform pg_temp.login(m); select count(*) into n from pc_quiz_gabarito where pergunta_id in (q1, q2);
  select n + count(*) into n from pc_trilhas where titulo like 'Teste%';
  reset role; perform pg_temp.chk('A0.2 dono lê tudo, inclusive gabarito e rascunho', n = 5);

  reset role; perform pg_temp.login(ua);
  begin
    insert into pc_kits (owner_id, empreendimento_id, codigo) values (ua, emp3, 'invasor'); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.2 corretor não grava conteúdo', err is not null);

  -- ----------------------------------------------------------------
  -- A0.3  Atividade, envio e treinamento
  -- ----------------------------------------------------------------
  reset role; perform pg_temp.login(ua);
  perform pc_registrar_atividade('abriu_projeto', emp1, 'x');
  begin perform pc_registrar_atividade('enviou_kit', emp1, 'x'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 tipo que não é do app é recusado', err like '%inválido%');
  reset role; perform pg_temp.login(ua);
  begin perform pc_registrar_atividade('inventado', emp1, 'x'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 tipo inventado é recusado', err like '%inválido%');

  reset role; perform pg_temp.login(m); perform pc_registrar_atividade('abriu_projeto', emp1, 'x');
  reset role;
  select count(*) into n from pc_atividades where user_id = m;
  perform pg_temp.chk('A0.3 o Marcos não gera atividade', n = 0);

  reset role; perform pg_temp.login(ua);
  begin insert into pc_atividades (owner_id, user_id, tipo) values (m, ua, 'abriu_book'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 ninguém escreve atividade direto na tabela', err is not null);

  reset role; perform pg_temp.login(ub); perform pc_registrar_atividade('abriu_book', emp1, 'y');
  reset role; perform pg_temp.login(ub); select count(*) into n from pc_atividades where user_id = ua;
  reset role; perform pg_temp.chk('A0.3 corretor não vê atividade de outro corretor', n = 0);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_atividades where user_id = ua;
  select count(*) into n from pc_atividades where user_id = ub;
  reset role; perform pg_temp.chk('A0.3 gestor não vê atividade de outra imobiliária', n = 0);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_atividades where user_id = ua;
  reset role; perform pg_temp.chk('A0.3 gestor vê a atividade da própria equipe', n >= 1);

  reset role; perform pg_temp.login(ua);
  tok := pc_criar_envio(emp1, 'investimento', 'Cliente X');
  reset role; perform pg_temp.chk('A0.3 envio devolve link curto', length(tok) = 12);
  select count(*) into n from pc_atividades where user_id = ua and tipo = 'enviou_kit';
  perform pg_temp.chk('A0.3 envio gera atividade enviou_kit', n = 1);

  reset role; perform pg_temp.login(ua);
  begin perform pc_criar_envio(emp3, 'investimento'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 envio de projeto sem kit é recusado', err like '%indisponível%');
  reset role; perform pg_temp.login(ua);
  begin perform pc_criar_envio(emp1, 'tese_inexistente'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 envio de opção inexistente é recusado', err like '%indisponível%');
  reset role; perform pg_temp.login(ua);
  begin perform pc_criar_envio(emp2, 'investimento'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 envio de kit não publicado é recusado', err like '%indisponível%');
  reset role; perform pg_temp.login(ud);
  begin perform pc_criar_envio(emp1, 'investimento'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 quem não tem acesso não envia', err like '%Acesso não liberado%');

  reset role; perform pg_temp.login(ub); select count(*) into n from pc_envios where user_id = ua;
  reset role; perform pg_temp.chk('A0.3 corretor de outra imobiliária não vê o envio', n = 0);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_envios where user_id = ua;
  reset role; perform pg_temp.chk('A0.3 gestor vê o envio da equipe', n = 1);

  reset role; set local role anon;
  select pc_abrir_envio(tok, 'Aparelho 1') into j;
  reset role;
  perform pg_temp.chk('A0.3 cliente abre o link sem login e vê o projeto', j->'projeto'->>'resumo' = 'Resumo teste' and j->'corretor'->>'nome' = 'Ana');
  perform pg_temp.chk('A2 página do cliente usa o nome do kit, não o do empreendimento', j->'projeto'->>'nome' = 'Nome Kit Teste');
  perform pg_temp.chk('A0.3 página do cliente mostra o WhatsApp do corretor', j->'corretor'->>'whatsapp' = '11 99999-0001');
  perform pg_temp.chk('A0.3 página do cliente NÃO traz comissão nem preço', not (j->'projeto' ? 'comissao_texto') and not (j->'projeto' ? 'preco_desde') and not (j ? 'comissao'));
  reset role; set local role anon;
  perform pc_abrir_envio(tok, 'Aparelho 1');
  reset role;
  select count(*) into n from pc_aberturas where token = tok;
  perform pg_temp.chk('A0.3 mesma abertura em 30 min no mesmo aparelho conta uma vez', n = 1);
  reset role; set local role anon;
  perform pc_abrir_envio(tok, 'Aparelho 2');
  reset role;
  select count(*) into n from pc_atividades where user_id = ua and tipo = 'cliente_abriu';
  perform pg_temp.chk('A0.3 aparelho diferente gera nova atividade cliente_abriu', n = 2);
  reset role; set local role anon;
  select pc_abrir_envio('naoexiste123', 'x') into j;
  reset role; perform pg_temp.chk('A0.3 link inexistente devolve nada', j is null);

  reset role; perform pg_temp.login(ua); perform pc_concluir_aula(au1);
  reset role; reset role; perform pg_temp.login(ua);
  select count(*) into n from pc_minha_academia() where trilha_id = tr1 and aulas_feitas = 1 and aulas_total = 2 and not certificado;
  reset role; perform pg_temp.chk('A0.3 progresso da trilha aparece para o corretor', n = 1);

  reset role; perform pg_temp.login(ua);
  select pc_responder_quiz(tr1, jsonb_build_object(q1::text, 0, q2::text, 0)) into j;
  reset role;
  perform pg_temp.chk('A0.3 quiz com 1 de 2 reprova (mínimo 70)', (j->>'acertos')::int = 1 and (j->>'aprovado')::boolean = false);
  perform pg_temp.chk('A0.3 correção traz a explicação de cada pergunta', jsonb_array_length(j->'correcao') = 2 and j->'correcao'->0->>'explicacao' is not null);

  reset role; perform pg_temp.login(ua); perform pc_concluir_aula(au2);
  select pc_responder_quiz(tr1, jsonb_build_object(q1::text, 1, q2::text, 0)) into j;
  reset role;
  perform pg_temp.chk('A0.3 quiz com 2 de 2 aprova e emite certificado', (j->>'aprovado')::boolean and (j->>'certificado')::boolean);
  select count(*) into n from pc_certificacoes where user_id = ua and trilha_id = tr1;
  perform pg_temp.chk('A0.3 certificado emitido uma vez', n = 1);
  reset role; perform pg_temp.login(ua); perform pc_concluir_aula(au2);
  reset role;
  select count(*) into n from pc_atividades where user_id = ua and tipo = 'concluiu_aula';
  perform pg_temp.chk('A0.3 concluir a mesma aula de novo não duplica atividade', n = 2);
  select count(*) into n from pc_atividades where user_id = ua and tipo = 'certificou';
  perform pg_temp.chk('A0.3 certificação gera atividade certificou', n = 1);

  reset role; perform pg_temp.login(ub);
  begin perform pc_concluir_aula(au3); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 corretor não conclui aula de trilha de gestor', err like '%indisponível%');
  reset role; perform pg_temp.login(ug); perform pc_concluir_aula(au3);
  reset role;
  select count(*) into n from pc_progresso_aulas where user_id = ug;
  perform pg_temp.chk('A0.3 gestor conclui aula da trilha de gestor', n = 1);
  reset role; perform pg_temp.login(ud);
  begin perform pc_responder_quiz(tr1, '{}'::jsonb); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 sem acesso não responde quiz', err like '%indisponível%');

  reset role; perform pg_temp.login(ua);
  begin insert into pc_certificacoes (owner_id, user_id, trilha_id) values (m, ua, tr2); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 ninguém se certifica direto na tabela', err is not null);

  reset role; perform pg_temp.login(ua);
  perform pc_sugerir_argumento('objecao', 'Teste sugestão A', 'texto da sugestão', null);
  select count(*) into n from pc_argumentos where titulo = 'Teste sugestão A';
  reset role; perform pg_temp.chk('A0.3 quem sugere vê a própria sugestão', n = 1);
  reset role; perform pg_temp.login(ub); select count(*) into n from pc_argumentos where titulo = 'Teste sugestão A';
  reset role; perform pg_temp.chk('A0.3 sugestão não publicada fica invisível para os outros', n = 0);
  reset role; perform pg_temp.login(ua);
  begin perform pc_sugerir_argumento('objecao', 'teste sugestão a', 'outra', null); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.3 título repetido é recusado', err like '%Já existe%');
  reset role; perform pg_temp.login(m); select status into t from pc_argumentos where titulo = 'Teste sugestão A';
  reset role; perform pg_temp.chk('A0.3 sugestão chega ao dono como "sugerida"', t = 'sugerida');

  reset role; perform pg_temp.login(ua); perform pc_usar_argumento(arg_ok);
  reset role;
  select count(*) into n from pc_argumentos where id = arg_ok and usos = 1;
  perform pg_temp.chk('A0.3 usar argumento conta o uso', n = 1);

  -- ----------------------------------------------------------------
  -- A0.4  Números e painel
  -- ----------------------------------------------------------------
  reset role; perform pg_temp.login(ua); select pc_meus_numeros() into j;
  reset role;
  perform pg_temp.chk('A0.4 meus números batem', (j->>'envios')::int = 1 and (j->>'clientes_abriram')::int = 1
    and (j->>'aulas')::int = 2 and (j->>'certificados')::int = 1 and (j->>'materiais')::int >= 2);

  reset role; perform pg_temp.login(m);
  select count(*) into n from pc_resumo_corretores() where user_id in (ua, ub, ug, uc);
  reset role; perform pg_temp.chk('A0.4 dono vê o resumo de todos', n = 4);
  reset role; perform pg_temp.login(m);
  select count(*) into n from pc_resumo_corretores(p1) where user_id in (ua, ub, ug, uc);
  reset role; perform pg_temp.chk('A0.4 dono filtra por imobiliária', n = 2);
  reset role; perform pg_temp.login(m);
  select count(*) into n from pc_resumo_corretores() where user_id = ua and envios = 1 and clientes_abriram = 1 and certificados = 1;
  reset role; perform pg_temp.chk('A0.4 resumo traz envios, aberturas e certificados do corretor', n = 1);

  reset role; perform pg_temp.login(ug);
  select count(*) into n from pc_resumo_corretores(p2) where user_id in (ua, ub, ug, uc);
  select count(*) into n from pc_resumo_corretores(p2) where parceira_id = p2;
  reset role; perform pg_temp.chk('A0.4 gestor não vê outra imobiliária mesmo pedindo', n = 0);
  reset role; perform pg_temp.login(ug);
  select count(*) into n from pc_resumo_corretores() where user_id in (ua, ug);
  reset role; perform pg_temp.chk('A0.4 gestor vê só a própria equipe', n = 2);
  reset role; perform pg_temp.login(ua);
  begin perform pc_resumo_corretores(); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.4 corretor não abre o resumo da equipe', err like '%Sem permissão%');

  reset role; perform pg_temp.login(ua); select count(*) into n from pc_linha_do_tempo(ub);
  reset role; perform pg_temp.chk('A0.4 corretor não consulta a linha do tempo de outro', n = 0);
  reset role; perform pg_temp.login(ua); select count(*) into n from pc_linha_do_tempo() where user_id <> ua;
  reset role; perform pg_temp.chk('A0.4 corretor só vê a própria linha do tempo', n = 0);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_linha_do_tempo() where user_id = ua;
  select count(*) into n2 from pc_linha_do_tempo() where user_id = ub;
  reset role; perform pg_temp.chk('A0.4 gestor vê a linha do tempo da equipe e só dela', n >= 1 and n2 = 0);
  reset role; perform pg_temp.login(m); select count(*) into n from pc_linha_do_tempo(null, 300) where user_id in (ua, ub);
  reset role; perform pg_temp.chk('A0.4 dono vê a linha do tempo de todos', n >= 2);

  reset role; perform pg_temp.login(m); select pc_painel_canal() into j;
  reset role;
  perform pg_temp.chk('A0.4 painel do canal para o dono', (j->>'corretores')::int >= 4 and (j->>'envios')::int >= 1
    and (j->>'certificados')::int >= 1 and jsonb_typeof(j->'mais_engajados') = 'array' and jsonb_typeof(j->'parados') = 'array');
  reset role; perform pg_temp.login(ug);
  begin perform pc_painel_canal(); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A0.4 painel do canal é só do dono', err like '%Sem permissão%');


  -- ----------------------------------------------------------------
  -- A4  Meus clientes
  -- ----------------------------------------------------------------
  -- A sincronização com o Leadlinks é pg_net (assíncrona); mesmo assim, no teste ela fica desligada.
  alter table pc_registros_cliente disable trigger pc_registros_cliente_sync_leadlinks;
  select empreendimento_id into emp_vici from pc_kits where codigo = 'vici';
  select empreendimento_id into emp_blue from pc_kits where codigo = 'blue';
  if emp_vici is null or emp_blue is null then
    raise exception 'Preparação falhou: faltam os kits vici e blue (rode a importação da Academia)';
  end if;

  reset role; perform pg_temp.login(ue);
  perform pc_solicitar_acesso('Eva Autônoma', '16 99999-0007', null, 'corretor', null, null);
  reset role; perform pg_temp.login(m); perform pc_decidir_acesso(ue, 'liberado');
  reset role;
  select count(*) into n from pc_acessos a join pc_parceiras p on p.id = a.parceira_id
    where a.user_id = ue and p.tipo_pessoa = 'PF' and p.validado = false and p.origem = 'autonomo_academia' and a.corretor_id is not null;
  perform pg_temp.chk('A4 autônomo liberado ganha cadastro PF não validado e é ligado a ele', n = 1);

  reset role; perform pg_temp.login(ua);
  select pc_registrar_cliente('Roberto Almeida', '(16) 99111-2200', emp_blue, 'investidor', null, null, null, 'Ribeirão Preto', 'sp', null, null, null) into j;
  reset role;
  reg1 := (j->>'id')::uuid;
  perform pg_temp.chk('A4 registro nasce pendente, com validade de 90 dias',
    j->>'status' = 'pendente' and (j->>'valido_ate')::timestamptz between now() + interval '89 days' and now() + interval '91 days');
  select count(*) into n from pc_registros_cliente rg join pc_acessos a on a.user_id = ua
    where rg.id = reg1 and rg.owner_id = m and rg.parceira_id = a.parceira_id and rg.corretor_id = a.corretor_id
      and rg.origem_registro = 'academia' and rg.uf_origem = 'SP';
  perform pg_temp.chk('A4 registro fica com o dono do canal, a imobiliária e o corretor certos', n = 1);
  select count(*) into n from pc_atividades where user_id = ua and tipo = 'registro_criado';
  perform pg_temp.chk('A4 registro gera a atividade registro_criado', n = 1);

  reset role; perform pg_temp.login(ua);
  begin perform pc_registrar_cliente('Maria Souza', '(16) 99222-3300', emp_vici, 'moradia', null, null, null, null, null, null, null, null); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 projeto com regra de renda exige renda e se tem imóvel', err like '%regra de renda%');
  reset role; perform pg_temp.login(ua);
  select pc_registrar_cliente('Maria Souza', '(16) 99222-3300', emp_vici, 'moradia', null, null, null, null, null, 5000, true, null) into j;
  reset role; perform pg_temp.chk('A4 cliente com imóvel em projeto HIS-2 gera alerta de elegibilidade', j->>'status' = 'pendente' and (j->>'alerta') like '%possuir imóvel%');
  reset role; perform pg_temp.login(ua);
  select pc_registrar_cliente('Ivo Prado', '(16) 99333-4400', emp_vici, 'moradia', null, null, null, null, null, 5000, false, null) into j;
  reset role; perform pg_temp.chk('A4 cliente sem imóvel em projeto HIS-2 não gera alerta', j->>'status' = 'pendente' and (j->>'alerta') is null);
  reset role; perform pg_temp.login(ua);
  begin perform pc_registrar_cliente('Sem Zap', '123', emp_blue, null, null, null, null, null, null, null, null, null); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 telefone sem DDD é recusado', err like '%WhatsApp%');

  update pc_registros_cliente set status = 'registrado' where id = reg1;
  reset role; perform pg_temp.login(ub);
  select pc_registrar_cliente('Roberto A.', '16991112200', emp_blue, null, null, null, null, null, null, null, null, null) into j;
  reset role;
  perform pg_temp.chk('A4 mesmo cliente, telefone digitado de outro jeito, dá conflito', j->>'status' = 'conflito');

  reset role; perform pg_temp.login(ud);
  begin perform pc_registrar_cliente('Fulano', '(16) 99999-9999', emp_blue, null, null, null, null, null, null, null, null, null); err := null;
  exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 quem não tem acesso não registra cliente', err like '%Acesso não liberado%');

  reset role; perform pg_temp.login(ua); select count(*) into n from pc_meus_registros();
  reset role; perform pg_temp.chk('A4 corretor vê os próprios registros', n = 3);
  reset role; perform pg_temp.login(ua);
  begin perform pc_meus_registros('equipe'); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 corretor não pede os registros da equipe', err like '%gestor%');
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_meus_registros('equipe');
  select count(*) into n2 from pc_meus_registros('equipe') where cliente_nome = 'Roberto A.';
  reset role; perform pg_temp.chk('A4 gestor vê os registros da imobiliária e nenhum de outra', n = 3 and n2 = 0);
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_meus_registros();
  reset role; perform pg_temp.chk('A4 gestor sem registros próprios vê lista vazia em "meus"', n = 0);
  reset role; perform pg_temp.login(ub); select status::text into t from pc_meus_registros() limit 1;
  select count(*) into n from pc_meus_registros();
  reset role; perform pg_temp.chk('A4 corretor em conflito vê só o próprio registro, como "conflito"', n = 1 and t = 'conflito');

  reset role; perform pg_temp.login(ua);
  select count(*) into n from pc_registros_cliente;
  update pc_registros_cliente set status = 'venda'; get diagnostics n2 = row_count;
  reset role; perform pg_temp.chk('A4 corretor não lê nem altera a tabela de registros direto', n = 0 and n2 = 0);

  insert into pc_registro_eventos (owner_id, registro_id, tipo, descricao, criado_por)
    values (m, reg1, 'nota', 'anotação interna secreta', 'marcos'), (m, reg1, 'validado', 'texto escrito pelo Marcos', 'marcos');
  reset role; perform pg_temp.login(ua);
  select count(*), bool_or(descricao like '%secreta%' or descricao like '%Marcos%'), bool_or(tipo = 'nota'), bool_or(tipo = 'criado')
    into n, b1, b2, b3 from pc_eventos_do_registro(reg1);
  reset role; perform pg_temp.chk('A4 linha do tempo não traz anotações nem o texto da coordenação', n >= 2 and b1 is not true and b2 is not true and b3);
  reset role; perform pg_temp.login(ub);
  begin perform pc_eventos_do_registro(reg1); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 corretor de outra imobiliária não vê a linha do tempo alheia', err like '%não encontrado%');
  reset role; perform pg_temp.login(ug); select count(*) into n from pc_eventos_do_registro(reg1);
  reset role; perform pg_temp.chk('A4 gestor vê a linha do tempo dos registros da equipe', n >= 2);

  select count(*) into n from pc_atividades where user_id = ua and tipo = 'registro_registrado';
  update pc_registros_cliente set status = 'visita' where id = reg1;
  select count(*) into n2 from pc_atividades where user_id = ua and tipo = 'registro_visita';
  perform pg_temp.chk('A4 mudança de situação vira atividade do corretor', n = 1 and n2 = 1);
  select count(*) into n from pc_atividades where user_id = ub and tipo = 'registro_criado';
  perform pg_temp.chk('A4 registro em conflito também gera atividade para quem registrou', n = 1);

  reset role; perform pg_temp.login(m);
  begin perform pc_solicitar_acesso('Marcos', '16 99999-0000', null, 'corretor', null, null); err := null; exception when others then err := sqlerrm; end;
  reset role; perform pg_temp.chk('A4 o dono do canal não pede acesso à Academia', err like '%administrador do canal%');
  insert into pc_acessos (user_id, owner_id, nome, papel, status) values (m, m, 'Marcos', 'corretor', 'pendente');
  reset role; perform pg_temp.login(m); select pc_meu_acesso()::text into t;
  reset role; perform pg_temp.chk('A4 pc_meu_acesso é vazio para o dono, mesmo com linha antiga', t is null);
  delete from pc_acessos where user_id = m;

  -- ----------------------------------------------------------------
  -- Resultado: a exceção desfaz tudo, e a mensagem traz o relatório.
  -- ----------------------------------------------------------------
  reset role;
  select count(*) filter (where not ok), string_agg(case when ok then 'OK     ' else 'FALHOU ' end || nome, E'\n')
    into n, v_log from t_res;
  raise exception E'TESTE ACADEMIA A0: % falha(s) em % verificações (nada foi gravado)\n%', n, (select count(*) from t_res), v_log;
end
$teste$;

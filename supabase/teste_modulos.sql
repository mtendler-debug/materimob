-- Teste dos módulos por usuário (Avaliador, CRM, Academia), rodando como cada papel.
--
--   npx supabase db query --linked --file supabase/teste_modulos.sql
--
-- Pré-requisito: migrations_crm_liberado.sql e migrations_modulos.sql aplicadas.
-- Usa as contas reais só como identidade (nada é gravado): o bloco termina SEMPRE com uma
-- exceção que desfaz tudo, e o relatório vem na mensagem. Não cria parceira validada,
-- então o gatilho do Leadlinks nunca é acionado.

create temp table t_res (nome text, ok boolean);
grant all on t_res to public;
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
  m  uuid := (select id from auth.users where email = 'mtendler@gmail.com');           -- dono / administrador
  v  uuid := (select id from auth.users where email = 'marcos@vacinas.net');           -- outro usuário, sem pedido da Academia
  ac uuid := (select id from auth.users where email = 'mtendler+academia@gmail.com');  -- parceiro liberado, sem plano de CRM
  b boolean; err text; j jsonb; n int; s text; r text; t text;
begin
  if m is null or v is null or ac is null then raise exception 'Contas de teste não encontradas'; end if;
  reset role;
  update platform_settings set ativo = true where chave in ('avaliador_ligado_para_todos', 'crm_liberado_para_todos');
  update platform_settings set ativo = false where chave = 'academia_aberta';
  delete from user_modulos;

  -- padrões ----------------------------------------------------------------
  perform pg_temp.login(ac);
  perform pg_temp.chk('padrão: Avaliador ligado para quem não tem exceção', tem_modulo('avaliador'));
  perform pg_temp.chk('padrão: CRM liberado mesmo sem plano', tem_modulo('crm'));
  perform pg_temp.chk('has_crm_access acompanha o CRM', has_crm_access());
  j := meus_modulos();
  perform pg_temp.chk('meus_modulos devolve os dois módulos', (j->>'avaliador')::boolean and (j->>'crm')::boolean);

  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  begin perform tem_modulo('crm'); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('visitante sem login não chama tem_modulo', err like '%permission denied%');
  begin b := has_crm_access(); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('visitante nunca tem CRM', err is not null or b = false);

  -- quem não é administrador -------------------------------------------------
  perform pg_temp.login(ac);
  begin perform admin_definir_modulo(ac, 'crm', false); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('usuário comum não liga/desliga módulos', err like '%restrito%');
  begin perform admin_definir_padrao('crm_liberado_para_todos', false); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('usuário comum não muda o padrão', err like '%restrito%');
  begin perform admin_modulos_lista(); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('usuário comum não vê a lista de módulos', err like '%restrito%');
  begin insert into user_modulos (user_id, modulo, ativo) values (ac, 'crm', true); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('usuário comum não grava exceção direto na tabela', err like '%permission denied%');
  begin perform count(*) from platform_settings; err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('usuário comum não lê as chaves de padrão', err like '%permission denied%');

  -- CRM: padrão e exceção ----------------------------------------------------
  perform pg_temp.login(m);
  perform admin_definir_padrao('crm_liberado_para_todos', false);
  perform pg_temp.login(ac);
  perform pg_temp.chk('CRM desligado no padrão: sem plano, sem acesso', not tem_modulo('crm'));
  perform pg_temp.login(m);
  perform admin_definir_modulo(ac, 'crm', true);
  perform pg_temp.login(ac);
  perform pg_temp.chk('exceção "Sim" abre o CRM com o padrão desligado', tem_modulo('crm') and has_crm_access());
  perform pg_temp.login(m);
  perform admin_definir_padrao('crm_liberado_para_todos', true);
  perform admin_definir_modulo(ac, 'crm', false);
  perform pg_temp.login(ac);
  perform pg_temp.chk('exceção "Não" fecha o CRM com o padrão ligado', not tem_modulo('crm') and not has_crm_access());
  perform pg_temp.login(m);
  perform admin_definir_modulo(ac, 'crm', null);
  perform pg_temp.login(ac);
  perform pg_temp.chk('"Padrão" tira a exceção e volta ao padrão', tem_modulo('crm'));

  -- plano antigo continua valendo -------------------------------------------
  perform pg_temp.login(m);
  perform admin_definir_padrao('crm_liberado_para_todos', false);
  perform pg_temp.chk('quem tem plano (crm_included) mantém o CRM com o padrão desligado', tem_modulo('crm'));
  perform admin_definir_modulo(v, 'crm', false);
  perform pg_temp.login(v);
  perform pg_temp.chk('exceção "Não" vale até sobre o plano', not tem_modulo('crm'));
  reset role; delete from user_modulos; update platform_settings set ativo = true where chave = 'crm_liberado_para_todos';

  -- Avaliador ------------------------------------------------------------------
  perform pg_temp.login(m);
  perform admin_definir_modulo(ac, 'avaliador', false);
  perform pg_temp.login(ac);
  j := meus_modulos();
  perform pg_temp.chk('Avaliador desligado só para esta pessoa, CRM segue',
    not tem_modulo('avaliador') and not (j->>'avaliador')::boolean and (j->>'crm')::boolean);
  perform pg_temp.login(v);
  perform pg_temp.chk('o Avaliador dos outros não muda', tem_modulo('avaliador'));
  perform pg_temp.login(m);
  perform admin_definir_padrao('avaliador_ligado_para_todos', false);
  perform admin_definir_modulo(ac, 'avaliador', true);
  perform pg_temp.login(ac);
  perform pg_temp.chk('exceção "Sim" liga o Avaliador com o padrão desligado', tem_modulo('avaliador'));
  perform pg_temp.login(v);
  perform pg_temp.chk('padrão desligado vale para quem não tem exceção', not tem_modulo('avaliador'));
  reset role; delete from user_modulos; update platform_settings set ativo = true where chave = 'avaliador_ligado_para_todos';

  -- trava de segurança ------------------------------------------------------------
  perform pg_temp.login(m);
  begin perform admin_definir_modulo(m, 'avaliador', false); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('o administrador não desliga módulo da própria conta', err like '%própria conta%');
  begin perform admin_definir_modulo(ac, 'parcerias', true); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('Parcerias não tem chave por usuário', err like '%desconhecido%');
  begin perform admin_definir_padrao('qualquer_coisa', true); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('chave de padrão desconhecida é recusada', err like '%desconhecido%');

  -- lista ------------------------------------------------------------------------
  perform admin_definir_modulo(ac, 'crm', false);
  select count(*) into n from admin_modulos_lista();
  select crm::text || '/' || coalesce(academia, '-') || '/' || crm_plano::text into s from admin_modulos_lista() where user_id = ac;
  perform pg_temp.chk('a lista traz todas as contas com exceção e situação da Academia', n = 3 and s = 'false/liberado/false');
  perform pg_temp.chk('admin lê os padrões', jsonb_exists(admin_modulos_padrao(), 'academia_aberta'));
  reset role; delete from user_modulos;

  -- Academia: liberar e bloquear ------------------------------------------------
  perform pg_temp.login(m);
  perform admin_definir_modulo(ac, 'academia', false);
  select status::text into s from pc_acessos where user_id = ac;
  perform pg_temp.chk('Academia "Não" bloqueia o acesso', s = 'bloqueado');
  perform admin_definir_modulo(ac, 'academia', true);
  select status::text into s from pc_acessos where user_id = ac;
  perform pg_temp.chk('Academia "Sim" libera o acesso', s = 'liberado');
  begin perform admin_definir_modulo(v, 'academia', true); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('Academia: quem nunca pediu não pode ser liberado', err like '%ainda não pediu%');
  begin perform admin_definir_modulo(ac, 'academia', null); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('Academia pede liberar ou bloquear, não "Padrão"', err like '%liberar ou bloquear%');

  -- Academia: padrão por aprovação x aberta -----------------------------------------
  perform pg_temp.login(v);
  r := pc_solicitar_acesso('Teste Vacinas', '(16) 99999-0000', null, 'corretor', null, null)::text;
  reset role;
  select status::text into s from pc_acessos where user_id = v;
  perform pg_temp.chk('padrão "por aprovação": o pedido nasce pendente', r = 'pendente' and s = 'pendente');
  delete from pc_acessos where user_id = v;

  update platform_settings set ativo = true where chave = 'academia_aberta';
  perform pg_temp.login(v);
  r := pc_solicitar_acesso('Teste Vacinas', '(16) 99999-0000', null, 'corretor', null, null)::text;
  reset role;
  select status::text, (corretor_id is not null and parceira_id is not null)::text into s, t from pc_acessos where user_id = v;
  perform pg_temp.chk('Academia aberta: o pedido já nasce liberado, com imobiliária pessoal e vínculo', r = 'liberado' and s = 'liberado' and t = 'true');
  perform pg_temp.login(v);
  begin perform pc_solicitar_acesso('Outra vez', '(16) 99999-0000', null, 'corretor', null, null); err := null; exception when others then err := sqlerrm; end;
  perform pg_temp.chk('Academia aberta: continua valendo um pedido por pessoa', err like '%já tem um pedido%');

  reset role;
  select count(*) into n from t_res where not ok;
  raise exception E'TESTE MÓDULOS: % falha(s) em % verificações (nada foi gravado)\n%', n, (select count(*) from t_res),
    (select string_agg(case when ok then 'OK     ' else 'FALHOU ' end || nome, E'\n') from t_res);
end $teste$;

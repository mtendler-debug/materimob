-- Academia de Vendas, Fase A0.4: números do corretor e visão do gestor.
-- Depende de A0.1, A0.2 e A0.3.
--
-- Três níveis de leitura, sempre decididos no servidor:
--   dono do canal (Marcos): vê tudo;
--   gestor da imobiliária:  vê só a própria equipe;
--   corretor:               vê só o que é dele.
-- Registros de cliente entram só como contagem. As linhas de
-- pc_registros_cliente continuam fechadas a parceiros até a A4, que traz
-- um caminho que esconde observações internas.

begin;

-- Números do corretor logado (tela Início).
create or replace function pc_meus_numeros()
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'materiais', (select count(*) from pc_atividades
                  where user_id = auth.uid()
                    and tipo in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte',
                                 'baixou_foto','baixou_lamina','baixou_guia','copiou_texto','usou_argumento')),
    'envios', (select count(*) from pc_envios where user_id = auth.uid()),
    'clientes_abriram', (select count(distinct b.token) from pc_aberturas b
                         join pc_envios e on e.token = b.token where e.user_id = auth.uid()),
    'registros', (select count(*) from pc_registros_cliente
                  where pc_meu_corretor() is not null and corretor_id = pc_meu_corretor()),
    'vendas', (select count(*) from pc_registros_cliente
               where pc_meu_corretor() is not null and corretor_id = pc_meu_corretor() and status = 'venda'),
    'aulas', (select count(*) from pc_progresso_aulas where user_id = auth.uid()),
    'certificados', (select count(*) from pc_certificacoes where user_id = auth.uid())
  );
$$;

-- Uma linha por pessoa com tudo o que ela fez. Dono: todas (ou só de uma
-- imobiliária, se p_parceira vier). Gestor: sempre só a própria equipe,
-- ignorando p_parceira. Pendentes primeiro.
create or replace function pc_resumo_corretores(p_parceira uuid default null)
returns table (
  user_id uuid, nome text, email text, whatsapp text, creci text,
  papel pc_papel_canal, status pc_status_acesso,
  parceira_id uuid, parceira text,
  criado_em timestamptz, ultimo_acesso timestamptz,
  materiais bigint, envios bigint, clientes_abriram bigint,
  aulas bigint, certificados bigint, trilhas_total bigint,
  registros bigint, vendas bigint, ultima_atividade timestamptz
)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  v_dono boolean := pc_sou_dono_do_canal();
  v_parc uuid;
begin
  if v_dono then
    v_parc := p_parceira;
  elsif pc_sou_gestor() then
    v_parc := pc_minha_parceira();
  else
    raise exception 'Sem permissão';
  end if;

  return query
  select
    a.user_id, a.nome, a.email, a.whatsapp, a.creci, a.papel, a.status,
    a.parceira_id, p.nome_fantasia, a.created_at, a.ultimo_acesso,
    (select count(*) from pc_atividades t where t.user_id = a.user_id
       and t.tipo in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte',
                      'baixou_foto','baixou_lamina','baixou_guia','copiou_texto','usou_argumento')),
    (select count(*) from pc_envios e where e.user_id = a.user_id),
    (select count(distinct b.token) from pc_aberturas b join pc_envios e on e.token = b.token where e.user_id = a.user_id),
    (select count(*) from pc_progresso_aulas g where g.user_id = a.user_id),
    (select count(*) from pc_certificacoes c where c.user_id = a.user_id),
    (select count(*) from pc_trilhas tr where tr.publicada and tr.owner_id = a.owner_id),
    (select count(*) from pc_registros_cliente r where a.corretor_id is not null and r.corretor_id = a.corretor_id),
    (select count(*) from pc_registros_cliente r where a.corretor_id is not null and r.corretor_id = a.corretor_id and r.status = 'venda'),
    (select max(t.criado_em) from pc_atividades t where t.user_id = a.user_id)
  from pc_acessos a
  left join pc_parceiras p on p.id = a.parceira_id
  where (not v_dono or a.owner_id = auth.uid())
    and (v_parc is null or a.parceira_id = v_parc)
  order by (a.status = 'pendente') desc,
           coalesce((select max(t.criado_em) from pc_atividades t where t.user_id = a.user_id), a.created_at) desc;
end;
$$;

-- Linha do tempo. Dono vê todos; gestor vê a equipe; corretor vê a própria.
create or replace function pc_linha_do_tempo(p_user uuid default null, p_limite int default 60)
returns table (
  id bigint, user_id uuid, nome text, parceira text,
  tipo text, projeto text, detalhe text, criado_em timestamptz
)
language plpgsql security definer stable set search_path = public as $$
#variable_conflict use_column
declare
  v_dono boolean := pc_sou_dono_do_canal();
begin
  if not (v_dono or pc_tem_acesso()) then
    raise exception 'Sem permissão';
  end if;

  return query
  select t.id, t.user_id, a.nome, p.nome_fantasia, t.tipo, e.nome, t.detalhe, t.criado_em
  from pc_atividades t
  join pc_acessos a on a.user_id = t.user_id
  left join pc_parceiras p on p.id = t.parceira_id
  left join pc_empreendimentos e on e.id = t.empreendimento_id
  where (p_user is null or t.user_id = p_user)
    and ((v_dono and t.owner_id = auth.uid())
         or t.user_id = auth.uid()
         or pc_mesma_equipe(t.user_id))
  order by t.criado_em desc
  limit least(coalesce(p_limite, 60), 300);
end;
$$;

-- Visão geral do canal. Só o dono.
create or replace function pc_painel_canal()
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare
  v_me uuid := auth.uid();
begin
  if not pc_sou_dono_do_canal() then
    raise exception 'Sem permissão';
  end if;

  return jsonb_build_object(
    'corretores', (select count(*) from pc_acessos where owner_id = v_me and status = 'liberado'),
    'pendentes', (select count(*) from pc_acessos where owner_id = v_me and status = 'pendente'),
    'ativos_7d', (select count(*) from pc_acessos where owner_id = v_me and status = 'liberado'
                  and ultimo_acesso > now() - interval '7 days'),
    'imobiliarias', (select count(distinct parceira_id) from pc_acessos
                     where owner_id = v_me and status = 'liberado' and parceira_id is not null),
    'envios', (select count(*) from pc_envios where owner_id = v_me),
    'envios_7d', (select count(*) from pc_envios where owner_id = v_me and criado_em > now() - interval '7 days'),
    'clientes_abriram', (select count(distinct b.token) from pc_aberturas b
                         join pc_envios e on e.token = b.token where e.owner_id = v_me),
    'materiais_7d', (select count(*) from pc_atividades
                     where owner_id = v_me and criado_em > now() - interval '7 days'
                       and tipo in ('abriu_projeto','abriu_book','abriu_tabela','abriu_video','baixou_arte',
                                    'baixou_foto','baixou_lamina','baixou_guia','copiou_texto','usou_argumento')),
    'aulas', (select count(*) from pc_progresso_aulas where owner_id = v_me),
    'em_treinamento', (select count(distinct user_id) from pc_progresso_aulas where owner_id = v_me),
    'certificados', (select count(*) from pc_certificacoes where owner_id = v_me),
    'registros_andamento', (select count(*) from pc_registros_cliente
                            where owner_id = v_me and status in ('pendente','registrado','visita','proposta')),
    'vendas', (select count(*) from pc_registros_cliente where owner_id = v_me and status = 'venda'),
    'mais_engajados', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'nome', x.nome, 'atividades', x.total) order by x.total desc)
      from (
        select a.user_id, a.nome, count(*) as total
        from pc_atividades t join pc_acessos a on a.user_id = t.user_id
        where t.owner_id = v_me and t.criado_em > now() - interval '30 days'
        group by a.user_id, a.nome
        order by count(*) desc
        limit 5
      ) x
    ), '[]'::jsonb),
    'parados', coalesce((
      select jsonb_agg(jsonb_build_object('user_id', a.user_id, 'nome', a.nome, 'whatsapp', a.whatsapp,
                                          'ultimo_acesso', a.ultimo_acesso) order by a.ultimo_acesso nulls first)
      from pc_acessos a
      where a.owner_id = v_me and a.status = 'liberado'
        and (a.ultimo_acesso is null or a.ultimo_acesso < now() - interval '7 days')
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function pc_meus_numeros() from public, anon, authenticated;
revoke all on function pc_resumo_corretores(uuid) from public, anon, authenticated;
revoke all on function pc_linha_do_tempo(uuid, int) from public, anon, authenticated;
revoke all on function pc_painel_canal() from public, anon, authenticated;

grant execute on function pc_meus_numeros() to authenticated;
grant execute on function pc_resumo_corretores(uuid) to authenticated;
grant execute on function pc_linha_do_tempo(uuid, int) to authenticated;
grant execute on function pc_painel_canal() to authenticated;

commit;

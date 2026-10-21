-- Academia de Vendas, A6.0: blindagem antes de abrir o cadastro para os parceiros.
-- Depende de A0 a A4.
--
-- Com o cadastro aberto, dezenas de pessoas passam a ter conta no MaterImob. Três
-- coisas deixavam de ser seguras:
--
-- 1) As políticas "Owner manages ..." das tabelas pc_* do módulo Parcerias valiam
--    para qualquer usuário logado com owner_id = ele mesmo. Com isso, qualquer conta
--    nova podia criar uma parceira ou um registro de cliente próprio, e o gatilho
--    de cada um chama o Leadlinks (leads falsos no CRM do Marcos). Agora a política
--    exige ser o dono do canal (administrador da plataforma com linha em pc_config).
--
-- 2) As visões pc_v_* rodavam com permissão do dono do banco e eram legíveis até por
--    visitante sem login (ranking de parceiras, VGV, comissões). Nenhuma tela as
--    usa. Passam a respeitar a RLS de quem consulta e perdem o acesso público.
--
-- 3) O parceiro não tinha como corrigir os próprios dados (o WhatsApp dele aparece
--    na página que o cliente abre). pc_atualizar_meus_dados resolve.
--
-- Também: a rotina que expira registros vencidos passa a registrar o evento
-- "expirado" na linha do tempo (o agendamento diário vai em outra migração).

begin;

-- ---------------------------------------------------------------------
-- 1) Só o dono do canal escreve nas tabelas pc_* do módulo Parcerias
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public' and policyname like 'Owner manages pc\_%' escape '\'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = owner_id and pc_sou_dono_do_canal()) with check (auth.uid() = owner_id and pc_sou_dono_do_canal())',
      r.policyname, r.tablename
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) Visões de ranking: sem acesso público e respeitando a RLS
-- ---------------------------------------------------------------------
alter view pc_v_ranking_parceiras set (security_invoker = true);
alter view pc_v_funil set (security_invoker = true);
alter view pc_v_por_praca set (security_invoker = true);
alter view pc_v_comissoes_a_pagar set (security_invoker = true);
revoke all on pc_v_ranking_parceiras from anon, authenticated;
revoke all on pc_v_funil from anon, authenticated;
revoke all on pc_v_por_praca from anon, authenticated;
revoke all on pc_v_comissoes_a_pagar from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) O parceiro corrige os próprios dados
-- ---------------------------------------------------------------------
create or replace function pc_atualizar_meus_dados(p_nome text, p_whatsapp text, p_creci text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  a pc_acessos;
begin
  select * into a from pc_acessos where user_id = auth.uid();
  if a.user_id is null then
    raise exception 'Você ainda não pediu acesso à Academia';
  end if;
  if nullif(trim(coalesce(p_nome, '')), '') is null then
    raise exception 'Informe o seu nome';
  end if;
  if length(regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g')) < 10 then
    raise exception 'Informe o seu WhatsApp com DDD';
  end if;

  update pc_acessos
  set nome = trim(p_nome),
      whatsapp = trim(p_whatsapp),
      creci = nullif(trim(coalesce(p_creci, '')), ''),
      updated_at = now()
  where user_id = auth.uid();

  if a.corretor_id is not null then
    update pc_parceira_corretores
    set nome = trim(p_nome),
        telefone = trim(p_whatsapp),
        creci = nullif(trim(coalesce(p_creci, '')), ''),
        updated_at = now()
    where id = a.corretor_id and owner_id = a.owner_id;
  end if;
end;
$$;

revoke all on function pc_atualizar_meus_dados(text, text, text) from public, anon, authenticated;
grant execute on function pc_atualizar_meus_dados(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Registro vencido: expira e deixa o rastro na linha do tempo
-- ---------------------------------------------------------------------
create or replace function pc_expirar_registros_vencidos()
returns void
language sql
security definer
set search_path = public
as $$
  with vencidos as (
    update pc_registros_cliente
    set status = 'expirado', updated_at = now()
    where status in ('pendente', 'registrado') and valido_ate < now()
    returning id, owner_id
  )
  insert into pc_registro_eventos (owner_id, registro_id, tipo, descricao, criado_por)
  select owner_id, id, 'expirado', 'Prazo do registro encerrado sem venda.', 'sistema' from vencidos;
$$;

revoke all on function pc_expirar_registros_vencidos() from public, anon, authenticated;

commit;

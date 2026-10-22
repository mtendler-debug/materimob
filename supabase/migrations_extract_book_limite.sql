-- Limite de uso da importação de book por IA (extract-book). Cada chamada
-- custa na API da Claude, e qualquer pessoa cria conta: sem limite, um único
-- usuário (ou várias contas falsas) gastaria o crédito à vontade (auditoria
-- pré-lançamento, 2026-10-21).
--
-- Dois tetos por dia (fuso de São Paulo): por pessoa e da plataforma inteira.
-- Admin da plataforma não tem limite. Para mudar os números, recriar
-- extract_book_reservar_uso com outros valores.
begin;

create table if not exists extract_book_usos (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users on delete cascade,
  criado_em  timestamptz not null default now()
);
create index if not exists extract_book_usos_user_idx on extract_book_usos (user_id, criado_em);
create index if not exists extract_book_usos_dia_idx on extract_book_usos (criado_em);

-- RLS ligado e sem política: só a função abaixo grava ou lê.
alter table extract_book_usos enable row level security;
revoke all on extract_book_usos from anon, authenticated;

-- Conta e reserva numa tacada só (com trava, para duas chamadas simultâneas
-- não passarem as duas no último lugar). A tentativa conta mesmo se a IA
-- falhar depois — é o que impede repetir à vontade.
create or replace function extract_book_reservar_uso()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_por_pessoa constant int := 15;
  c_plataforma constant int := 300;
  v_inicio timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  v_meus int;
  v_todos int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'nao_autenticado');
  end if;
  if is_platform_admin() then
    insert into extract_book_usos (user_id) values (auth.uid());
    return jsonb_build_object('ok', true);
  end if;

  perform pg_advisory_xact_lock(hashtext('extract_book_usos'));
  select count(*) into v_meus from extract_book_usos where user_id = auth.uid() and criado_em >= v_inicio;
  if v_meus >= c_por_pessoa then
    return jsonb_build_object('ok', false, 'motivo', 'limite_pessoa', 'limite', c_por_pessoa);
  end if;
  select count(*) into v_todos from extract_book_usos where criado_em >= v_inicio;
  if v_todos >= c_plataforma then
    return jsonb_build_object('ok', false, 'motivo', 'limite_plataforma');
  end if;

  insert into extract_book_usos (user_id) values (auth.uid());
  return jsonb_build_object('ok', true, 'restantes', c_por_pessoa - v_meus - 1);
end;
$$;
revoke all on function extract_book_reservar_uso() from public, anon, authenticated;
grant execute on function extract_book_reservar_uso() to authenticated;

commit;

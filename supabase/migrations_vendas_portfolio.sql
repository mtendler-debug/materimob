-- Base de vendas pro portfólio (imóveis prontos, fora de lançamento).
-- Replica exatamente o mecanismo que já existe pra lançamento
-- (av_launch_units.status + reserve_launch_unit, chamado por
-- aval-proposal quando o cliente confirma interesse) — sem isso não tem
-- de onde vir ticket médio/vendas por corretor do lado de imobiliária.

alter table av_portfolio_units
  add column status text not null default 'disponivel' check (status in ('disponivel','reservada','vendida')),
  add column reserved_by uuid references auth.users,
  add column reserved_for text,
  add column updated_at timestamptz default now();

-- Autoria em recurso compartilhado, mesma regra das outras colunas
-- reserved_by/created_by que apontam pra auth.users (ver
-- migrations_admin_usuarios.sql): excluir a conta do corretor não pode
-- travar nem apagar a unidade do estoque, só perde essa atribuição.
alter table av_portfolio_units
  drop constraint av_portfolio_units_reserved_by_fkey,
  add constraint av_portfolio_units_reserved_by_fkey foreign key (reserved_by) references auth.users on delete set null;

-- Link de volta da cópia do corretor (av_units, dentro do próprio
-- roteiro) pra unidade de estoque compartilhada — mesmo princípio de
-- av_units.launch_unit_id.
alter table av_units
  add column portfolio_unit_id uuid references av_portfolio_units(id) on delete set null;

-- Reserva atômica: só vinga se a unidade ainda estiver disponível no
-- momento exato da chamada. corretor_id vem explícito (não de
-- auth.uid()) porque quem chama de verdade é a Edge Function
-- aval-proposal pelo cliente admin (service_role), sem sessão de
-- usuário — mesmo motivo de reserve_launch_unit.
create or replace function reserve_portfolio_unit(unit_id uuid, client_name text default null, corretor_id uuid default auth.uid())
returns av_portfolio_units
language plpgsql security definer
set search_path = public
as $$
declare
  result av_portfolio_units;
begin
  update av_portfolio_units
  set status = 'reservada', reserved_by = corretor_id, reserved_for = client_name, updated_at = now()
  where id = unit_id and status = 'disponivel'
  returning * into result;

  if result.id is null then
    raise exception 'unidade indisponível';
  end if;

  return result;
end;
$$;

-- Duas coisas no roteiro do corretor (av_units, sua própria cópia
-- dentro do atendimento):
--
-- 1) "visited": checkbox simples pra marcar quais unidades ele
--    realmente visitou com o cliente, distinto de unidade só citada
--    pra comparar valor de tabela.
-- 2) "sold": pra unidade avulsa (sem vínculo com lançamento/portfólio
--    — cadastrada à mão), o corretor confirma venda direto, é dado
--    só dele. Pra unidade que VEM de lançamento/portfólio, quem manda
--    é o estoque compartilhado (av_launch_units/av_portfolio_units) —
--    "sold" aqui fica sempre false, a tela usa o status do vínculo.
alter table av_units
  add column visited boolean not null default false,
  add column sold boolean not null default false;

-- Corretor confirma a venda de uma unidade de lançamento que ELE MESMO
-- reservou (reserved_by = quem chama) — sem precisar ser gerente+ da
-- incorporadora dona do lançamento. Só permite a transição
-- reservada → vendida, nada além disso (mesma lógica de
-- reserve_launch_unit, espelhada pro sentido contrário do fluxo).
create or replace function confirm_launch_unit_sale(p_unit_id uuid)
returns av_launch_units
language plpgsql security definer
set search_path = public
as $$
declare
  result av_launch_units;
begin
  update av_launch_units
  set status = 'vendida', updated_at = now()
  where id = p_unit_id and reserved_by = auth.uid() and status = 'reservada'
  returning * into result;

  if result.id is null then
    raise exception 'só é possível confirmar venda de uma unidade que você mesmo reservou';
  end if;

  return result;
end;
$$;

-- Mesma regra pra unidade de portfólio.
create or replace function confirm_portfolio_unit_sale(p_unit_id uuid)
returns av_portfolio_units
language plpgsql security definer
set search_path = public
as $$
declare
  result av_portfolio_units;
begin
  update av_portfolio_units
  set status = 'vendida', updated_at = now()
  where id = p_unit_id and reserved_by = auth.uid() and status = 'reservada'
  returning * into result;

  if result.id is null then
    raise exception 'só é possível confirmar venda de uma unidade que você mesmo reservou';
  end if;

  return result;
end;
$$;

-- Academia de Vendas, Fase A1: cadastro público do corretor parceiro.
-- Depende de migrations_academia_a0_1_acesso.sql.
--
-- 1) A lista "escolha sua imobiliária" aparece ANTES de a pessoa ter conta
--    (o cadastro é uma tela só). Por isso pc_parceiras_para_vinculo passa a
--    poder ser chamada sem login. Ela só devolve id, nome e cidade das
--    imobiliárias que o Marcos marcou como ativas na Academia, nunca
--    contato, comissão nem token.
--
-- 2) "academia" passa a ser endereço reservado (materimob.com.br/academia),
--    para nenhuma organização conseguir esse nome como endereço de marca.

begin;

grant execute on function pc_parceiras_para_vinculo() to anon;

create or replace function valida_subdominio_reservado()
returns trigger
language plpgsql
as $$
begin
  if new.slug is not null and lower(new.slug) in
    ('app','admin','entrar','convite','c','r','cliente','registrar','parceria','academia') then
    raise exception 'esse endereço é reservado pelo próprio Materimob';
  end if;
  return new;
end;
$$;

commit;

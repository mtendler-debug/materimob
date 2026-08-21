-- Valor do condomínio e do IPTU — mesmo espírito de payment_terms: só do
-- imóvel/empreendimento, não da unidade (unidades de um mesmo prédio
-- costumam compartilhar a mesma taxa de condomínio por m², e o valor
-- exibido aqui é referência, não obrigação contratual).
alter table av_properties
  add column condo_value numeric,
  add column iptu_value numeric;

alter table av_portfolio_properties
  add column condo_value numeric,
  add column iptu_value numeric;

alter table av_launches
  add column condo_value numeric,
  add column iptu_value numeric;

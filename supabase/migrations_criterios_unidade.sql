-- Segundo conjunto de critérios, só pra avaliar a unidade — mesmo
-- espírito de criteria/extra_criteria, mas pra planta/vista/ruído
-- daquele apê específico, separado do que avalia o empreendimento
-- (localização, lazer, construtora).
alter table av_selections
  add column unit_criteria text[] not null default '{}';

alter table av_properties
  add column extra_unit_criteria text[] not null default '{}';

alter table av_portfolio_properties
  add column extra_unit_criteria text[] not null default '{}';

alter table av_launches
  add column unit_criteria text[] not null default '{}',
  add column extra_unit_criteria text[] not null default '{}';

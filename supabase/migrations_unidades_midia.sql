-- Fotos e condições de pagamento também no nível da unidade, não só do
-- empreendimento — uma unidade específica pode ter fotos próprias (planta
-- daquele apê, vista, etc.) e uma condição de pagamento diferente da geral.
alter table av_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_portfolio_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_launch_units
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

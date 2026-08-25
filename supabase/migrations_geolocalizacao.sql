-- Infra de geolocalização: endereço + coordenada nas entidades que vão
-- aparecer em mapa. Lançamento/portfólio/roteiro já tinham address —
-- só ganham latitude/longitude. Perfil e organização não tinham
-- endereço nenhum, ganham os três campos.
alter table av_launches add column latitude numeric, add column longitude numeric;
alter table av_portfolio_properties add column latitude numeric, add column longitude numeric;
alter table av_properties add column latitude numeric, add column longitude numeric;
alter table profiles add column address text, add column latitude numeric, add column longitude numeric;
alter table organizations add column address text, add column latitude numeric, add column longitude numeric;

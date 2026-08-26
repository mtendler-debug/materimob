-- Oportunidade pode apontar pra um imóvel real do Avaliador (estoque
-- de portfólio ou lançamento) em vez de só texto livre — no máximo um
-- dos dois, nunca os dois ao mesmo tempo (a UI garante isso; não é
-- caso comum o bastante pra valer um check constraint).
alter table av_opportunities
  add column portfolio_property_id uuid references av_portfolio_properties(id) on delete set null,
  add column launch_id uuid references av_launches(id) on delete set null;

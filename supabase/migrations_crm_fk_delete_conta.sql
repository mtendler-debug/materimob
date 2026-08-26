-- av_leads/av_opportunities.user_id é dono pessoal do dado (mesma
-- categoria de av_selections/av_properties etc.) — precisa cascatear
-- na exclusão de conta, senão bloqueia admin-delete-user com FK
-- violation (mesma regra estabelecida em migrations_admin_usuarios.sql).
alter table av_leads
  drop constraint av_leads_user_id_fkey,
  add constraint av_leads_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_opportunities
  drop constraint av_opportunities_user_id_fkey,
  add constraint av_opportunities_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

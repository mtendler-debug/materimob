-- Prepara o banco pra permitir excluir uma conta de auth.users sem
-- violar FK. Duas categorias, tratadas diferente:
--
-- 1) Dono pessoal do dado (user_id) — cascade: excluir o corretor
--    apaga os roteiros/avaliações/propostas/critérios/portfólio
--    pessoais dele. Os filhos dessas linhas (av_properties, av_units,
--    av_portfolio_units etc.) já cascateiam a partir daqui, porque já
--    são "on delete cascade" a partir de av_selections/av_properties/
--    av_portfolio_properties.
--
-- 2) Autoria num recurso compartilhado (created_by/reserved_by) — set
--    null: a organização/lançamento/convite/reserva continua
--    existindo, só perde a atribuição de quem criou/reservou.

-- --- grupo 1: dono pessoal, cascade -----------------------------------

alter table av_criteria_presets drop constraint av_criteria_presets_user_id_fkey,
  add constraint av_criteria_presets_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_evaluations drop constraint av_evaluations_user_id_fkey,
  add constraint av_evaluations_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_portfolio_properties drop constraint av_portfolio_properties_user_id_fkey,
  add constraint av_portfolio_properties_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_properties drop constraint av_properties_user_id_fkey,
  add constraint av_properties_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_proposals drop constraint av_proposals_user_id_fkey,
  add constraint av_proposals_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_selections drop constraint av_selections_user_id_fkey,
  add constraint av_selections_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table av_units drop constraint av_units_user_id_fkey,
  add constraint av_units_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

alter table organization_members drop constraint organization_members_user_id_fkey,
  add constraint organization_members_user_id_fkey foreign key (user_id) references auth.users on delete cascade;

-- --- grupo 2: autoria em recurso compartilhado, set null --------------

alter table av_launch_partners alter column created_by drop not null,
  drop constraint av_launch_partners_created_by_fkey,
  add constraint av_launch_partners_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table av_launch_units
  drop constraint av_launch_units_reserved_by_fkey,
  add constraint av_launch_units_reserved_by_fkey foreign key (reserved_by) references auth.users on delete set null;

alter table av_launches alter column created_by drop not null,
  drop constraint av_launches_created_by_fkey,
  add constraint av_launches_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table av_portfolio_properties alter column created_by drop not null,
  drop constraint av_portfolio_properties_created_by_fkey,
  add constraint av_portfolio_properties_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table av_team_picks alter column created_by drop not null,
  drop constraint av_team_picks_created_by_fkey,
  add constraint av_team_picks_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table organization_invites alter column created_by drop not null,
  drop constraint organization_invites_created_by_fkey,
  add constraint organization_invites_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table organizations alter column created_by drop not null,
  drop constraint organizations_created_by_fkey,
  add constraint organizations_created_by_fkey foreign key (created_by) references auth.users on delete set null;

alter table platform_admins
  drop constraint platform_admins_created_by_fkey,
  add constraint platform_admins_created_by_fkey foreign key (created_by) references auth.users on delete set null;

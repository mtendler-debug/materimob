-- A lista de módulos passa a informar se a pessoa tem plano de CRM (pessoal ou da organização),
-- para a tela mostrar o estado real quando o padrão do CRM estiver desligado.
begin;

drop function if exists admin_modulos_lista();
create function admin_modulos_lista()
returns table (user_id uuid, email text, nome text, tipo text, e_admin boolean,
               avaliador boolean, crm boolean, crm_plano boolean, academia text, imobiliaria text)
language plpgsql security definer stable
set search_path = public
as $$
#variable_conflict use_column
begin
  if not is_platform_admin() then raise exception 'acesso restrito ao time da plataforma'; end if;
  return query
  select u.id, u.email::text, coalesce(a.nome, p.full_name),
         coalesce(p.account_type, 'corretor')::text,
         exists (select 1 from platform_admins pa where pa.user_id = u.id),
         (select m.ativo from user_modulos m where m.user_id = u.id and m.modulo = 'avaliador'),
         (select m.ativo from user_modulos m where m.user_id = u.id and m.modulo = 'crm'),
         coalesce(p.crm_included, false) or exists (
           select 1 from organization_members om join organizations o on o.id = om.organization_id
           where om.user_id = u.id and o.crm_included = true),
         a.status::text,
         pp.nome_fantasia::text
  from auth.users u
  left join profiles p on p.id = u.id
  left join pc_acessos a on a.user_id = u.id
  left join pc_parceiras pp on pp.id = a.parceira_id
  order by u.created_at desc;
end $$;

revoke all on function admin_modulos_lista() from public, anon, authenticated;
grant execute on function admin_modulos_lista() to authenticated;

commit;

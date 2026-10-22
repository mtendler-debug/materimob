-- crm_included decide quem tem o CRM pago (has_crm_access). As políticas de
-- profiles ("Cada um gerencia o próprio perfil") e de organizations ("Diretor
-- renames organization" — e qualquer usuário cria uma organização e vira
-- diretor dela) deixavam o próprio usuário gravar crm_included = true pelo
-- console do navegador (auditoria pré-lançamento, 2026-10-21).
--
-- Mesmo desenho de protege_status_organizacao: gatilho, não política, porque a
-- RLS decide a linha e não a coluna. Só o admin da plataforma muda o campo.
-- auth.uid() nulo é o SQL Editor / service_role (migrações, Edge Functions),
-- que continuam livres — nenhum usuário do app chega aqui sem auth.uid().
begin;

create or replace function protege_crm_included()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or is_platform_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.crm_included := false;
  elsif new.crm_included is distinct from old.crm_included then
    raise exception 'só o time da plataforma altera o plano de CRM';
  end if;
  return new;
end;
$$;
revoke all on function protege_crm_included() from public, anon, authenticated;

drop trigger if exists protege_crm_included on profiles;
create trigger protege_crm_included
  before insert or update on profiles
  for each row execute function protege_crm_included();

drop trigger if exists protege_crm_included on organizations;
create trigger protege_crm_included
  before insert or update on organizations
  for each row execute function protege_crm_included();

commit;

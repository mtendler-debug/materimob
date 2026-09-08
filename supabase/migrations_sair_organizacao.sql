-- Hoje só gerente/diretor pode deletar linha de organization_members
-- (política "Gerente+ removes membership") — um corretor comum não
-- consegue sair sozinho. Acrescenta a saída voluntária, sem tirar a
-- remoção por gestão que já existe.

create policy "Members leave organization" on organization_members
  for delete using (user_id = auth.uid());

-- Nenhuma organização pode ficar sem diretor — vale tanto pra saída
-- voluntária quanto pra remoção feita por um gerente.
create or replace function prevent_last_diretor_removal()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.role = 'diretor' and not exists (
    select 1 from organization_members
    where organization_id = old.organization_id
      and role = 'diretor'
      and id <> old.id
  ) then
    raise exception 'não é possível remover o último diretor da organização — promova outra pessoa antes';
  end if;
  return old;
end;
$$;

create trigger before_organization_member_delete
  before delete on organization_members
  for each row execute function prevent_last_diretor_removal();

-- account_type é a "casa" do usuário (ver comentário original na criação
-- de organizations/profiles). Quem tinha account_type de gestor porque
-- geria uma organização e sai da última que lhe restava volta a ser
-- corretor autônomo — senão fica preso numa tela de organização vazia.
create or replace function reset_account_type_on_last_org_exit()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from organization_members where user_id = old.user_id
  ) then
    update profiles
    set account_type = 'corretor'
    where id = old.user_id
      and account_type in ('imobiliaria', 'incorporadora');
  end if;
  return old;
end;
$$;

create trigger after_organization_member_delete
  after delete on organization_members
  for each row execute function reset_account_type_on_last_org_exit();

-- Trava de papéis dentro da organização (auditoria pré-lançamento, 2026-10-22).
-- As políticas "Gerente+ manages membership" / "removes membership" / "creates
-- invites" só exigiam rank >= 3, sem olhar QUAL papel estava sendo dado ou
-- tirado: um gerente conseguia se promover a diretor, rebaixar ou remover o
-- diretor, e convidar alguém já como diretor.
--
-- Regra (gatilho, porque a RLS decide a linha e não o valor do papel):
--  - diretor: livre (só não pode deixar a organização sem diretor);
--  - gerente/abaixo: só mexe em quem está ABAIXO dele, nunca em si mesmo, e
--    nunca dá papel acima do próprio (gerente pode convidar/promover até
--    gerente, nunca diretor);
--  - ninguém troca organization_id/user_id de uma linha existente;
--  - admin da plataforma e auth.uid() nulo (SQL Editor, Edge Functions com
--    service_role, como org-invite-accept e admin-create-org-manager) livres.
-- Sair por conta própria continua livre ("Members leave organization").
begin;

create or replace function trava_papel_organizacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meu int;
  v_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  if auth.uid() is null or is_platform_admin() then
    -- Mesmo livres, nunca deixar a organização sem diretor por edição.
    null;
  else
    v_meu := org_role_rank(my_org_role(v_org));

    if tg_table_name = 'organization_invites' then
      if org_role_rank(new.role) > v_meu then
        raise exception 'você não pode convidar alguém com papel acima do seu';
      end if;
      return new;
    end if;

    if tg_op = 'UPDATE' then
      if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
        raise exception 'não é possível mover um membro para outra organização ou pessoa';
      end if;
      if v_meu < 4 then
        if old.user_id = auth.uid() then
          raise exception 'só um diretor pode mudar o próprio papel';
        end if;
        if org_role_rank(old.role) >= v_meu then
          raise exception 'você só pode mudar o papel de quem está abaixo de você';
        end if;
        if org_role_rank(new.role) > v_meu then
          raise exception 'você não pode dar um papel acima do seu';
        end if;
      end if;
    end if;

    if tg_op = 'DELETE' then
      -- A própria saída é outro caminho (política "Members leave organization").
      if old.user_id <> auth.uid() and v_meu < 4 and org_role_rank(old.role) >= v_meu then
        raise exception 'você só pode remover quem está abaixo de você';
      end if;
      return old;
    end if;
  end if;

  if tg_table_name = 'organization_members' and tg_op = 'UPDATE'
     and old.role = 'diretor' and new.role <> 'diretor'
     and not exists (
       select 1 from organization_members
       where organization_id = old.organization_id and role = 'diretor' and id <> old.id
     ) then
    raise exception 'não é possível rebaixar o último diretor da organização — promova outra pessoa antes';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
revoke all on function trava_papel_organizacao() from public, anon, authenticated;

drop trigger if exists trava_papel_organizacao on organization_members;
create trigger trava_papel_organizacao
  before update or delete on organization_members
  for each row execute function trava_papel_organizacao();

drop trigger if exists trava_papel_organizacao on organization_invites;
create trigger trava_papel_organizacao
  before insert or update on organization_invites
  for each row execute function trava_papel_organizacao();

commit;

-- =====================================================================
-- Marca e domínio por organização (white-label)
--
-- Objetivo: uma incorporadora/imobiliária que paga por personalização
-- passa a poder vestir o Materimob com a marca dela — nome de exibição,
-- logo, duas cores e um subdomínio (ex.: chaincorp.materimob.com.br).
-- Sem duplicar tabela nem módulo: são só colunas novas em `organizations`
-- e uma função de leitura pública (sem sessão) pra resolver o subdomínio
-- antes do login.
--
-- Não confundir com `profiles.logo_url`/`profiles.brand_color`
-- (migrations_papeis.sql) — aquilo é a marca PESSOAL de um corretor nas
-- telas do cliente; isto aqui é a marca da ORGANIZAÇÃO no próprio app.
--
-- Quem pode editar: a política "Diretor renames organization" já existe
-- (org_role_rank(my_org_role(id)) >= 4) e vale pra linha inteira, não só
-- pro nome — não precisa de política nova pra isso.
-- =====================================================================

alter table organizations
  add column nome_exibicao  text,
  add column logo_url       text,
  add column cor_primaria   text,
  add column cor_secundaria text,
  add column subdominio     text;

alter table organizations
  add constraint organizations_cor_primaria_formato
    check (cor_primaria is null or cor_primaria ~ '^#[0-9a-fA-F]{6}$'),
  add constraint organizations_cor_secundaria_formato
    check (cor_secundaria is null or cor_secundaria ~ '^#[0-9a-fA-F]{6}$'),
  add constraint organizations_subdominio_formato
    check (subdominio is null or subdominio ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$');

-- Único (case-insensitive) e sem os nomes que o próprio site já usa —
-- senão "app.materimob.com.br" viraria ambíguo com uma organização.
create unique index organizations_subdominio_unico
  on organizations (lower(subdominio))
  where subdominio is not null;

create or replace function valida_subdominio_reservado()
returns trigger
language plpgsql
as $$
begin
  if new.subdominio is not null and lower(new.subdominio) in
    ('app','www','api','admin','mail','static','assets','cdn','materimob') then
    raise exception 'esse subdomínio é reservado pelo próprio Materimob';
  end if;
  return new;
end;
$$;

create trigger on_organization_subdominio_reservado
  before insert or update of subdominio on organizations
  for each row execute function valida_subdominio_reservado();

-- Leitura pública e mínima pra resolver "chaincorp.materimob.com.br" ->
-- marca ANTES do login (tela de entrada não tem sessão ainda). Não abre
-- uma política de select genérica pra anônimo em `organizations` (que
-- hoje é authenticated-only) — só devolve os 5 campos de marca, e só de
-- organização ativa com subdomínio configurado. Mesmo padrão de
-- security definer já usado em my_org_role/org_visivel.
create or replace function organization_branding(p_subdominio text)
returns table (
  id              uuid,
  name            text,
  nome_exibicao   text,
  logo_url        text,
  cor_primaria    text,
  cor_secundaria  text
)
language sql
security definer
stable
set search_path = public
as $$
  select id, name, nome_exibicao, logo_url, cor_primaria, cor_secundaria
  from organizations
  where lower(subdominio) = lower(p_subdominio)
    and status = 'ativa'
  limit 1;
$$;

grant execute on function organization_branding(text) to anon, authenticated;

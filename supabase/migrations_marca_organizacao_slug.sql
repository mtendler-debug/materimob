-- =====================================================================
-- Marca por organização: troca de subdomínio por caminho
--
-- migrations_marca_organizacao.sql tinha "subdominio" pensando em
-- chaincorp.materimob.com.br — o que exige DNS coringa (*.materimob.com.br)
-- e domínio coringa configurado no Netlify, nenhum dos dois no ar ainda.
-- Trocado por um caminho simples, materimob.com.br/chaincorp, que já
-- funciona hoje sem depender de nada fora do código. Mesma coluna, mesmo
-- mecanismo (organization_branding), só muda como o valor é lido no
-- front (caminho da URL em vez de hostname) — por isso é rename, não uma
-- coluna nova.
-- =====================================================================

alter table organizations rename column subdominio to slug;

alter table organizations
  rename constraint organizations_subdominio_formato to organizations_slug_formato;

drop index organizations_subdominio_unico;
create unique index organizations_slug_unico
  on organizations (lower(slug))
  where slug is not null;

-- "app", "admin" etc. aqui são os primeiros pedaços de caminho já usados
-- por rotas de verdade (/app, /admin, /entrar…) — reservado pra um slug
-- de organização nunca colidir com uma tela existente do sistema.
create or replace function valida_subdominio_reservado()
returns trigger
language plpgsql
as $$
begin
  if new.slug is not null and lower(new.slug) in
    ('app','admin','entrar','convite','c','r','cliente','registrar','parceria') then
    raise exception 'esse endereço é reservado pelo próprio Materimob';
  end if;
  return new;
end;
$$;

drop function organization_branding(text);

create function organization_branding(p_slug text)
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
  where lower(slug) = lower(p_slug)
    and status = 'ativa'
  limit 1;
$$;

grant execute on function organization_branding(text) to anon, authenticated;

-- Primeiros passos do corretor novo (cartão "Comece por aqui" em Meus clientes).
-- Os passos 1 e 2 se deduzem dos dados (atendimento criado, imóvel no roteiro). O passo 3
-- (link enviado ao cliente) e o "dispensar" são marcas guardadas aqui.
--   primeiros_passos = { "link_copiado": true, "dispensado": true }
begin;

alter table profiles add column if not exists primeiros_passos jsonb not null default '{}'::jsonb;

-- Só duas chaves aceitas, só na própria conta; o resto do perfil não passa por aqui.
create or replace function marcar_primeiro_passo(p_chave text)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro';
  end if;
  if p_chave not in ('link_copiado', 'dispensado') then
    raise exception 'Marca desconhecida';
  end if;
  update profiles
     set primeiros_passos = primeiros_passos || jsonb_build_object(p_chave, true)
   where id = auth.uid();
end $$;

revoke all on function marcar_primeiro_passo(text) from public, anon, authenticated;
grant execute on function marcar_primeiro_passo(text) to authenticated;

commit;

-- ACADEMIA DE VENDAS · Script 6: corrige a criação dos links rastreados de WhatsApp
create or replace function public.criar_disparo(p_lancamento text, p_tese text, p_pela_imobiliaria boolean)
returns text language plpgsql security definer set search_path = public as $$
declare t text; v_imob uuid;
begin
  if meu_papel() is null then raise exception 'Acesso não liberado'; end if;
  if p_pela_imobiliaria then v_imob := minha_imob(); end if;
  loop
    t := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    exit when not exists (select 1 from links where token = t);
  end loop;
  insert into links (token, corretor_id, imobiliaria_id, lancamento_id, tese) values (t, auth.uid(), v_imob, p_lancamento, p_tese);
  insert into atividades (usuario_id, tipo, lancamento_id, detalhe) values (auth.uid(), 'enviou_kit', p_lancamento, p_tese);
  return t;
end $$;
grant execute on function public.criar_disparo(text, text, boolean) to authenticated;

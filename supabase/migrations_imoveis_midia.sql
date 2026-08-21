-- =====================================================================
-- MaterImob · migração "Imóveis: fotos, planta e condições de pagamento"
--
-- Fotos, planta e condições de pagamento são do imóvel/empreendimento —
-- mesmo espírito de summary/address, que já são assim — não da unidade.
-- Mesmas três colunas nos três lugares onde um imóvel existe: a cópia
-- dentro da seleção do cliente (av_properties), o estoque do corretor
-- (av_portfolio_properties) e o lançamento de incorporadora (av_launches).
-- =====================================================================

alter table av_properties
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_portfolio_properties
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

alter table av_launches
  add column floor_plan_url text,
  add column photo_urls text[] not null default '{}',
  add column payment_terms text;

-- ---------------------------------------------------------------------
-- Bucket de Storage — leitura pública (o cliente final avalia sem estar
-- logado, via token público, e precisa ver as fotos mesmo assim).
-- Escrita fica restrita à própria pasta do usuário autenticado — quem
-- pode de fato anexar aquela URL a qual imóvel continua sendo decidido
-- pela RLS de av_properties/av_portfolio_properties/av_launches, que já
-- é robusta; o Storage não precisa reproduzir essa lógica de dono.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imoveis', 'imoveis', true, 8388608, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "Leitura pública das imagens de imóveis" on storage.objects
  for select using (bucket_id = 'imoveis');

create policy "Autenticado envia dentro da própria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'imoveis' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Autenticado remove da própria pasta" on storage.objects
  for delete to authenticated using (
    bucket_id = 'imoveis' and (storage.foldername(name))[1] = auth.uid()::text
  );

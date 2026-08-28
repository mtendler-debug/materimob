-- Guarda o material de origem no próprio registro, pra poder conferir
-- depois — mesmo padrão de photo_urls (array de URL pública).
alter table av_launches add column book_urls text[] not null default '{}';
alter table av_portfolio_properties add column book_urls text[] not null default '{}';

-- Bucket novo — "imoveis" (schema.sql:1287) só aceita imagem e 8MB;
-- book é PDF e pode ser maior.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('books', 'books', true, 20971520,
        array['application/pdf','image/png','image/jpeg','image/webp']);

create policy "Leitura pública dos books" on storage.objects
  for select using (bucket_id = 'books');
create policy "Autenticado envia book na própria pasta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "Autenticado remove book da própria pasta" on storage.objects
  for delete to authenticated using (
    bucket_id = 'books' and (storage.foldername(name))[1] = auth.uid()::text
  );

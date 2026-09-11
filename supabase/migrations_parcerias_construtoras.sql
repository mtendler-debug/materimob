-- Lista de construtoras/incorporadoras (quem constrói), separada das
-- parceiras (imobiliárias/corretoras, quem vende pro cliente final) por
-- ser um papel diferente na cadeia — não misturar com pc_parceiras.
-- Guardada aqui como referência de prospecção do próprio MaterImob
-- (importada de uma exportação do Apollo); sem tela própria ainda.
create table pc_construtoras_prospeccao (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users not null default auth.uid(),
  empresa     text not null,
  cidade      text,
  segmento    text,
  telefone    text,
  site        text,
  descricao   text,
  observacao  text,
  created_at  timestamptz default now()
);

alter table pc_construtoras_prospeccao enable row level security;
create policy "Owner manages pc_construtoras_prospeccao" on pc_construtoras_prospeccao
  for all using (auth.uid() = owner_id);

-- Referência solta do programa de parcerias que a própria Chaincorp já
-- opera (links, contato do gerente de parcerias) — sem estrutura própria
-- ainda, só texto guardado na config de um jeito recuperável.
alter table pc_config add column if not exists canal_oficial_notas text;

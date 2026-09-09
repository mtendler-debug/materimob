-- av_clients é compartilhado entre corretores (o mesmo cliente pode ter
-- roteiros de mais de um corretor) — por isso "desativar cliente" não
-- pode ser uma coluna na própria av_clients (esconderia o cliente pra
-- todo mundo que o atende). Fica numa tabela à parte, por corretor.
create table av_client_relations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users not null default auth.uid(),
  client_id   uuid references av_clients(id) on delete cascade not null,
  archived    boolean not null default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, client_id)
);

alter table av_client_relations enable row level security;

create policy "Users manage own client relations" on av_client_relations
  for all using (auth.uid() = user_id);

create index on av_client_relations (client_id);

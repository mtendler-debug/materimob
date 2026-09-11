-- Funil de relacionamento de captação de parceiras (03-Cadastro-Parceiras-Regras.md).
-- Substitui o status simples de pc_parceiras (prospect/em_negociacao/
-- ativa/pausada/encerrada) por um funil mais granular — sem dado real
-- pra migrar, a Fase P1/P2 só rodou com dado de teste, já removido.

create type pc_status_funil_parceira as enum (
  'nao_contatado',
  'contato_iniciado',
  'reuniao_agendada',
  'em_negociacao',
  'parceria_firmada',
  'sem_interesse',
  'pausado'
);

alter table pc_parceiras drop column status;
drop type pc_status_parceira;

alter table pc_parceiras
  add column status_funil pc_status_funil_parceira not null default 'nao_contatado',
  add column segmento_foco text,
  add column prioridade text check (prioridade in ('alta', 'media', 'baixa')),
  add column prioridade_justificativa text,
  add column prioridade_calculada_em timestamptz,
  add column ultimo_contato_em timestamptz,
  -- true pra cadastro manual (padrão hoje); autocadastro público nasce
  -- false e só aparece nas listas normais depois que o Marcos revisa.
  add column validado boolean not null default true;

-- "Uma parceira só pode saltar de Não contatado se já tiver telefone ou
-- e-mail de contato preenchido" — reforça no banco, não só na tela.
create or replace function pc_checar_avanco_funil()
returns trigger
language plpgsql
as $$
begin
  if new.status_funil <> 'nao_contatado'
     and coalesce(new.responsavel_telefone, '') = ''
     and coalesce(new.responsavel_email, '') = '' then
    raise exception 'preencha telefone ou e-mail do contato antes de avançar o funil';
  end if;
  return new;
end;
$$;

create trigger before_pc_parceiras_funil
  before insert or update on pc_parceiras
  for each row execute function pc_checar_avanco_funil();

-- "Data do último contato... atualiza a cada mudança de status, não é
-- editada manualmente."
create or replace function pc_atualizar_ultimo_contato()
returns trigger
language plpgsql
as $$
begin
  if new.status_funil is distinct from old.status_funil then
    new.ultimo_contato_em := now();
  end if;
  return new;
end;
$$;

create trigger before_pc_parceiras_ultimo_contato
  before update on pc_parceiras
  for each row execute function pc_atualizar_ultimo_contato();

-- Observações como histórico cronológico, não um campo único que se
-- sobrescreve.
create table pc_parceira_observacoes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users not null default auth.uid(),
  parceira_id uuid references pc_parceiras(id) on delete cascade not null,
  texto       text not null,
  criado_por  text not null default 'marcos',
  criado_em   timestamptz default now()
);
create index on pc_parceira_observacoes (parceira_id, criado_em);

alter table pc_parceira_observacoes enable row level security;
create policy "Owner manages pc_parceira_observacoes" on pc_parceira_observacoes
  for all using (auth.uid() = owner_id);

-- "Empreendimento(s) de maior interesse" é N:N, não texto livre — uma
-- parceira pode interessar por vários, um empreendimento interessa a
-- várias parceiras.
create table pc_parceira_interesses (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users not null default auth.uid(),
  parceira_id       uuid references pc_parceiras(id) on delete cascade not null,
  empreendimento_id uuid references pc_empreendimentos(id) on delete cascade not null,
  created_at        timestamptz default now(),
  unique (parceira_id, empreendimento_id)
);

alter table pc_parceira_interesses enable row level security;
create policy "Owner manages pc_parceira_interesses" on pc_parceira_interesses
  for all using (auth.uid() = owner_id);

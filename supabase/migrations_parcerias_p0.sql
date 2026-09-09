-- Módulo Parcerias — Fase P0 (banco): enums, tabelas, índices, RLS, views.
-- Ver 00-LEIA-ME-PARCERIAS.md / 01-MODELO-DE-DADOS-PARCERIAS.md na raiz do
-- repo pro contexto de negócio completo.
--
-- Dois ajustes em relação ao documento original, porque o modelo
-- existente prevalece (regra do próprio LEIA-ME):
--   - "lead_id fk lead" -> na verdade é av_leads (tabela do CRM já
--     existente, prefixo av_).
--   - "av_cliente_id fk entidade de cliente do Avaliador" -> a tabela
--     certa é av_clients.
--   - owner_id segue o padrão já usado em todo o schema.sql:
--     "references auth.users not null default auth.uid()".

create type pc_enquadramento as enum ('R2V', 'HIS-1', 'HIS-2', 'HMP', 'NR');
create type pc_status_parceira as enum ('prospect', 'em_negociacao', 'ativa', 'pausada', 'encerrada');
create type pc_status_registro as enum (
  'pendente',
  'registrado',
  'conflito',
  'visita',
  'proposta',
  'venda',
  'expirado',
  'cancelado'
);
create type pc_perfil_cliente as enum ('investidor', 'moradia', 'estudante', 'outro');
create type pc_status_comissao as enum ('prevista', 'aprovada', 'paga', 'cancelada');
create type pc_tipo_pessoa as enum ('PF', 'PJ');

create table pc_empreendimentos (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid references auth.users not null default auth.uid(),
  incorporadora     text not null,
  nome              text not null,
  bairro            text,
  zona              text,
  endereco          text,
  cidade            text default 'São Paulo',
  uf                char(2) default 'SP',
  entrega_prevista  date,
  estagio           text,
  comissao_pf_pct   numeric(5,2),
  comissao_pj_pct   numeric(5,2),
  comissao_obs      text,
  tabela_referencia text,
  tabela_data       date,
  -- ponte com o Avaliador (fase P4) — sem duplicar foto/planta, que
  -- continuam só em av_launches.
  av_launch_id      uuid references av_launches(id) on delete set null,
  ativo             boolean not null default true,
  observacoes       text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table pc_unidades (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid references auth.users not null default auth.uid(),
  empreendimento_id     uuid references pc_empreendimentos(id) on delete cascade not null,
  identificacao         text,
  torre                 text,
  metragem_privativa    numeric(8,2),
  tipologia             text,
  dormitorios           smallint,
  vagas                 smallint default 0,
  enquadramento         pc_enquadramento,
  uso_residencial       boolean not null default true,
  condicao_pagamento    text,
  valor_m2              numeric(12,2),
  valor_total           numeric(14,2),
  disponivel            boolean not null default true,
  destaque_rede         boolean not null default false,
  observacoes           text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index on pc_unidades (empreendimento_id);

create table pc_regras_enquadramento (
  id                          uuid primary key default gen_random_uuid(),
  owner_id                    uuid references auth.users not null default auth.uid(),
  enquadramento               pc_enquadramento not null,
  renda_familiar_max          numeric(12,2),
  renda_em_salarios_minimos   numeric(5,2),
  veda_proprietario_de_imovel boolean not null default false,
  exige_comprovacao           boolean not null default false,
  texto_orientacao            text,
  vigente_desde               date,
  fonte                       text,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

create table pc_parceiras (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid references auth.users not null default auth.uid(),
  nome_fantasia         text not null,
  razao_social          text,
  cnpj                  text,
  creci_juridico        text,
  tipo_pessoa           pc_tipo_pessoa not null default 'PJ',
  cidade                text,
  uf                    char(2),
  praca                 text,
  responsavel_nome      text,
  responsavel_telefone  text,
  responsavel_email     text,
  status                pc_status_parceira not null default 'prospect',
  comissao_pct_padrao   numeric(5,2),
  contrato_assinado_em  date,
  contrato_arquivo_url  text,
  token_registro        text unique not null default encode(gen_random_bytes(24), 'base64'),
  token_ativo           boolean not null default true,
  origem                text,
  observacoes           text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index on pc_parceiras (owner_id, status);

create table pc_parceira_corretores (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references auth.users not null default auth.uid(),
  parceira_id  uuid references pc_parceiras(id) on delete cascade not null,
  nome         text not null,
  creci        text,
  telefone     text,
  email        text,
  ativo        boolean not null default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on pc_parceira_corretores (parceira_id);

create table pc_parceira_comissoes (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users not null default auth.uid(),
  parceira_id         uuid references pc_parceiras(id) on delete cascade not null,
  empreendimento_id   uuid references pc_empreendimentos(id) on delete cascade not null,
  comissao_pct        numeric(5,2) not null,
  observacoes         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique (parceira_id, empreendimento_id)
);

create table pc_registros_cliente (
  id                            uuid primary key default gen_random_uuid(),
  owner_id                      uuid references auth.users not null default auth.uid(),
  parceira_id                   uuid references pc_parceiras(id) not null,
  corretor_id                   uuid references pc_parceira_corretores(id),
  empreendimento_id             uuid references pc_empreendimentos(id),
  lead_id                       uuid references av_leads(id) on delete set null,
  av_cliente_id                 uuid references av_clients(id) on delete set null,
  cliente_nome                  text not null,
  cliente_telefone              text not null,
  cliente_email                 text,
  cliente_cpf_hash              text,
  cliente_cpf_final             char(3),
  cidade_origem                 text,
  uf_origem                     char(2),
  perfil                        pc_perfil_cliente,
  interesse_unidades            uuid[],
  faixa_renda_declarada         numeric(12,2),
  possui_imovel_declarado       boolean,
  elegibilidade_alerta          text,
  status                        pc_status_registro not null default 'pendente',
  registrado_em                 timestamptz default now(),
  valido_ate                    timestamptz,
  registrado_na_incorporadora_em timestamptz,
  protocolo_incorporadora       text,
  conflito_com_registro_id      uuid references pc_registros_cliente(id),
  origem_registro               text not null default 'painel' check (origem_registro in ('painel', 'formulario_publico')),
  observacoes                   text,
  created_at                    timestamptz default now(),
  updated_at                    timestamptz default now()
);
create index on pc_registros_cliente (owner_id, cliente_telefone);
create index on pc_registros_cliente (owner_id, cliente_cpf_hash);
create index on pc_registros_cliente (owner_id, parceira_id, status);
create index on pc_registros_cliente (owner_id, valido_ate);

create table pc_registro_eventos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users not null default auth.uid(),
  registro_id uuid references pc_registros_cliente(id) on delete cascade not null,
  tipo        text not null check (tipo in ('criado','validado','conflito','visita','proposta','venda','expirado','cancelado','nota')),
  descricao   text,
  criado_por  text not null default 'marcos' check (criado_por in ('marcos','formulario','sistema')),
  created_at  timestamptz default now()
);
create index on pc_registro_eventos (registro_id);

create table pc_comissoes (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references auth.users not null default auth.uid(),
  registro_id         uuid references pc_registros_cliente(id) not null,
  parceira_id         uuid references pc_parceiras(id) not null,
  unidade_id          uuid references pc_unidades(id) not null,
  valor_venda         numeric(14,2) not null,
  comissao_pct        numeric(5,2) not null,
  valor_previsto       numeric(14,2) generated always as (valor_venda * comissao_pct / 100) stored,
  bonus_valor         numeric(14,2),
  status              pc_status_comissao not null default 'prevista',
  previsao_pagamento  date,
  pago_em             date,
  observacoes         text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index on pc_comissoes (owner_id, parceira_id);
create index on pc_comissoes (owner_id, status);

create table pc_campanhas (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references auth.users not null default auth.uid(),
  nome               text not null,
  inicio             date,
  fim                date,
  empreendimento_id  uuid references pc_empreendimentos(id) on delete set null,
  regra              text,
  premio             text,
  ativa              boolean not null default true,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create table pc_config (
  owner_id                        uuid primary key references auth.users,
  validade_registro_dias          int not null default 90,
  conflito_escopo                 text not null default 'empreendimento' check (conflito_escopo in ('empreendimento', 'carteira')),
  salario_minimo_vigente          numeric(10,2),
  limite_registros_por_hora_token int not null default 30,
  texto_rodape_formulario         text
);

-- RLS: owner_id = auth.uid() em tudo, sem exceção (nenhuma policy
-- anônima aqui — o formulário público passa pela service role de uma
-- function, nunca lê/escreve como usuário anônimo direto na tabela).
alter table pc_empreendimentos enable row level security;
alter table pc_unidades enable row level security;
alter table pc_regras_enquadramento enable row level security;
alter table pc_parceiras enable row level security;
alter table pc_parceira_corretores enable row level security;
alter table pc_parceira_comissoes enable row level security;
alter table pc_registros_cliente enable row level security;
alter table pc_registro_eventos enable row level security;
alter table pc_comissoes enable row level security;
alter table pc_campanhas enable row level security;
alter table pc_config enable row level security;

create policy "Owner manages pc_empreendimentos" on pc_empreendimentos for all using (auth.uid() = owner_id);
create policy "Owner manages pc_unidades" on pc_unidades for all using (auth.uid() = owner_id);
create policy "Owner manages pc_regras_enquadramento" on pc_regras_enquadramento for all using (auth.uid() = owner_id);
create policy "Owner manages pc_parceiras" on pc_parceiras for all using (auth.uid() = owner_id);
create policy "Owner manages pc_parceira_corretores" on pc_parceira_corretores for all using (auth.uid() = owner_id);
create policy "Owner manages pc_parceira_comissoes" on pc_parceira_comissoes for all using (auth.uid() = owner_id);
create policy "Owner manages pc_registros_cliente" on pc_registros_cliente for all using (auth.uid() = owner_id);
create policy "Owner manages pc_registro_eventos" on pc_registro_eventos for all using (auth.uid() = owner_id);
create policy "Owner manages pc_comissoes" on pc_comissoes for all using (auth.uid() = owner_id);
create policy "Owner manages pc_campanhas" on pc_campanhas for all using (auth.uid() = owner_id);
create policy "Owner manages pc_config" on pc_config for all using (auth.uid() = owner_id);

-- Views do painel (fase P3 usa; criadas agora porque o P0 já define o
-- schema completo, mas seguras de rodar vazias).
create or replace view pc_v_ranking_parceiras as
select
  p.owner_id,
  p.id as parceira_id,
  p.nome_fantasia,
  date_trunc('month', r.registrado_em) as mes,
  count(*) filter (where true) as registros,
  count(*) filter (where r.status = 'visita') as visitas,
  count(*) filter (where r.status = 'proposta') as propostas,
  count(*) filter (where r.status = 'venda') as vendas,
  coalesce(sum(
    (select min(u.valor_total) from pc_unidades u where u.id = any(r.interesse_unidades))
  ) filter (where r.status not in ('conflito','cancelado','expirado')), 0) as vgv_registrado,
  coalesce(sum(c.valor_venda) filter (where r.status = 'venda'), 0) as vgv_vendido,
  coalesce(sum(c.valor_previsto) filter (where c.status in ('prevista','aprovada')), 0) as comissao_prevista,
  coalesce(sum(c.valor_previsto) filter (where c.status = 'paga'), 0) as comissao_paga
from pc_parceiras p
join pc_registros_cliente r on r.parceira_id = p.id
left join pc_comissoes c on c.registro_id = r.id
group by p.owner_id, p.id, p.nome_fantasia, date_trunc('month', r.registrado_em);

create or replace view pc_v_funil as
select owner_id, status, date_trunc('month', registrado_em) as mes, count(*) as total
from pc_registros_cliente
group by owner_id, status, date_trunc('month', registrado_em);

create or replace view pc_v_por_praca as
select
  p.owner_id,
  p.praca,
  count(*) as registros,
  count(*) filter (where r.status = 'venda') as vendas,
  coalesce(sum(c.valor_venda) filter (where r.status = 'venda'), 0) as vgv_vendido,
  coalesce(sum(c.valor_previsto) filter (where c.status in ('prevista','aprovada')), 0) as comissao_prevista,
  coalesce(sum(c.valor_previsto) filter (where c.status = 'paga'), 0) as comissao_paga
from pc_parceiras p
join pc_registros_cliente r on r.parceira_id = p.id
left join pc_comissoes c on c.registro_id = r.id
group by p.owner_id, p.praca;

create or replace view pc_v_comissoes_a_pagar as
select c.*
from pc_comissoes c
where c.status = 'aprovada';

-- Regra de validade: expira quem passou de valido_ate ainda em
-- pendente/registrado. Função chamável por um cron do Supabase
-- (pg_cron), não agendada automaticamente aqui — decisão de operação,
-- não de schema.
create or replace function pc_expirar_registros_vencidos()
returns void
language sql
security definer
set search_path = public
as $$
  update pc_registros_cliente
  set status = 'expirado', updated_at = now()
  where status in ('pendente', 'registrado')
    and valido_ate < now();
$$;

-- Regra de conflito: chamada no momento de criar um registro (a
-- aplicação chama esta função antes do insert final, ou o insert chama
-- via trigger — ficou como função porque o P1 decide onde encaixar,
-- conflito_escopo é config por owner e precisa do id do novo registro
-- pra não se autocomparar).
create or replace function pc_checar_conflito(
  p_owner_id uuid,
  p_telefone text,
  p_cpf_hash text,
  p_empreendimento_id uuid,
  p_excluir_registro_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_escopo text;
  v_id uuid;
begin
  select conflito_escopo into v_escopo from pc_config where owner_id = p_owner_id;
  v_escopo := coalesce(v_escopo, 'empreendimento');

  select id into v_id
  from pc_registros_cliente
  where owner_id = p_owner_id
    and (id is distinct from p_excluir_registro_id)
    and status in ('registrado', 'visita', 'proposta')
    and valido_ate >= now()
    and (
      (p_telefone is not null and cliente_telefone = p_telefone)
      or (p_cpf_hash is not null and cliente_cpf_hash = p_cpf_hash)
    )
    and (
      v_escopo = 'carteira'
      or empreendimento_id = p_empreendimento_id
      or empreendimento_id is null
      or p_empreendimento_id is null
    )
  order by registrado_em asc
  limit 1;

  return v_id;
end;
$$;

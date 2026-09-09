# Modelo de dados do módulo Parcerias

Todas as tabelas têm `owner_id uuid references auth.users not null` (o corretor dono da
conta, hoje o Marcos), `created_at timestamptz default now()` e `updated_at timestamptz`.
Prefixo `pc_` para não colidir com tabelas do CRM (`lead`, `oportunidade`) nem do
Avaliador (`av_`).

## Enums

```sql
create type pc_enquadramento as enum ('R2V', 'HIS-1', 'HIS-2', 'HMP', 'NR');
create type pc_status_parceira as enum ('prospect', 'em_negociacao', 'ativa', 'pausada', 'encerrada');
create type pc_status_registro as enum (
  'pendente',      -- veio do formulário público, aguarda validação
  'registrado',    -- válido e vigente
  'conflito',      -- já existe registro vigente do mesmo cliente
  'visita',
  'proposta',
  'venda',
  'expirado',      -- passou de valido_ate sem evoluir
  'cancelado'
);
create type pc_perfil_cliente as enum ('investidor', 'moradia', 'estudante', 'outro');
create type pc_status_comissao as enum ('prevista', 'aprovada', 'paga', 'cancelada');
create type pc_tipo_pessoa as enum ('PF', 'PJ');
```

## pc_empreendimentos

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| incorporadora | text | ex.: Chaincorp Incorporações |
| nome | text | ex.: Pina 1875 |
| bairro | text | |
| zona | text | Oeste, Leste, Norte, Sul, Centro |
| endereco | text | |
| cidade | text | default 'São Paulo' |
| uf | char(2) | default 'SP' |
| entrega_prevista | date | primeiro dia do mês |
| estagio | text | lançamento, obras, pronto |
| comissao_pf_pct | numeric(5,2) | |
| comissao_pj_pct | numeric(5,2) | |
| comissao_obs | text | ex.: "até 5% + bônus, ver regulamento" |
| tabela_referencia | text | ex.: Tabelão Chaincorp setembro/2026 |
| tabela_data | date | |
| ativo | boolean | default true |
| observacoes | text | |

Se o Avaliador já tiver uma entidade de imóvel/empreendimento, criar
`av_imovel_id uuid null references ...` aqui e em `pc_unidades`, e não duplicar fotos
ou plantas: esses ficam onde já estão.

## pc_unidades

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| empreendimento_id | uuid fk pc_empreendimentos on delete cascade | |
| identificacao | text | ex.: "146", "13", "Qualquer unidade" |
| torre | text | |
| metragem_privativa | numeric(8,2) | m² |
| tipologia | text | ex.: Studio Garden, 1 Dorm, 3 Dorm (1 Suíte), Loja Térreo |
| dormitorios | smallint | null para NR comercial |
| vagas | smallint | default 0 |
| enquadramento | pc_enquadramento | |
| uso_residencial | boolean | true para NR vendido como residência (ex.: Blue Park 13) |
| condicao_pagamento | text | texto livre do tabelão |
| valor_m2 | numeric(12,2) | null quando não informado |
| valor_total | numeric(14,2) | |
| disponivel | boolean | default true |
| destaque_rede | boolean | true para o que entra no kit da rede |
| observacoes | text | |

Regra de derivação: se `valor_m2` for nulo e `metragem_privativa` > 0, o painel exibe
`valor_total / metragem_privativa` com a marcação "calculado".

## pc_regras_enquadramento

Configurável pelo painel. Nunca fixar no código.

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| enquadramento | pc_enquadramento | |
| renda_familiar_max | numeric(12,2) | em R$ ou nulo |
| renda_em_salarios_minimos | numeric(5,2) | alternativa; o painel calcula com o SM vigente em `pc_config` |
| veda_proprietario_de_imovel | boolean | |
| exige_comprovacao | boolean | |
| texto_orientacao | text | mostrado ao corretor parceiro no formulário |
| vigente_desde | date | |
| fonte | text | ex.: "Decreto municipal nº ..., art. ..." |

Seed inicial: linhas para HIS-2 e HMP com `texto_orientacao` genérico
("unidade com restrição de renda e de titularidade; confirmar elegibilidade com a
incorporadora antes de registrar") e limites em branco. Marcos preenche depois de
confirmar com o jurídico da Chaincorp.

## pc_parceiras

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| nome_fantasia | text | |
| razao_social | text | |
| cnpj | text | só dígitos, validar DV |
| creci_juridico | text | |
| tipo_pessoa | pc_tipo_pessoa | default 'PJ' |
| cidade | text | |
| uf | char(2) | |
| praca | text | agrupador regional, ex.: "Interior SP Norte", "Triângulo Mineiro" |
| responsavel_nome | text | |
| responsavel_telefone | text | E.164 |
| responsavel_email | text | |
| status | pc_status_parceira | default 'prospect' |
| comissao_pct_padrao | numeric(5,2) | pode ser sobrescrita por empreendimento em pc_parceira_comissoes |
| contrato_assinado_em | date | |
| contrato_arquivo_url | text | Supabase Storage, bucket privado |
| token_registro | text unique | gerado no servidor, 32 bytes url-safe; renovável |
| token_ativo | boolean | default true |
| origem | text | como chegou: indicação, prospecção, evento |
| observacoes | text | |

## pc_parceira_corretores

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| parceira_id | uuid fk on delete cascade | |
| nome | text | |
| creci | text | |
| telefone | text | E.164 |
| email | text | |
| ativo | boolean | default true |

## pc_parceira_comissoes (opcional, sobrescrita por empreendimento)

| coluna | tipo |
|---|---|
| id | uuid pk |
| owner_id | uuid |
| parceira_id | uuid fk |
| empreendimento_id | uuid fk |
| comissao_pct | numeric(5,2) |
| observacoes | text |

## pc_registros_cliente

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| parceira_id | uuid fk | not null |
| corretor_id | uuid fk pc_parceira_corretores | null |
| empreendimento_id | uuid fk | null: registro genérico |
| lead_id | uuid fk lead on delete set null | opcional; CRM pode não existir |
| av_cliente_id | uuid fk (entidade de cliente do Avaliador) on delete set null | preenchido pela fase P4 |
| cliente_nome | text | |
| cliente_telefone | text | E.164, obrigatório |
| cliente_email | text | |
| cliente_cpf_hash | text | sha256 dos 11 dígitos; nulo se não informado |
| cliente_cpf_final | char(3) | três últimos dígitos, só para exibição |
| cidade_origem | text | |
| uf_origem | char(2) | |
| perfil | pc_perfil_cliente | |
| interesse_unidades | uuid[] | ids de pc_unidades |
| faixa_renda_declarada | numeric(12,2) | preenchido só quando há unidade HIS/HMP no interesse |
| possui_imovel_declarado | boolean | idem |
| elegibilidade_alerta | text | texto gerado pela checagem; nulo se ok |
| status | pc_status_registro | |
| registrado_em | timestamptz | |
| valido_ate | timestamptz | registrado_em + validade em dias de pc_config |
| registrado_na_incorporadora_em | timestamptz | |
| protocolo_incorporadora | text | |
| conflito_com_registro_id | uuid fk pc_registros_cliente | preenchido quando status = conflito |
| origem_registro | text | 'painel' ou 'formulario_publico' |
| observacoes | text | |

Índices: `(owner_id, cliente_telefone)`, `(owner_id, cliente_cpf_hash)`,
`(owner_id, parceira_id, status)`, `(owner_id, valido_ate)`.

## pc_registro_eventos (histórico)

| coluna | tipo |
|---|---|
| id | uuid pk |
| owner_id | uuid |
| registro_id | uuid fk on delete cascade |
| tipo | text (criado, validado, conflito, visita, proposta, venda, expirado, cancelado, nota) |
| descricao | text |
| criado_por | text ('marcos', 'formulario', 'sistema') |
| created_at | timestamptz |

## pc_comissoes

| coluna | tipo | obs |
|---|---|---|
| id | uuid pk | |
| owner_id | uuid | |
| registro_id | uuid fk | |
| parceira_id | uuid fk | desnormalizado para ranking |
| unidade_id | uuid fk | |
| valor_venda | numeric(14,2) | |
| comissao_pct | numeric(5,2) | copiada no momento da venda, não referenciada |
| valor_previsto | numeric(14,2) | valor_venda × comissao_pct / 100 |
| bonus_valor | numeric(14,2) | campanha, se houver |
| status | pc_status_comissao | |
| previsao_pagamento | date | |
| pago_em | date | |
| observacoes | text | |

## pc_campanhas

| coluna | tipo |
|---|---|
| id | uuid pk |
| owner_id | uuid |
| nome | text |
| inicio, fim | date |
| empreendimento_id | uuid fk null (nulo = todos) |
| regra | text (descrição livre) |
| premio | text |
| ativa | boolean |

## pc_config (uma linha por owner)

| coluna | tipo | padrão |
|---|---|---|
| owner_id | uuid pk | |
| validade_registro_dias | int | 90 |
| conflito_escopo | text | 'empreendimento' ou 'carteira' (padrão 'empreendimento') |
| salario_minimo_vigente | numeric(10,2) | |
| limite_registros_por_hora_token | int | 30 |
| texto_rodape_formulario | text | |

## Regras de negócio (implementar em função SQL ou na camada de API, com teste)

**Validade.** `valido_ate = registrado_em + validade_registro_dias`. Rotina diária
(cron do Supabase ou função agendada) marca `expirado` o que passou de `valido_ate`
em status `registrado` ou `pendente`.

**Conflito.** Ao criar um registro, buscar registro vigente (status em
`registrado, visita, proposta` e `valido_ate >= now()`) do mesmo owner com mesmo
`cliente_telefone` ou mesmo `cliente_cpf_hash`. Se `conflito_escopo = 'empreendimento'`,
só conta quando o `empreendimento_id` é o mesmo ou quando um dos dois é nulo. Havendo
conflito: novo registro nasce com status `conflito` e `conflito_com_registro_id`
apontando para o vigente. O primeiro registro válido prevalece; Marcos pode
sobrescrever manualmente com nota em `pc_registro_eventos`.

**Elegibilidade.** Se qualquer unidade em `interesse_unidades` tiver enquadramento
HIS-1, HIS-2 ou HMP, o formulário exige `faixa_renda_declarada` e
`possui_imovel_declarado`. Comparar com `pc_regras_enquadramento`. Se ultrapassar a
renda máxima ou for proprietário quando vedado, o registro é aceito mas recebe
`elegibilidade_alerta` e entra na fila como `pendente`. Nunca bloquear silenciosamente:
o corretor parceiro vê a orientação na hora.

**Comissão.** Percentual: `pc_parceira_comissoes` se existir, senão
`pc_parceiras.comissao_pct_padrao`, senão `pc_empreendimentos.comissao_pj_pct` (ou `pf`
conforme `tipo_pessoa`). Copiado para `pc_comissoes` no momento em que o registro vira
`venda`.

## Views para o painel

- `pc_v_ranking_parceiras`: por parceira e mês: registros, visitas, propostas, vendas,
  VGV registrado (soma do valor das unidades de interesse, menor valor quando houver
  várias), VGV vendido, comissão prevista, comissão paga.
- `pc_v_funil`: contagem por status no período.
- `pc_v_por_praca`: mesmo que ranking, agrupado por `praca`.
- `pc_v_comissoes_a_pagar`: status `aprovada` com `previsao_pagamento`.

## RLS

- Todas as tabelas `pc_*`: `owner_id = auth.uid()` para select, insert, update, delete.
- Formulário público: nenhuma policy anônima. As inserções vindas do formulário passam
  por uma função (Netlify Function ou Edge Function) que valida `token_registro`,
  `token_ativo` e `status = 'ativa'` da parceira, aplica o limite por hora e insere com
  a service role, preenchendo `owner_id` a partir da parceira. O token nunca vai para o
  navegador em texto de URL compartilhável sem HTTPS.
- `contrato_arquivo_url` em bucket privado com URL assinada de curta duração.

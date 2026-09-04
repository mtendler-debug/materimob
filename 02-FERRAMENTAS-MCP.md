# 02 — Ferramentas do agente e modelo de dados

Duas camadas, não confundir:

- **Ferramentas do agente (tool use na chamada à Claude API):** o que o modelo pode
  fazer durante a conversa com o cliente. São funções no código, todas contra o
  Supabase e a API do WhatsApp.
- **MCPs no Claude Code (desenvolvimento):** o que o Claude Code usa para construir e
  publicar. Já existem: Netlify (deploy, logs), GitHub. Adicionar: Supabase MCP
  (tabelas, SQL, RLS). Não é preciso um "MCP do WhatsApp" para desenvolver; a API da
  Meta é chamada por HTTP no código.

## Ferramentas do agente (definições para tool use)

### buscar_imoveis
Busca na carteira. Retorna no máximo 6, ordenados por aderência.
```json
{ "name": "buscar_imoveis",
  "input_schema": { "type": "object", "properties": {
    "finalidade": { "enum": ["morar","investir","qualquer"] },
    "bairros": { "type": "array", "items": { "type": "string" } },
    "tipo": { "enum": ["studio","1dorm","2dorms","3dorms","4dorms","cobertura","qualquer"] },
    "area_min": { "type": "number" }, "area_max": { "type": "number" },
    "valor_max": { "type": "number" },
    "estagio": { "enum": ["pronto","obras","lancamento","qualquer"] },
    "excluir_ids": { "type": "array", "items": { "type": "string" } }
  } } }
```
Saída por imóvel: `id, nome, empreendimento, bairro, endereco_curto, area, dorms,
vagas, valor, estagio, entrega_prevista, diferencial, foto_capa_url`.

### obter_lead
Entrada: `telefone`. Saída: `existe, lead_id, nome, perfil (mesmos campos da busca),
etapa_funil, imoveis_apresentados[], visitas[], ultima_interacao, resumo`.

### criar_ou_atualizar_lead
Entrada: `telefone, nome?, perfil?, origem?`. Cria em `leads` se não existir; grava
perfil em `lead_perfil`. Saída: `lead_id`.

### registrar_interacao
Entrada: `lead_id, tipo (mensagem_cliente | mensagem_agente | imovel_apresentado |
interesse | handoff), payload`. Vai para `interacoes`. Alimenta o histórico do CRM.

### criar_selecao_avaliador
Entrada: `lead_id, imovel_ids[]`. Cria `av_selections` (com `lead_id`, opcional na
tabela) e os `av_selection_items`. Saída: `selecao_id, link_publico` (acesso por
token, como já funciona no Avaliador).

### agendar_visita
Entrada: `lead_id, imovel_id, data_hora, observacoes?`. Grava em `visitas`, move o
lead para etapa `Visita` no funil. Saída: `visita_id, confirmacao_texto`.

### enviar_mensagem_whatsapp
Entrada: `telefone, tipo (texto | imagem), texto, imagem_url?`. Chama a Cloud API.
Registra em `mensagens`. Respeitar a janela de 24h: fora dela, só template aprovado.

### notificar_marcos
Entrada: `lead_id, motivo, resumo`. Envia mensagem de WhatsApp para o próprio número
do Marcos (ou push no painel) e marca a conversa como `encerrado`.

### definir_estado_conversa
Entrada: `telefone, estado, pausa_ate?`. Usada pelos comandos `#mater` e pelo painel.

## Modelo de dados (Supabase, além do que o MaterImob já tem)

```sql
create table conversas_agente (
  telefone text primary key,
  corretor_id uuid references corretores(id),
  lead_id uuid references leads(id) on delete set null,
  agente_ativo boolean default false,
  estado text default 'inativo',
  pausa_ate timestamptz,
  ultimo_humano_em timestamptz,
  ultima_mensagem_em timestamptz,
  resumo text,
  criado_em timestamptz default now()
);

create table mensagens (
  id uuid primary key default gen_random_uuid(),
  telefone text references conversas_agente(telefone),
  direcao text,          -- 'cliente' | 'agente' | 'marcos_app'
  wa_message_id text unique,
  tipo text,
  conteudo text,
  midia_url text,
  criado_em timestamptz default now()
);

create table imoveis (       -- se ainda não existir na carteira
  id uuid primary key default gen_random_uuid(),
  corretor_id uuid,
  nome text, empreendimento text, incorporadora text,
  bairro text, endereco text,
  tipo text, area numeric, dorms int, vagas int,
  valor numeric, estagio text, entrega_prevista date,
  diferencial text, foto_capa_url text, fotos jsonb,
  ativo boolean default true,
  atualizado_em timestamptz default now()
);

create table visitas (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  imovel_id uuid references imoveis(id),
  data_hora timestamptz, status text default 'agendada', observacoes text
);
```
RLS: tudo filtrado por `corretor_id` (multi-corretor desde o início, como a
ARQUITETURA-SAAS já prevê). A função do webhook usa a service key; o painel usa
Supabase Auth.

## Segredos (variáveis de ambiente no Netlify, nunca no código)
`ANTHROPIC_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (validar assinatura do webhook),
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `MARCOS_TELEFONE`, `JANELA_HUMANO_MIN=30`.

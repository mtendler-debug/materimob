# MaterImob — contexto para o Claude Code

## O que é

MaterImob é a plataforma de Marcos Tendler, corretor de imóveis em São Paulo (Mater
Estate) — e, desde setembro/2026, também Coordenador de Parcerias da Chaincorp
Incorporações. Uma conta só cobre os dois papéis: corretor autônomo e coordenador de
canal de parcerias, mais o que vier depois. Ver "Papéis do Marcos" abaixo.

Dois módulos hoje em produção (`materimob.com.br`), mais dois em construção:
- **Avaliador** — cada corretor monta um roteiro de imóveis, o cliente avalia por um
  link público e o corretor acompanha pelo painel. Gratuito.
- **CRM** — pipeline de leads e oportunidades. Pago por organização (ou pessoa física,
  no futuro).
- **Agente de WhatsApp** — Fase 1 (Porteiro e eco) no ar; qualifica e responde clientes
  pelo WhatsApp do Marcos. Ver `CLAUDE.md`... este mesmo arquivo, seção própria abaixo.
- **Parcerias** — painel de gestão do canal de imobiliárias parceiras da Chaincorp.
  Fase P0 (banco) no ar; telas ainda não construídas.

## Stack atual — isto é o que vale, não o que documentos antigos descrevem

- **Frontend:** Vite + React + React Router. Tailwind via `@tailwindcss/vite`.
- **Backend:** Supabase — Postgres, Auth, RLS, Storage, Edge Functions (Deno).
- **Hospedagem:** Netlify, deploy contínuo a partir do GitHub (push na `main` publica).
  Netlify Functions também hospedam o webhook do agente de WhatsApp.
- **Sem framework pesado nenhum documento antigo pode dizer o contrário** — se um
  material novo mencionar "HTML/CSS/JS puro" ou "sem Node.js", é sobre uma versão
  anterior do projeto, não a atual. Ver "Documentos históricos" abaixo.

## Documentos históricos (não são o estado atual)

`LEIA-ME.md` e `ARQUITETURA-SAAS.md`, na raiz do repo, descrevem o protótipo anterior
(Netlify Blobs, três páginas HTML estáticas, um cliente de teste) e o plano de
rearquitetura que produziu o repositório atual. Úteis pra entender de onde a fórmula de
ranking e o modelo `av_*` vieram — não são a verdade sobre o código de hoje. Se algo
neles conflitar com o schema/código atual, o schema/código atual vence.

## Modelo de dados — visão geral

- `profiles.account_type` (`corretor`/`imobiliaria`/`incorporadora`) decide só a "casa"
  do usuário (rota de entrada e menu principal) — nunca uma parede. Pertencer a uma
  `organization` (via `organization_members`) acrescenta área ao menu, nunca substitui a
  casa. O corretor é a entidade permanente; a organização é um chapéu que ele usa às
  vezes, e ele pode sair dela e voltar a `corretor` autônomo a qualquer momento
  (`organization_members` tem política de saída voluntária + trigger que impede ficar
  sem diretor + trigger que reseta `account_type`).
- Avaliador: `av_selections`, `av_properties`, `av_units`, `av_evaluations`,
  `av_proposals`, `av_clients` (cliente é compartilhado entre corretores — o mesmo
  telefone pode ter roteiros de mais de um corretor; "ativo/inativo" por corretor fica
  em `av_client_relations`, nunca direto em `av_clients`).
  `av_criteria_presets`, `av_portfolio_properties`/`av_portfolio_units` (portfólio de
  imobiliária), `av_launches`/`av_launch_units` (lançamento de incorporadora).
  Toda tabela usa `user_id uuid references auth.users not null default auth.uid()` +
  RLS `using (auth.uid() = user_id)` como padrão — copiar esse padrão em tabela nova.
- CRM: `av_leads`, `av_opportunities`. Acesso pago via `has_crm_access()`.
- Multi-organização: `organizations`, `organization_members`, `organization_invites`.
- Agente de WhatsApp: `conversas_agente`, `mensagens` (ver seção própria abaixo).
- Parcerias: `pc_*` (11 tabelas, prefixo pra não colidir com `av_`/CRM). Todas usam
  `owner_id` em vez de `user_id` — mesmo padrão de RLS, nome de coluna diferente porque
  o documento original assim definiu.

## Convenções de trabalho

- **Migrações:** arquivos soltos `supabase/migrations_<assunto>.sql` na raiz de
  `supabase/` (não uma pasta `migrations/` numerada — apesar do que um documento externo
  possa sugerir). Aplicar com `npx supabase db query --linked --file <arquivo>`. Nunca
  reescrever uma migração já aplicada; criar uma nova.
- **`auth.users` não aceita mais insert direto pelo SQL Editor** (mudança de permissão
  da própria Supabase, 2026-08-27). Conta de teste descartável: painel do Supabase
  (Authentication → Users → Add user), não SQL.
- **Testar RLS de verdade, não só por leitura de código:** dentro de uma sessão
  `supabase db query`, `set local role authenticated; set local
  request.jwt.claim.sub = '<uuid>';` faz o Postgres aplicar as políticas como se fosse
  aquele usuário — a conexão normal roda com `service_role`/bypassa RLS. Usado e
  confirmado no módulo Parcerias.
- **`git push` não funciona neste ambiente sandboxed** (sem credencial do GitHub). Pedir
  ao Marcos pra publicar pelo GitHub Desktop, depois confirmar com `git fetch` + `git
  log origin/main..HEAD`.
- **Marcos não é desenvolvedor.** Evitar jargão, preferir caminho gráfico a terminal,
  testar tudo antes de pedir uma ação manual dele, avisar com clareza quando uma decisão
  tiver risco escondido.
- **Design:** Fraunces (serif) + IBM Plex Sans, tokens
  `--color-bg:#f7f5f2 --color-charcoal:#1c1c1c --color-gold:#a68a5b
  --color-graytext:#5c5c5c --color-light:#edeae4 --color-rule:#e2ded6
  --color-muted:#9a9a9a`. Borda, não sombra. Prototipar mudança de layout como Artifact e
  aprovar antes de tocar em componente React.

---

# Agente de WhatsApp — contexto específico do módulo

Agente conversacional de WhatsApp da MaterImob. Atende leads no número comercial do
Marcos, apresenta imóveis da carteira dele, monta seleções no Avaliador pro cliente
comparar e registra no CRM.

Leia, nesta ordem: `01-AGENTE-COMPORTAMENTO.md`, `02-FERRAMENTAS-MCP.md`,
`03-FLUXO-E-INFRA.md`.

## Decisões fechadas (não reabrir sem motivo)
1. **Canal: WhatsApp Cloud API em modo Coexistência.** O número do Marcos já está no
   WhatsApp Business App e continua nele. A API é conectada por cima, via parceiro Meta
   (BSP) que suporte Coexistência. Nunca usar Evolution API, Baileys, WPPConnect ou
   qualquer biblioteca do protocolo WhatsApp Web: risco de banimento do número principal.
2. **Base de imóveis: só a carteira do MaterImob.** Nenhuma raspagem de ZAP, Viva Real,
   OLX ou portais.
3. **O agente é opt-in por conversa.** `agente_ativo = true` explícito. Silêncio é o
   padrão.
4. **Marcos sempre vence.** Eco da mensagem dele pausa o agente naquela conversa (janela
   padrão: 30 minutos).
5. **Cérebro: Claude API** (modelo Sonnet mais recente), com tool use. Estado e memória
   ficam no Supabase, nunca só no contexto do modelo.
6. **Onde roda:** Netlify Function (`netlify/functions/whatsapp.mjs`), mesmo
   repositório, mesmo banco.
7. **Proposta e negociação nunca passam pelo agente.** Ele qualifica, apresenta, monta
   roteiro e agenda. Dinheiro é com o Marcos.

## Fases (ver 03-FLUXO-E-INFRA.md)
0. Coexistência de verdade via BSP — ainda no número de teste da Meta.
1. **Porteiro + eco — shipped e testado com celular real, 2026-09-04/09.**
2. Identificação e qualificação de lead — não iniciada.
3. Busca e apresentação de imóveis.
4. Seleção no Avaliador + agendamento + CRM.
5. Painel liga/desliga dentro do MaterImob e comandos por WhatsApp.
6. Testes com número de teste, depois produção.

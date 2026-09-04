# MaterImob Agente — contexto para o Claude Code

## O que é
Agente conversacional de WhatsApp da MaterImob, plataforma do corretor Marcos Tendler
(Mater Imóveis, São Paulo). O agente atende leads no número comercial do Marcos,
apresenta imóveis da carteira dele, monta seleções no módulo Avaliador para o cliente
comparar e registra tudo no CRM.

Leia, nesta ordem: `01-AGENTE-COMPORTAMENTO.md`, `02-FERRAMENTAS-MCP.md`,
`03-FLUXO-E-INFRA.md`. Se existir na máquina, leia também a pasta `avaliador-materimob`
(LEIA-ME.md, ARQUITETURA-SAAS.md, FASE-0-REPOSITORIO-NOVO.md): ela descreve a plataforma
onde o agente se encaixa.

## Decisões fechadas (não reabrir sem motivo)
1. **Canal: WhatsApp Cloud API em modo Coexistência.** O número do Marcos já está no
   WhatsApp Business App e continua nele. A API é conectada por cima, via parceiro Meta
   (BSP) que suporte Coexistência. Nunca usar Evolution API, Baileys, WPPConnect ou
   qualquer biblioteca do protocolo WhatsApp Web: risco de banimento do número principal.
2. **Base de imóveis: só a carteira do MaterImob (tabela `imoveis` no Supabase).**
   Nenhuma raspagem de ZAP, Viva Real, OLX ou portais. Portais são origem de lead, não
   fonte de busca. Feeds XML de parceiros ficam para uma fase futura.
3. **O agente é opt-in por conversa.** Ele nunca fala com um número que não esteja
   explicitamente marcado como `agente_ativo = true`. Silêncio é o padrão.
4. **Marcos sempre vence.** Se ele responder manualmente pelo celular, o agente se cala
   naquela conversa (janela padrão: 30 minutos, configurável).
5. **Cérebro: Claude API** (modelo Sonnet mais recente), com ferramentas (tool use).
   Estado da conversa e memória ficam no Supabase, nunca só no contexto do modelo.
6. **Onde roda:** função serverless no mesmo repositório do MaterImob novo
   (Netlify Functions + Supabase), publicada por push no GitHub. Mesma stack, mesmo
   banco, mesma autenticação. Alternativa aceita se o Marcos preferir: n8n, como no
   projeto Florence.
7. **Proposta e negociação nunca passam pelo agente.** Ele qualifica, apresenta,
   monta roteiro e agenda. Dinheiro é com o Marcos.

## Regras de trabalho com o Marcos
- Ele não é desenvolvedor e toca isso entre atendimentos. Evitar jargão.
- Preferir caminhos gráficos (painéis web, apps) a linha de comando. Quando o terminal
  for inevitável, entregar o comando pronto, um por vez, explicando o que faz.
- Testar tudo o que der localmente antes de pedir uma publicação ou uma ação manual.
- Quando um caminho proposto tiver risco escondido, dizer com clareza e oferecer a
  alternativa. Ele decide bem quando tem a informação.
- Textos que o agente envia ao cliente: português do Brasil, elegantes, curtos, sem
  travessão, sem cara de robô. Tom de curadoria, não de catálogo.

## Fases (ver 03-FLUXO-E-INFRA.md)
0. Conta e conexão Coexistência (Marcos faz no painel do parceiro; Claude Code prepara
   o webhook e valida).
1. Porteiro + eco: receber mensagem, decidir se responde, registrar.
2. Identificação e qualificação de lead.
3. Busca e apresentação de imóveis.
4. Seleção no Avaliador + agendamento + CRM.
5. Painel liga/desliga dentro do MaterImob e comandos por WhatsApp.
6. Testes com número de teste, depois produção.

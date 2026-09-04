# 03 — Fluxo, infraestrutura e roteiro de execução

## Arquitetura
```
Cliente (WhatsApp) ──► Meta Cloud API ──► webhook /api/whatsapp (Netlify Function)
                                              │
Marcos (celular, app) ──► eco smb_message_echoes ──┤
                                              ▼
                                         Porteiro (regras 01)
                                              │
                                    Supabase (estado, CRM, imóveis)
                                              │
                                     Claude API + ferramentas
                                              │
                                   Cloud API (resposta) ──► Cliente
```

## Fase 0 — Conexão em Coexistência (Marcos, pelo navegador)
A Coexistência só é ativada por um parceiro Meta (BSP) via "Embedded Signup". O Marcos
escolhe um parceiro que ofereça Coexistência e repasse os webhooks para uma URL
própria (exemplos: 360dialog, Kapso, YCloud; Claude Code deve verificar a
documentação atual do parceiro escolhido). Pré-requisitos:
- Número já no WhatsApp Business App (versão 2.24.17 ou superior) ✔
- Empresa verificada no Meta Business Manager (o Marcos já tem conta de negócios do
  projeto Florence; verificar se está com verificação de empresa concluída)
- Método de pagamento cadastrado na conta WhatsApp Business
Passos no parceiro: Conectar número → escolher "WhatsApp Business App" → login com
Facebook → escanear QR no celular → autorizar compartilhar histórico e contatos.
Depois: cadastrar a URL do webhook (`https://<site>.netlify.app/api/whatsapp`) e o
verify token. Enquanto isso não sai, usar o número de teste da Meta já validado
(+1 555 360 4049, phone_number_id 1262439750287374) para desenvolver.

## Fase 1 — Porteiro e eco
Claude Code cria `netlify/functions/whatsapp.mjs`:
- GET: verificação do webhook (hub.challenge).
- POST: valida assinatura `X-Hub-Signature-256`, deduplica por `wa_message_id`,
  grava em `mensagens`, roteia: eco do Marcos → `ultimo_humano_em`; comando `#mater`
  → `definir_estado_conversa`; mensagem de cliente → Porteiro.
- Responde 200 em menos de 5 s sempre; processamento pesado em segundo plano
  (Netlify Background Function ou fila simples em tabela).
Teste: mandar mensagem do número de teste, ver a linha em `mensagens`, confirmar que
sem `agente_ativo` nada é respondido.

## Fase 2 — Identificação e qualificação
Implementar `obter_lead`, `criar_ou_atualizar_lead`, `registrar_interacao` e a
chamada à Claude API com o system prompt de 01, injetando estado e histórico
(últimas 20 mensagens + `resumo`). Após cada troca, atualizar `resumo` (uma chamada
curta ao modelo).

## Fase 3 — Busca e apresentação
`buscar_imoveis` com relaxamento de filtros, envio de cards com imagem. Popular
`imoveis` com a carteira atual do Marcos (ele fornece planilha; Claude Code faz a
importação).

## Fase 4 — Avaliador, visitas, CRM
`criar_selecao_avaliador` reaproveitando a lógica do Avaliador em produção,
`agendar_visita`, `notificar_marcos`, webhook interno do Avaliador de volta ao agente
(quando entram notas).

## Fase 5 — Painel liga/desliga
Página no MaterImob: lista de conversas (nome, telefone, estado, última mensagem),
interruptor por conversa, interruptor geral, botão "assumir" (= off) e "devolver ao
agente" (= on). Configuração da janela humana e do texto de handoff.

## Fase 6 — Testes e produção
Roteiro de teste com 5 personas (lead novo investidor, lead novo morador, retorno,
cliente que pede desconto, contato pessoal que não é cliente). Só depois ligar no
número real. Primeira semana: agente ativo apenas em conversas que o Marcos ligar
manualmente; interruptor geral desligado.

## Custos previstos
- Meta: conversas de serviço iniciadas pelo cliente são gratuitas dentro da janela
  de 24h; templates fora da janela têm custo por mensagem.
- Parceiro (BSP): mensalidade, varia por fornecedor.
- Claude API: pequeno por conversa (mensagens curtas).
- Supabase e Netlify: planos já existentes.

## Prompt inicial para colar no Claude Code
```
Leia CLAUDE.md, 01-AGENTE-COMPORTAMENTO.md, 02-FERRAMENTAS-MCP.md e
03-FLUXO-E-INFRA.md nesta pasta. Depois leia a pasta avaliador-materimob se existir.
Confirme em 5 linhas o que entendeu e me proponha o plano da Fase 1 (Porteiro e eco),
listando o que você faz sozinho e o que depende de mim. Não escreva código ainda.
```

# Mapa de encaixe — Gamificação no projeto real

Lido: `CLAUDE.md`, `00-LEIA-ME-PARCERIAS.md`, `01-MODELO-DE-DADOS-PARCERIAS.md`,
`02-TELAS-E-FLUXOS-PARCERIAS.md`, `supabase/migrations_parcerias_p0.sql`,
`src/App.jsx`. Isto é o que existe hoje e onde cada peça do documento de gamificação
se encaixa — antes de começar a Fase G0.

## 0. Um bloqueio que precisa de decisão antes de tudo

O próprio documento de gamificação diz: "só começar depois que o registro de
clientes com validação e mudança de status estiver funcionando de forma estável,
porque os pontos dependem dele."

**Hoje só a Fase P0 do módulo Parcerias existe — o banco.** `pc_registros_cliente`
tem a coluna `status` certinha (pendente → registrado → visita → proposta → venda),
mas **não existe nenhuma tela**: nem a fila de validação do gestor, nem o formulário
de registro (nem o do Marcos logado, nem o público por token), nem a página da
parceira. Ou seja: hoje nada muda o `status` de um registro, porque não existe
lugar pra clicar em "validar" ou "avançar pra visita".

**Isso significa que a Fase G0 da gamificação não tem nenhum fato real pra
observar ainda.** As opções:

1. Construir primeiro as Fases P1 e P2 do módulo Parcerias (telas de parceira,
   registro interno, formulário público, fila de validação) — aí sim G0 tem status
   mudando de verdade pra pontuar. Mais devagar no começo, mas cada fase já nasce
   testável com dado real.
2. Construir G0 mesmo assim (o banco da gamificação, os gatilhos, os cálculos),
   testado só com dado fabricado em SQL — e ligar às telas quando P1/P2 existirem.
   Mais rápido agora, mas fica invisível/não demonstrável até P1/P2 saírem.

Este mapa segue as duas opções em paralelo pra você decidir com a informação toda
na mão — não decidi sozinho porque muda a ordem de várias semanas de trabalho.

## 1. Tabelas novas (prefixo `pc_`, mesmo padrão de `owner_id`/RLS do resto do módulo)

| Documento | Nome proposto | Observação |
|---|---|---|
| Regra de pontos por ação | `pc_regras_pontos` | Tabela versionada por vigência — nunca UPDATE, só INSERT de uma linha nova com `vigente_desde`; o evento copia o valor no momento, como o doc pede. |
| Níveis | `pc_niveis` | Bronze/Prata/Ouro/Platina com limiar editável. Nível nunca é coluna gravada em lugar nenhum — sempre calculado. |
| Evento de pontos | `pc_pontos_eventos` | O coração do sistema. `corretor_id → pc_parceira_corretores`, `tipo_acao`, `pontos`, `origem_tabela`/`origem_id` (pra unicidade por fato), `estorno_de_id` (auto-referência), `criado_por` ('sistema'/'gestor'+nome). RLS: sem UPDATE nem DELETE pra ninguém, nem o gestor — bate com a seção 12 do documento. |
| Certificação (quiz) | `pc_quiz_perguntas`, `pc_certificacoes` | Perguntas por `empreendimento_id` (já existe `pc_empreendimentos`); certificação grava a tentativa e a aprovação. |
| Apresentação | `pc_apresentacoes` | `corretor_id`, `empreendimento_id`, hash do telefone do cliente — mesma ideia de hash que `pc_registros_cliente.cliente_cpf_hash` já usa, só que de telefone. |
| Missão | `pc_missoes`, `pc_missoes_cumpridas` | `praca`/`empreendimento_id` opcionais, igual o doc pede. |
| Campanha de pontos | **reaproveitar `pc_campanhas`**, acrescentando `praca text`, `multiplicador numeric`, `acao_alvo text` | Já existe uma tabela `pc_campanhas` (nome, início, fim, empreendimento, regra, prêmio) — é uma campanha *comercial* genérica, não tem praça nem multiplicador numérico hoje. Em vez de criar uma segunda tabela "campanha", a proposta é estender essa: mesmo conceito (período + regra), só faltam os campos que a gamificação precisa. Se preferir manter as duas ideias completamente separadas, aviso o motivo de não ter feito isso — mas do jeito que o schema já existe, estender é mais simples e evita duas telas de "campanha" parecidas. |
| Prêmio e resgate | `pc_premios`, `pc_resgates` | Três tipos de prêmio (nível/troca/ranking) como campo `tipo` com check constraint. |
| Configuração | **reaproveitar `pc_config`**, acrescentando `validade_pontos_meses`, `multiplicador_padrao`, `link_clube` | `pc_config` já é "uma linha por owner" com esse exato formato (validade de registro, limite por hora). Os números da gamificação (validade de pontos, link do clube) entram como colunas novas na mesma linha, não uma tabela nova. |

## 2. O que já existe e é reaproveitado direto, sem mudança de schema

- **Fatos que geram pontos automáticos** (cliente registrado, visita, proposta,
  venda): todos já são só mudanças de `pc_registros_cliente.status`. Um gatilho
  `AFTER UPDATE` nessa tabela, comparando `old.status` com `new.status`, é o único
  lugar que precisa de código novo pra esses quatro — nenhuma tela nova grava
  ponto diretamente.
- **Praça**: já existe em `pc_parceiras.praca`. Ranking por praça é só agrupar
  `pc_pontos_eventos` por `pc_parceira_corretores.parceira_id → pc_parceiras.praca`.
- **A fila de validação do gestor** (seção 2 do doc de gamificação, "a validação
  continua sendo a que já existe"): ainda não existe tela nenhuma pra isso — é a
  Fase P2 do módulo Parcerias, não algo que a gamificação cria. Ver seção 0 acima.
- **CNPJ/nome/praça da imobiliária, dados do corretor da parceira**: `pc_parceiras`
  e `pc_parceira_corretores`, sem mudança.
- **RLS do lado do gestor**: mesmo padrão `owner_id = auth.uid()` de toda tabela
  `pc_*` — o Marcos já tem esse acesso garantido em qualquer tabela nova que eu
  criar seguindo o padrão.

## 3. A peça que falta e o documento presume que existe: acesso do corretor da parceira

O documento diz "acesso pelo mesmo mecanismo que o projeto já usa para corretores
de parceiras... não criar um novo sistema de acesso." **Esse mecanismo ainda não
existe.** `pc_parceira_corretores` hoje é só um cadastro (nome, CRECI, telefone,
e-mail) — não é uma conta, não tem login, não tem token. Ninguém constrói isso
ainda porque também é Fase P1/P2, não gamificação.

Proposta, seguindo o padrão que o projeto já usa em outro lugar (`av_clients.token`,
`pc_parceiras.token_registro` — token opaco gerado no servidor, sem senha): acrescentar
`token_acesso` em `pc_parceira_corretores`, e o painel do corretor (`Meu painel`,
`Ranking`, etc.) vira uma função pública tipo `aval-form`/`aval-panel`: sem JWT,
valida o token, `service_role` por trás, nunca RLS direto. O dono da imobiliária
parceira usa o mesmo mecanismo, um nível acima (vê todos os corretores da própria
`pc_parceiras.id`).

Isso é trabalho de infraestrutura de acesso que tanto o registro-de-cliente público
(P2) quanto a gamificação (G1/G3) precisam — outro motivo pra considerar fazer P1/P2
antes ou junto, não depois.

## 4. Telas — mapeamento direto, sem surpresa

- **Painel do corretor** (seção 11.1) → rotas novas dentro do domínio público por
  token, ao lado de `/c/:token` e `/r/:token` que já existem pro Avaliador.
- **Painel do dono da parceira** (11.2) → mesma rota pública, versão com abas de
  equipe.
- **Painel do gestor** (11.3) → nova seção "Gamificação" dentro de `/app/parcerias`
  (que ainda não existe — ver seção 0), React normal, autenticado, mesmo padrão de
  `Organization.jsx`/`Dashboard.jsx`.
- **Cartão na ficha da parceira** (fim da seção 11) → mesma ficha de parceira da
  Fase P1, adicionando um cartão só-leitura.

## 5. Resumo da decisão pendente

Preciso que você escolha entre as duas opções da seção 0 antes de eu tocar em
código:

**A.** Construir P1 + P2 do módulo Parcerias primeiro (telas de parceira, registro
interno, formulário público, fila de validação, e o token de acesso do corretor
da parceira) — depois G0 em cima de dado real.

**B.** Construir G0 da gamificação agora (banco, gatilhos, cálculos, testado com
dado fabricado), sem nenhuma tela ainda — P1/P2 e as telas da gamificação (G1+)
vêm depois, todas juntas.

Também preciso de um sim/não sobre reaproveitar `pc_campanhas` e `pc_config` em vez
de criar tabelas paralelas (seção 1) — é a escolha mais simples dado o que já
existe, mas é sua chamada.

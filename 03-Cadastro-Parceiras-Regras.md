# Módulo Parcerias — cadastro de parceiras: campos e regras

Este documento complementa o pacote já enviado (00-LEIA-ME, 01-Modelo de dados, 02-Telas e fluxos) especificamente sobre como uma parceira (imobiliária ou corretor autônomo) entra e evolui dentro do módulo Parcerias. Descreve os campos e a lógica; a estrutura real de tabelas e telas fica a critério do Claude Code, encaixando no que já existe no projeto.

## 1. O que é uma "parceira"

Uma parceira é uma imobiliária ou corretor autônomo fora da carteira própria do Marcos, que pode vender o portfólio ativo da incorporadora (hoje, Chaincorp) para os próprios clientes. O cadastro de uma parceira é independente do cadastro de cliente/lead já existente no CRM — são entidades relacionadas, não a mesma coisa.

## 2. Campos do cadastro de parceira

| Campo | Natureza | Observação |
|---|---|---|
| Nome da parceira | obrigatório | imobiliária ou nome do corretor autônomo |
| Cidade / região de atuação | obrigatório | onde a carteira de clientes da parceira está concentrada |
| CRECI | opcional | quando disponível; útil para validar formalmente a parceria depois |
| Segmento / foco de produto | obrigatório, texto livre + a possibilidade de mais de uma tag | ex.: alto padrão, lançamentos, popular/MCMV, locação, rural. Uma parceira pode ter mais de um foco |
| Nome do contato principal | obrigatório | quem decide ou influencia a decisão: sócio, administrador ou gerente comercial |
| Telefone / WhatsApp do contato | obrigatório para avançar do status inicial | ver regra 4.2 |
| E-mail do contato | opcional | |
| Origem do cadastro | obrigatório, valor fixo entre algumas opções | ver regra 3 |
| Responsável interno | obrigatório | hoje sempre o Marcos; campo já existe pensando em crescimento futuro da rede |
| Prioridade para o portfólio ativo | obrigatório, recalculável | ver regra 4.1 |
| Status no funil de relacionamento | obrigatório | ver regra 4.2 |
| Data do último contato | preenchida pelo sistema | atualiza a cada mudança de status, não é editada manualmente |
| Empreendimento(s) de maior interesse | opcional, múltiplos valores | liga a parceira ao portfólio ativo; uma parceira pode ter interesse em mais de um empreendimento, e um empreendimento pode interessar a várias parceiras |
| Observações | histórico, não é um campo único | ver regra 5 |

## 3. Origem do cadastro

Uma parceira pode entrar no sistema por duas vias, e o campo "origem do cadastro" registra qual foi:

- **Cadastro manual**, feito pelo Marcos no painel, depois de uma pesquisa ou indicação. Esse é o fluxo usado para a leva inicial de Ribeirão Preto e região.
- **Autocadastro**, através de uma ficha pública (no mesmo espírito da Ficha Cadastral que a Chaincorp já usa com o próprio canal de parceiros), compartilhada por WhatsApp ou link. Toda parceira que entra por essa via nasce com status "Pendente de validação" até o Marcos revisar, completar o segmento e definir a prioridade — o autocadastro nunca entra direto como parceira ativa.

## 4. Regras de funil e prioridade

### 4.1 Prioridade não é um valor fixo

A prioridade (Alta / Média / Baixa) é uma leitura de aderência entre o perfil da parceira e o portfólio ativo da incorporadora **no momento em que foi calculada**. Ela deve poder ser recalculada quando o portfólio mudar — por exemplo, se a Chaincorp lançar um produto de ticket mais popular, parceiras hoje com prioridade Baixa por foco em MCMV podem subir de prioridade. O sistema deve guardar a data em que a prioridade foi definida, para saber se uma releitura está atrasada.

### 4.2 Estados do funil de relacionamento

- Não contatado
- Contato iniciado
- Reunião agendada
- Em negociação
- Parceria firmada
- Sem interesse
- Pausado

Regras de transição:

- Uma parceira só pode saltar de "Não contatado" se já tiver telefone ou e-mail de contato preenchido.
- Toda mudança de status deve vir acompanhada de uma observação obrigatória (ver regra 5) explicando o que motivou a mudança — no mesmo espírito da gamificação já especificada, onde nada muda de estado sem um fato registrado por trás.
- O status não retrocede automaticamente. Se uma parceira "Sem interesse" voltar a fazer sentido (ex.: mudança de portfólio), o Marcos reabre manualmente, e essa reabertura também gera uma observação.
- "Pausado" existe para parceiras que pediram para retomar depois (ex.: "me chama de novo no próximo trimestre") e não devem aparecer nas listas de acompanhamento ativo, mas também não devem ser tratadas como perdidas.

## 5. Observações como histórico, não como campo único

Cada interação registrada (ligação, mensagem, reunião) deve gerar uma nova entrada de observação com data, e não sobrescrever a anterior. O card ou tela da parceira mostra a lista cronológica. Isso evita perder o histórico de conversas conforme o volume de parceiras crescer, e é o mesmo racional já usado no restante do CRM (histórico de lead).

## 6. Relação com o portfólio

O campo "empreendimento(s) de maior interesse" é uma ligação N:N entre parceira e o portfólio ativo — não um campo de texto livre. Isso permite, no futuro, consultas como "quais parceiras têm interesse no empreendimento X" na hora de repassar uma novidade de lançamento.

## 7. Carga inicial

O arquivo `parceiras_ribeirao_preto_seed.csv` (anexo) traz a leva inicial de 20 parceiras mapeadas em Ribeirão Preto, Sertãozinho e Jaboticabal, já no formato de campos descrito acima, com:

- `status_funil` inicial = "Não contatado" para todas
- `origem_cadastro` = "Pesquisa pública (set/2026)"
- `responsavel_interno` = "Marcos Tendler"
- `empreendimento_chaincorp_interesse` em branco, para preencher depois da primeira conversa com cada uma

Ao importar, vale conferir se algum nome de parceira já existe no sistema (evitar duplicidade com cadastros manuais anteriores) antes de inserir.

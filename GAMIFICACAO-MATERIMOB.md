# Gamificação do canal de parcerias no MaterImob

Instruções para o Claude Code. Leia este arquivo inteiro antes de qualquer ação.

Este documento descreve **o que** queremos e **as regras de negócio**. Ele não fixa nomes de
tabelas, pastas ou telas: o projeto `materimob` já tem sua estrutura, e é ela que manda.
Antes de escrever qualquer código, leia o `CLAUDE.md` da raiz, a documentação existente, as
migrações do Supabase e o módulo Parcerias (ou o que existir sobre imobiliárias parceiras e
registro de clientes). Depois, apresente ao Marcos um mapa de uma página dizendo onde cada
peça deste documento vai se encaixar no projeto real, e só então comece.

## 1. Por que existe

Marcos é Coordenador de Parcerias da Chaincorp Incorporações e está estruturando uma rede de
imobiliárias parceiras fora de São Paulo. O corretor dessas imobiliárias tem várias
incorporadoras na mesa e decide toda semana qual produto oferecer. Queremos que os projetos
da Chaincorp fiquem no topo dessa lista.

A gamificação recompensa cada passo da jornada do corretor com a Chaincorp, e não só a venda:
certificação no produto, apresentação ao cliente, cliente registrado, visita validada,
proposta e venda. Pontos viram nível, ranking por praça, missões semanais, prêmios e acesso a
um clube de vantagens.

O painel serve a três pessoas:

1. **O corretor da parceira**: vê pontos, nível, missão da semana, posição no ranking da praça,
   faz o quiz de certificação, registra apresentações e resgata prêmios.
2. **O dono da imobiliária parceira**: vê o desempenho da própria equipe.
3. **O Marcos (gestor do canal)**: configura regras, cria missões e campanhas, aprova resgates,
   lança pontos manuais quando preciso, acompanha o ranking por praça e exporta o relatório
   do piloto (comparação de duas praças).

Primeiro uso: um piloto de 60 dias em duas praças, uma com o programa e outra de controle.
Por isso tudo o que é número (pontos, limites, níveis, validade) precisa ser configurável.

## 2. Princípio que organiza tudo

**A gamificação não cria dados. Ela lê os fatos que o sistema já registra e os transforma em
pontos por regras.**

Nenhum ponto nasce de um clique em "ganhar pontos". Todo ponto nasce de um fato validado que
o MaterImob já conhece: o registro de um cliente foi aprovado, uma visita foi confirmada, uma
proposta recebeu número, um contrato foi assinado, um corretor passou no quiz, uma
apresentação foi registrada. A validação continua sendo a que já existe no módulo de
parcerias (fila de validação do gestor, número de proposta, número de contrato). O painel só
observa essas mudanças e pontua.

Consequências:

- O corretor nunca insere pontos. Só o gestor lança pontos manuais, sempre com motivo, e isso
  fica no extrato com o nome de quem lançou.
- Um evento de pontos nunca é editado nem apagado. Se um registro for cancelado ou um
  contrato distratado, gera-se um evento de estorno com valor negativo apontando para o
  original. Histórico não se reescreve.
- Os pontos de cada evento são copiados da regra vigente no momento do evento, não
  referenciados. Mudar a regra depois não altera o passado.
- O mesmo fato nunca pontua duas vezes: um registro de cliente que virou visita gera um único
  evento de visita, ainda que o status seja salvo de novo.

## 3. Ações que pontuam (valores iniciais do piloto)

| Ação | Fato que gera o ponto | Validação | Pontos | Limite semanal |
|---|---|---|---|---|
| Certificação | Corretor aprovado no quiz de um empreendimento (10 perguntas, mínimo 8 acertos) | Automática | 50 | 1 por empreendimento |
| Apresentação | Corretor registra que enviou o material de um empreendimento a um cliente | Automática, deduplicada por cliente e empreendimento | 20 | 10 |
| Cliente registrado | Registro de cliente aprovado pelo gestor | Já existe no módulo de parcerias | 30 | 10 |
| Visita validada | Registro evolui para visita, confirmada pelo gestor ou pelo plantão | Já existe | 150 | sem limite |
| Proposta | Registro evolui para proposta, com número | Já existe | 300 | sem limite |
| Venda | Registro evolui para venda, com número de contrato | Já existe | 1.000 (+ adicional opcional por VGV) | sem limite |
| Missão cumprida | Corretor atinge a meta de uma missão ativa | Automática | 100 | 1 |
| Indicação | Corretor indicado por outro conclui a certificação | Automática | 50 para quem indicou | sem limite |
| Manual | Lançamento do gestor com motivo | Gestor | livre | sem limite |
| Estorno | Cancelamento, distrato ou resgate de prêmio | Automática ou gestor | negativo | sem limite |

Regras transversais:

- **Limite semanal**: o registro além do limite é gravado, mas marcado como não pontuável.
  Nada se perde, nada infla.
- **Multiplicador de campanha**: o gestor pode abrir uma campanha por praça e período (ex.:
  visitas em dobro nas duas últimas semanas do lançamento). Por padrão o multiplicador vale
  só para visita; configurável.
- **Validade**: pontos que contam para nível expiram em 12 meses (configurável). O histórico
  fica; só o cálculo de nível deixa de considerá-los.
- **Dois saldos, sempre separados na tela**: "pontos de nível" (só eventos positivos válidos
  dentro da validade) e "pontos para trocar" (desconta resgates).

## 4. Níveis

Bronze de 0 a 299, Prata a partir de 300, Ouro a partir de 800, Platina a partir de 2.000.
Configuráveis. O nível é sempre calculado a partir dos eventos; nunca é uma coluna gravada.
Calibração desejada: um corretor mediano com duas visitas validadas no piloto chega ao Prata;
um corretor de alta performance chega ao Ouro; Platina fica reservado a quem vende.

## 5. Missões

Criadas pelo gestor: título, descrição, praça (ou todas), empreendimento (opcional), ação
alvo, quantidade alvo, início, fim e pontos bônus. Exemplo: "3 visitas validadas esta semana".
O sistema verifica periodicamente quem atingiu a meta e registra a missão como cumprida uma
única vez por corretor, gerando o evento de pontos. Se o projeto não tiver agendamento
disponível no Supabase, a verificação pode ocorrer quando o painel é carregado; dizer ao
Marcos qual das duas opções foi adotada.

## 6. Ranking

- **Sempre por praça.** Nunca existe ranking nacional na interface. Praças pequenas não
  podem competir com praças grandes.
- Duas visões: mês corrente e acumulado. Também um ranking por imobiliária (soma dos
  corretores).
- Na tela do corretor: a posição dele em destaque e o top 10 da praça com primeiro nome,
  inicial do sobrenome e nome da imobiliária. Telefone e dados de clientes nunca aparecem.
- O corretor pode optar por não aparecer no ranking (continua pontuando).
- Botão para o gestor: "Copiar texto para WhatsApp", que formata o ranking da praça para
  colar no grupo às sextas-feiras.

## 7. Certificação por quiz

Um quiz por empreendimento, com 10 perguntas de múltipla escolha cadastradas pelo gestor
num formulário simples (sem importação de arquivo nesta fase). Aprovação com 8 acertos.
Uma pergunta por tela, resultado imediato, sem revelar a resposta correta em caso de erro.
Reprovado pode tentar de novo depois de 24 horas. A primeira aprovação marca o corretor
como certificado e libera o acesso ao clube de vantagens.

## 8. Registro de apresentação

Formulário de três campos para o corretor: empreendimento, primeiro nome do cliente e
telefone. O telefone é guardado apenas como hash, para deduplicar sem armazenar o número. O
mesmo cliente apresentado duas vezes ao mesmo empreendimento não pontua de novo.
Confirmação em uma linha: "Apresentação registrada. +20 pontos." O botão "Registrar
cliente" leva ao fluxo de registro que já existe; não duplicar.

## 9. Prêmios e resgates

Três tipos de prêmio, todos cadastrados pelo gestor: liberado ao atingir um nível (ex.: vale
de R$ 200 no Prata), trocável por pontos (debita os pontos para trocar via evento de
estorno) e por posição no ranking no fechamento do período. O corretor pede o resgate; o
gestor aprova, marca como entregue ou cancela. Estoque opcional.

## 10. Clube de vantagens

O programa terá um clube de vantagens em marca própria (fornecedor tipo Rede Parcerias).
Nesta fase: um cartão "Clube" no painel do corretor, visível só para certificados, com um
link configurado pelo gestor. Fase posterior: ao certificar, uma função chama a API do
fornecedor para criar o usuário e guarda o id externo; se a chamada falhar, a certificação
continua válida e o sistema tenta de novo depois. Chaves de API em variáveis de ambiente,
nunca no código.

## 11. Telas

### Corretor da parceira (celular primeiro)

Acesso pelo mesmo mecanismo que o projeto já usa para corretores de parceiras (link por
token, login ou o que existir). Não criar um novo sistema de acesso. Conteúdo:

1. **Meu painel**: nome, nível com barra de progresso até o próximo, os dois saldos, três
   números grandes (apresentações, visitas validadas, vendas) e a missão ativa com o
   progresso dele.
2. **Ranking da praça**.
3. **Certificação**: empreendimentos com selo "Certificado" ou botão "Fazer quiz".
4. **Registrar apresentação**.
5. **Prêmios** e pedido de resgate.
6. **Clube**.
7. **Extrato**: lista de todos os eventos dele, com data, ação, pontos e motivo. É o que
   resolve qualquer contestação.

### Dono da imobiliária parceira

O mesmo painel, mais uma visão da equipe: corretores da imobiliária, nível e pontos de cada
um, total do mês.

### Gestor (Marcos), dentro do MaterImob

Uma entrada "Gamificação" no módulo de parcerias:

1. **Visão geral**: seletor de praça e período; cartões com corretores ativos na semana,
   percentual de certificados, apresentações, visitas validadas, propostas, vendas; gráfico
   simples por semana; **comparação lado a lado de duas praças**, que é o relatório do piloto,
   com exportação em CSV.
2. **Ranking** por praça e por imobiliária, com CSV e "Copiar texto para WhatsApp".
3. **Missões**: criar, ativar, encerrar, ver quem cumpriu.
4. **Campanhas de pontos**: praça, período, multiplicador.
5. **Certificações**: cadastro do quiz por empreendimento; aprovados e reprovados.
6. **Resgates**: fila com aprovar, entregar, cancelar.
7. **Lançamento manual**: corretor, pontos (positivo ou estorno), motivo obrigatório.
8. **Configurações**: tabela de pontos e limites por ação, níveis, validade, multiplicador
   padrão, link do clube. Aviso ao salvar: "Mudanças valem só para eventos futuros."

Na ficha de cada imobiliária parceira (tela que já existe), um cartão só leitura:
nível médio, pontos do mês e os três corretores mais bem colocados.

## 12. Acesso e privacidade

- Mesmo modelo de dono da conta e RLS que o projeto já usa. Um dono nunca vê dados de outro.
- Corretor de parceira lê apenas os próprios dados, o ranking da própria praça (nomes
  reduzidos), missões e prêmios ativos. Insere apenas respostas de quiz, apresentações e
  pedidos de resgate. Nunca insere eventos de pontos.
- Dono da parceira lê os dados da própria imobiliária.
- A tabela de eventos de pontos recusa atualização e exclusão por qualquer perfil, inclusive
  o gestor. Correção se faz por estorno.

## 13. Antifraude (o que o desenho já garante)

Só o gestor valida visita, proposta e venda; unicidade por fato de origem; limite semanal
nas ações leves; hash do telefone nas apresentações; estorno automático em cancelamento e
distrato; extrato completo exportável.

## 14. Agente de WhatsApp (fase posterior, não fazer agora)

Deixar prontas funções de leitura que o agente vai usar: resumo do corretor (nível, saldos,
posição), ranking da praça em texto, missão ativa da praça. Mensagens previstas:
confirmação de pontos ao validar visita, missão às segundas, ranking às sextas, aviso de
subida de nível.

## 15. Ordem de trabalho

Só começar depois que o registro de clientes com validação e mudança de status estiver
funcionando de forma estável, porque os pontos dependem dele.

- **G0**: mapa de encaixe no projeto real apresentado ao Marcos; migrações (eventos, regras,
  configurações, certificações, apresentações, missões, campanhas, prêmios, resgates),
  gatilhos sobre a mudança de status do registro de cliente, cálculos de saldo, nível e
  ranking, RLS. Testes em código: limite semanal, multiplicador, estorno, unicidade, nível,
  isolamento entre contas e entre corretores. Valores iniciais da seção 3 e 4 carregados.
- **G1**: painel do corretor (Meu painel, Ranking, Certificação, Registrar apresentação,
  Extrato).
- **G2**: telas do gestor (Visão geral com comparação de duas praças, Ranking, Missões,
  Campanhas, Configurações, Lançamento manual).
- **G3**: Prêmios, resgates, cartão Clube com link fixo, visão do dono da parceira.
- **G4**: integração por API com o clube e funções para o agente de WhatsApp.

Entregar fase por fase. No fim de cada fase: o que foi feito, o que foi testado, o único
passo que o Marcos precisa dar (se houver) e o que vem a seguir.

## 16. Definição de pronto

- Migrações aplicadas sem erro num banco limpo e no banco existente.
- RLS testada para os três perfis.
- Eventos de pontos não aceitam atualização nem exclusão.
- Mudar a tabela de pontos não altera nenhum evento já gravado.
- Regras testadas em código: limite semanal, multiplicador, validade, estorno, nível,
  unicidade por fato de origem.
- Nada de passo técnico frágil na mão do Marcos.

## 17. Como escrever para o Marcos

Sem jargão. Frases curtas. Quando houver decisão com risco escondido, dizer com clareza e
deixar ele decidir. Não usar travessão nos textos voltados a ele, aos corretores ou às
imobiliárias.

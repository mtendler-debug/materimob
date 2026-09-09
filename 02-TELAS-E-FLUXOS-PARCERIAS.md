# Telas e fluxos do módulo Parcerias

Mesma linguagem visual do Avaliador. Mobile primeiro: Marcos e os corretores parceiros
usam o celular na maior parte do tempo. Textos em português, sem jargão, sem travessão.

## Navegação (área logada)

Parcerias
- Painel
- Parceiras
- Registros
- Portfólio
- Comissões
- Campanhas
- Configurações

## 1. Painel

Cartões do mês corrente, com comparação ao mês anterior:
- Parceiras ativas
- Registros no mês (e quantos pendentes de validação)
- VGV registrado
- VGV vendido
- Comissão prevista e paga

Abaixo: ranking das parceiras (top 10) e ranking por praça. Filtro de período
(mês, trimestre, ano). Botão "Exportar CSV" com as duas tabelas, para a reunião com a
diretoria.

## 2. Parceiras

Lista com busca, filtro por status, praça e UF. Cada linha: nome, cidade/UF, status,
registros vigentes, vendas, último registro.

Ficha da parceira, em abas:
- Dados (cadastro completo, contrato, comissão padrão, comissão por empreendimento)
- Corretores (lista, adicionar, desativar)
- Registros (todos os registros dessa parceira)
- Link de registro: mostra o link público com o token, botão "Copiar", botão "Enviar por
  WhatsApp" (click-to-chat com mensagem pronta) e botão "Renovar link", que invalida o
  anterior. Aviso ao renovar: "o link antigo para de funcionar na hora".

Botão "Nova parceira": formulário curto (nome, cidade, UF, praça, responsável, telefone,
status). O resto se completa depois.

## 3. Registros

Fila com abas: Pendentes, Vigentes, Em conflito, Vencendo em 15 dias, Todos.

Cada registro mostra: cliente (nome, telefone, final do CPF), parceira, corretor,
empreendimento, unidades de interesse, perfil, alerta de elegibilidade (se houver),
validade, protocolo da incorporadora (ou "não registrado na incorporadora" em destaque).

Ações:
- Validar (pendente → registrado)
- Marcar como registrado na incorporadora (pede protocolo e data)
- Avançar status (visita, proposta, venda)
- Resolver conflito: ver os dois registros lado a lado, escolher qual prevalece, nota
  obrigatória
- Cancelar (nota obrigatória)
- Criar avaliação (fase P4)
- Abrir no CRM (se lead_id existir; se não, oferecer "criar lead no CRM")

Registro manual (Marcos logado): mesmo formulário do público, sem token, com a parceira
escolhida na hora.

## 4. Formulário público de registro (por token)

URL: `/registrar/<token>`. Sem login. Cabeçalho com nome da parceira, nome da
incorporadora e do canal. Se o token for inválido ou a parceira não estiver ativa,
página neutra: "Este link não está mais ativo. Fale com o coordenador de parcerias."

Campos, nesta ordem:
1. Corretor responsável (lista dos corretores da parceira; opção "sou eu, novo corretor"
   que cria o cadastro com nome, CRECI e telefone)
2. Nome do cliente
3. Telefone do cliente (com máscara, validação de DDD)
4. CPF do cliente (opcional; explicar que só fica guardada uma referência)
5. E-mail (opcional)
6. Cidade e UF do cliente
7. Perfil: investidor, moradia, estudante, outro
8. Empreendimento (lista dos ativos com `destaque_rede = true` primeiro)
9. Unidades de interesse (multi-seleção filtrada pelo empreendimento; mostra metragem,
   tipologia, valor e uma etiqueta de enquadramento: "Sem restrição", "HIS-2",
   "HMP", "Não residencial")
10. Se houver unidade HIS/HMP selecionada: faixa de renda familiar e "o cliente já possui
    imóvel?" com o `texto_orientacao` da regra em destaque
11. Observações

Ao enviar:
- Sucesso normal: "Cliente registrado. Validade até <data>. O coordenador confirma o
  registro na incorporadora e retorna com o protocolo."
- Conflito: "Este cliente já possui registro vigente com outra origem. O coordenador vai
  analisar e retornar." Não dizer qual parceira.
- Alerta de elegibilidade: "Registro recebido. A unidade escolhida tem restrição de renda
  ou titularidade; o coordenador vai confirmar a elegibilidade antes de validar."

Depois do envio, botão "Registrar outro cliente" e link "Ver tabela do empreendimento"
(página pública somente leitura do portfólio, fase P3, sem preços de unidades
não disponíveis).

Notificação para Marcos a cada registro público: e-mail simples e, se configurado,
mensagem por click-to-chat não serve; usar e-mail nesta fase.

## 5. Portfólio

Lista de empreendimentos e, dentro, as unidades. Edição inline de valor, condição,
disponibilidade e `destaque_rede`. Importação por CSV com o mesmo layout do seed, para
atualizar o tabelão mensal sem redigitar: chave de correspondência
(empreendimento + identificacao + metragem); linhas ausentes no CSV novo viram
`disponivel = false`, nunca apagadas.

Página pública somente leitura por empreendimento (`/portfolio/<slug>`), pensada para o
corretor parceiro consultar do celular: unidades disponíveis, valores, condição,
enquadramento com explicação curta, entrega, comissão e um botão "Registrar cliente"
que só funciona se vier com o token na URL.

## 6. Comissões

Lista por status. Ao marcar registro como venda, o sistema cria a comissão com o
percentual copiado. Marcos edita valor de venda, bônus, previsão e data de pagamento.
Total por parceira e total do mês no topo. Exportar CSV.

## 7. Campanhas

Cadastro simples. Uma campanha ativa aparece como faixa no formulário público e na página
pública do portfólio ("Campanha vigente: ...").

## 8. Configurações

Validade do registro em dias, escopo de conflito, salário mínimo vigente, limite por
hora do formulário, regras de enquadramento (tabela editável), texto do rodapé do
formulário.

## Ponte com o Avaliador (fase P4)

No registro, botão "Criar avaliação":
1. Cria (ou reaproveita, se `av_cliente_id` existir) o cliente do Avaliador com nome e
   telefone do registro.
2. Pré-seleciona as unidades de `interesse_unidades` como imóveis a avaliar. Se o
   Avaliador precisar de um cadastro de imóvel próprio, criar a partir de `pc_unidades`
   com os campos que existirem e guardar o vínculo.
3. Devolve o link do Avaliador; botão "Enviar ao corretor da parceira por WhatsApp"
   (click-to-chat para o telefone do corretor, com mensagem curta).
4. O painel do Avaliador do cliente mostra "Origem: <parceira>".

Respeitar a decisão já tomada: `av_selections.lead_id` continua opcional. O vínculo
Parcerias ↔ Avaliador é `pc_registros_cliente.av_cliente_id`, nunca cascata.

## Textos prontos

Mensagem de envio do link à parceira (WhatsApp):
"Olá, <nome>. Este é o seu link exclusivo para registrar clientes nos empreendimentos da
Chaincorp: <link>. Cada registro vale <dias> dias e é confirmado por mim na incorporadora.
Qualquer dúvida, é só me chamar. Marcos Tendler, Coordenador de Parcerias."

Mensagem de link do Avaliador ao corretor da parceira:
"<Nome do corretor>, segue o comparativo para o cliente <nome>: <link>. Ele avalia pelo
celular, e você acompanha as notas e a proposta pelo painel. Marcos."

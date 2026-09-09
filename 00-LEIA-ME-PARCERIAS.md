# Módulo Parcerias do MaterImob

Instruções para o Claude Code. Leia este arquivo inteiro antes de qualquer ação.

## Por que este módulo existe

Marcos assumiu a função de Coordenador de Parcerias da Chaincorp Incorporações (São Paulo).
A missão dele é estruturar uma rede de imobiliárias parceiras fora de São Paulo para vender
os empreendimentos da Chaincorp. O MaterImob vai ser o painel de gestão desse canal e a
ferramenta que ele oferece às parceiras.

O módulo Parcerias adiciona ao MaterImob o que um canal de vendas indireto precisa e o CRM
de um corretor individual não tem:

1. Cadastro de imobiliárias parceiras e dos corretores delas.
2. Registro de cliente por parceira, com validade, checagem de conflito e checagem de
   elegibilidade para unidades HIS/HMP.
3. Portfólio de empreendimentos e unidades com enquadramento (R2V, HIS-2, HMP, NR).
4. Painel com ranking de parceiras, VGV registrado e vendido, comissões previstas e pagas.
5. Ponte com o Avaliador: a partir de um registro de cliente, gerar a avaliação comparativa
   que o corretor da parceira envia ao cliente.

## Leia antes, nesta ordem

1. `SKILL.md` do MaterImob (contexto, decisões já tomadas, como trabalhar com o Marcos).
2. `LEIA-ME.md` e `ARQUITETURA-SAAS.md` (plataforma, Supabase, modelo de dados existente).
3. `01-MODELO-DE-DADOS-PARCERIAS.md` (tabelas novas deste módulo).
4. `02-TELAS-E-FLUXOS-PARCERIAS.md` (telas, regras e integrações).
5. `seed_chaincorp_setembro_2026.sql` (portfólio inicial, baseado no tabelão de setembro/2026).

Se algum nome de tabela ou coluna do modelo existente conflitar com este documento,
o modelo existente prevalece: adapte este módulo, não o Avaliador.

## Restrições que não se discutem

- Supabase para banco, Auth e RLS. Nada de Netlify Blobs neste módulo.
- Mesmo estilo de código do Avaliador: HTML/CSS/JS puro, sem framework pesado.
- Publicação pelo fluxo já definido (repositório no GitHub publicando pelo Netlify).
- O Mac do Marcos não tem Node.js. Nenhum passo do trabalho dele pode depender de terminal.
  Tudo que precisar de execução local você faz aqui; para ele sobra abrir um link ou
  clicar num painel.
- Migrações em arquivos SQL numerados em `supabase/migrations/`. Nunca alterar migração
  já aplicada; criar uma nova.
- `registros_cliente.lead_id` é opcional e `ON DELETE SET NULL`. Os módulos se vendem
  separados; Parcerias precisa funcionar sem o CRM e sem o Avaliador.
- Dados de cliente final são dados pessoais (LGPD). CPF nunca fica em claro no banco:
  guardar hash SHA-256 dos dígitos mais os três últimos dígitos para exibição.
- Regras de faixa de renda para HIS/HMP mudam por decreto. Nunca fixar limites no código:
  ficam na tabela `regras_enquadramento`, editáveis pelo painel.

## Um ponto de negócio que muda o desenho

O registro oficial de cliente, o que vale para pagamento de comissão e disputa de origem,
continua sendo feito no sistema da incorporadora. O MaterImob registra, controla validade,
aponta conflito e guarda o protocolo da incorporadora, mas não substitui o cadastro dela.
Por isso `registros_cliente` tem os campos `registrado_na_incorporadora_em` e
`protocolo_incorporadora`, e a tela de registro deixa isso visível.

## Ordem de trabalho

Fase P0. Banco.
- Migrações: enums, tabelas, índices, RLS, views.
- Aplicar o seed da Chaincorp.
- Testes de isolamento entre `owner_id` diferentes.

Fase P1. Parceiras e registro interno.
- Telas: lista e ficha de parceira, corretores da parceira, formulário de registro de
  cliente feito pelo próprio Marcos (logado).
- Regra de conflito e de validade funcionando.

Fase P2. Formulário público por token.
- Cada parceira recebe um link com token para registrar clientes sem login.
- Checagem de elegibilidade HIS/HMP no formulário.
- Fila de registros pendentes para Marcos validar.

Fase P3. Painel, ranking e comissões.
- KPIs, ranking por parceira e por praça, comissões previstas e pagas, campanhas.
- Exportação CSV para a reunião mensal com a diretoria.

Fase P4. Ponte com o Avaliador.
- Botão "Criar avaliação" no registro, pré-carregando as unidades de interesse.

Fase P5 (não fazer agora). Agente de WhatsApp para atender corretores das parceiras.

Entregue fase por fase. No fim de cada fase: o que foi feito, o que foi testado, o único
passo que o Marcos precisa dar (se houver) e o que vem a seguir.

## Definição de pronto de cada fase

- Migrações aplicadas sem erro num banco limpo e no banco existente.
- RLS testada: um `owner_id` não vê nem altera dados de outro.
- Formulário público recusa token inválido, token de parceira encerrada e mais de
  N registros por hora do mesmo token (definir N em `config`, padrão 30).
- Fórmulas e regras testadas em código (conflito, validade, elegibilidade, comissão).
- Nada de passo técnico frágil na mão do Marcos.

## Como escrever para o Marcos

Sem jargão. Frases curtas. Quando houver decisão com risco escondido, dizer com clareza e
deixar ele decidir. Não usar travessão nos textos voltados a ele ou a clientes.

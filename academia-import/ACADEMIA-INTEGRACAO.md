# Academia de Vendas dentro do MaterImob

Instruções para o Claude Code. Leia este arquivo inteiro antes de qualquer ação, depois
o `CLAUDE.md` do projeto. Se algo aqui conflitar com o schema ou o código atual do
MaterImob, o MaterImob vence: adapte a Academia, não o resto.

## 1. O que é e por que vem para cá

A **Academia de Vendas** é hoje um app separado (`chaincorp-hub.netlify.app`, projeto
Supabase próprio) que o Marcos usa no canal de parcerias da Chaincorp. Ele faz três
coisas, e só três:

1. **Materiais e argumentos** para o corretor parceiro vender cada empreendimento: fotos
   reais, pílula de argumentação, números, regras HIS-2/HMP, perguntas do cliente com
   resposta, e o **kit de WhatsApp** (textos A, B e C por perfil de cliente, cards 1:1 e
   9:16, mensagens de continuidade, roteiro, cadência, guia em PDF).
2. **Treinamento**: trilhas com aulas, quiz corrigido no servidor e certificado.
3. **Visão do gestor**: o Marcos vê tudo o que cada corretor faz (material aberto, kit
   enviado, cliente que abriu o link, aula concluída, certificado, registro de cliente),
   quem está parado há 7 dias, ranking de engajamento, e libera os acessos.

Agora ela vira um módulo do MaterImob, com o nome **Academia de Vendas - Materimob**.
O app separado continua no ar até este módulo estar pronto; depois é desligado.

Este pacote traz tudo o que já foi decidido, escrito e testado lá, para você **reconstruir
dentro da estrutura real do MaterImob**, não para copiar o app. O app antigo usa React 18,
roteamento próprio, Tailwind 3, outro design e outro banco. Use o código dele como
referência de comportamento e de texto, não como código a colar.

## 2. Decisões já tomadas pelo Marcos (não reabrir)

1. **Corretor parceiro entra com login e senha**, como na Academia atual: ele cria o acesso
   escolhendo a imobiliária (ou "autônomo", ou "minha imobiliária não está na lista") e o
   Marcos libera. Isso resolve de vez a peça que faltava no módulo Parcerias e na
   gamificação ("acesso do corretor da parceira", ver `03-MAPA-DE-ENCAIXE-GAMIFICACAO.md`,
   seção 3). O link por token sem senha continua só para o formulário público de registro.
2. **Não existe "Negócios" separado.** O que na Academia se chamava Negócios passa a ser o
   **Registro de cliente** do módulo Parcerias (`pc_registros_cliente`), com a validade,
   a checagem de conflito e a checagem HIS/HMP que já estão desenhadas. O corretor
   parceiro registra o cliente e acompanha o status (pendente, registrado, visita,
   proposta, venda) pela Academia.
3. **Academia antes da gamificação.** A Academia entrega o acesso do corretor, o registro
   de atividades e o quiz. Esses passam a ser os "fatos" que a gamificação vai pontuar
   depois (fases G0 em diante), sem retrabalho.
4. **Administrador é só o Marcos.**
5. **Dono da imobiliária vê a equipe dele**: atividade, treinamento e registros dos
   corretores da mesma imobiliária. Não vê a de outras.

## 3. Como as peças se encaixam no que já existe

Os nomes abaixo são sugestão. Siga o padrão do projeto (prefixo, `owner_id`/`user_id`,
RLS) e ajuste o que precisar.

| Academia atual | No MaterImob | Observação |
|---|---|---|
| Conta do corretor parceiro (`profiles`, papel corretor/gestor/admin, status pendente/ativo/recusado) | `profiles` do MaterImob + vínculo com `pc_parceira_corretores` (corretor) e com `pc_parceiras` (dono/gestor) | Precisa de um status de acesso ao canal (pendente, liberado, bloqueado) e do papel no canal (corretor ou gestor da parceira). Não mexer em `account_type` além do necessário: o corretor parceiro é um corretor; a parceria é um chapéu, como as organizações. |
| Imobiliárias (68 de Ribeirão Preto) | `pc_parceiras` | Já existem lá, com seeds de Ribeirão Preto. Não importar de novo. "Ativa na Academia" = parceira com status de parceria fechada (Lanportus, Prospect, Sônia & Ramalho, Andreotti, Índice). |
| Projetos (`lancamentos`, 7) | `pc_empreendimentos` (comercial) ligado a `av_launches` (fotos, book, plantas já no Storage) | Os 7 já existem nos dois lados. O conteúdo de venda novo (abaixo) entra como uma tabela de kit por empreendimento, não como colunas espalhadas. |
| Kit, pílula, números, regras, FAQ, cadência, cards, lâmina, guia | Tabela nova de kit (1 por empreendimento, conteúdo em JSON) + arquivos no Storage | Ver `conteudo/conteudo-academia.json`, campo `projetos[].kit`, e a seção 5. |
| Textos de WhatsApp por tese (investimento, moradia, escassez) | Dentro do kit (`kit.abordagens`) | O texto tem campos entre colchetes; ver regra na seção 6. |
| Trilhas, aulas, quiz, progresso, tentativas, certificado | Tabelas novas do módulo | O quiz já previsto na gamificação (`pc_quiz_perguntas`, `pc_certificacoes`) deve ser **este**: uma estrutura só, trilha com `empreendimento_id` opcional. |
| Argumentos (`abordagens`, 43, por etapa da venda e por projeto) | Tabela nova de argumentos | Corretor pode sugerir; só o Marcos publica. |
| Links rastreados (`links`) e aberturas (`acessos`) | Tabelas novas de envio e de abertura | Página pública do cliente no MaterImob, ao lado de `/c/:token` e `/r/:token`, respeitando a marca por caminho (`/chaincorp`). |
| Atividades (linha do tempo) | Tabela nova de atividade do canal | Fonte única do que o corretor fez. A gamificação lê daqui depois. |
| Negócios | `pc_registros_cliente` | Decisão 2. |
| Avisos (comunicados) | Tabela nova simples | Publicados pelo Marcos para todos, só corretores ou só gestores. |

## 4. Telas

### Corretor parceiro (celular primeiro)

Menu: **Início, Projetos, Treinamento, Argumentos, Meus clientes**. O gestor da
imobiliária vê também **Minha equipe**.

- **Início**: avisos da coordenação; números do corretor (materiais enviados, clientes que
  abriram, registros, vendas); "continue seu treinamento" com a próxima trilha; atalho
  para os projetos; botão "Registrar cliente".
- **Projetos**: grade com a foto de capa de cada empreendimento. Dentro de cada um, quatro
  abas:
  - **Como vender**: pílula de argumentação (a tese do imóvel, para quem vender, gatilho de
    urgência), números para ter na ponta da língua, regras (com tabela de preços quando
    houver), boas práticas, perguntas do cliente com resposta e botão copiar, trilha do
    projeto.
  - **Enviar ao cliente**: o corretor escolhe a opção A, B ou C pelo perfil do cliente
    (o kit diz "para quem" e "quando usar"), digita o nome do cliente, edita o texto, envia
    pelo WhatsApp ou copia. O link rastreado entra no lugar de `{link}`. Ao lado, o card
    da mesma opção em 1:1 e 9:16 para baixar. Abaixo: mensagens de continuidade, roteiro
    de uso, cadência e o guia completo do kit em PDF.
  - **Fotos e materiais**: galeria com tela cheia e download, os 6 cards, lâmina, guia,
    book e tabela.
  - **Ficha completa**: texto longo do empreendimento.
  - Aviso em destaque no topo quando o projeto tem restrição (ex.: Rooftop ainda não
    comercializável, Pina com renda que depende do enquadramento).
- **Treinamento**: trilhas por nível, aulas (leitura, vídeo, material), quiz com gabarito
  só no servidor, certificado quando conclui todas as aulas e passa no quiz.
- **Argumentos**: biblioteca por etapa (abordagem, qualificação, apresentação, objeção,
  fechamento, pós-venda) e por projeto, com busca e botão copiar.
- **Meus clientes**: o Registro de cliente do módulo Parcerias, na visão do corretor.

### Marcos (gestor do canal), dentro de `/app/parcerias` ou como área própria

- **Visão geral**: parceiros ativos e quantos acessaram em 7 dias; materiais enviados e
  aberturas; em treinamento, aulas concluídas e certificados; registros em andamento e
  vendas; aviso de cadastros aguardando liberação; **"Acontecendo agora"** (linha do tempo
  em tempo real de tudo o que os corretores fazem); mais engajados; sem acessar há 7 dias
  com atalho para o WhatsApp do corretor; botão "Publicar aviso".
- **Corretores**: tabela com último acesso, materiais, envios, clientes que abriram,
  progresso no treinamento e registros; filtros (ativos, parados há 7 dias, bloqueados);
  ficha de cada corretor com a linha do tempo dele, editar papel e imobiliária, bloquear
  ou liberar. Aba de **acessos pendentes** para liberar ou recusar. Aba **por
  imobiliária** com os números somados.
- **Conteúdo**: editar o kit e as fotos de cada projeto, trilhas, aulas, quiz e argumentos
  (publicar sugestões dos corretores).

### Cliente final (página pública do link)

Foto de capa em tela cheia com nome, bairro e resumo; galeria; pontos fortes; lâmina; book
e vídeo quando houver; cartão do corretor com botão "Falar no WhatsApp". Abrir a página
registra a abertura e gera a atividade "cliente abriu o link" para o corretor (no máximo
uma a cada 30 minutos por aparelho).

## 5. Conteúdo pronto para importar

Tudo em `conteudo/conteudo-academia.json`:

- `projetos` (7): id curto (`verya`, `vici`, `pina`, `rooftop`, `blue`, `full`, `vip`),
  resumo, destaques, ficha, entrega, preço, comissão, aviso, links, e `kit` com:
  `identificacao`, `alerta`, `mapa` (opção, para quem, card), `numeros`, `regras` (com
  `tabela` opcional), `pilula` (tese, publico, gatilho), `abordagens` (A, B, C: titulo,
  quando, card, texto), `continuidade`, `antes`, `passos`, `cadencia`, `dicas`, `faq`,
  `cards`, `boas_praticas`, `aviso_legal`, `cards_img`.
- `textos_whatsapp` (21): o texto de cada opção já com a linha do link no fim.
- `trilhas` (5) com `aulas` (17) e `quiz` (15, com resposta certa e explicação).
- `argumentos` (43).

Para casar os 7 projetos com os empreendimentos que já existem, use o nome
(Verya Jardins, Vici Faria Lima, Pina 1875, Rooftop Perdizes, Blue Park, Full Jardim São
Paulo, VIP Vila Prudente). Confira um a um; não crie empreendimento duplicado.

Arquivos em `assets/projetos/<id>/`: `capa.jpg`, `fotos/1..6.jpg` (1600 px, com legendas
no JSON em `galeria`), `cards/<tese>-feed.jpg` (1080x1080) e `cards/<tese>-stories.jpg`
(1080x1920), `lamina.jpg`, `guia-do-kit.pdf`. Suba para o Storage do MaterImob, no padrão
de pastas que o projeto já usa para empreendimentos, e grave as URLs no kit. Depois de
subir, apague a pasta `academia-import/assets` do repositório.

## 6. Regras de comportamento que já foram validadas

- **Campos entre colchetes**: `[Nome do Cliente]` é trocado pelo nome digitado e
  `[Nome do Corretor]` pelo nome do corretor. Se ainda sobrar qualquer `[...]` no texto
  (ex.: `[andar/metragem]`, `[dia]`), o envio fica bloqueado com aviso listando o que falta.
- **Link rastreado**: criado no servidor na hora do envio (função com `security definer`,
  token aleatório curto). Atenção: no Supabase, `gen_random_bytes` fica no schema
  `extensions` e uma função com `search_path = public` não enxerga. Use `gen_random_uuid()`.
  Esse erro derrubou o envio no app antigo.
- **Abrir o WhatsApp**: abra a janela antes do `await` que cria o link e só depois troque o
  endereço, senão o navegador do celular bloqueia o pop-up.
- **Quiz**: o gabarito nunca vai para o navegador; a correção é uma função no servidor que
  devolve acertos, aprovado e a explicação de cada pergunta.
- **Atividades registradas** (tipos fechados, validados no servidor): abriu projeto, abriu
  book, abriu tabela, abriu vídeo, baixou arte/foto/lâmina/guia, copiou texto, usou
  argumento, enviou kit, cliente abriu, concluiu aula, fez quiz, certificou, e cada mudança
  de status do registro de cliente. O Marcos não gera atividade (só corretores e gestores).
- **Último acesso**: atualizado quando o corretor abre o app.
- **Rentabilidade e valorização** aparecem sempre como estimativa, com o texto legal do
  kit (`aviso_legal`).

## 7. Referência

`referencia/` traz o app antigo:

- `referencia/supabase/03_simplificacao_base.sql`: a lógica do servidor que funciona hoje.
  Leia as funções `painel_admin`, `resumo_parceiros`, `linha_do_tempo`, `meus_numeros`,
  `registrar_atividade`, `registrar_presenca`, `criar_disparo`, `abrir_link`,
  `decidir_acesso`, `editar_parceiro` e as políticas RLS de cada tabela (incluindo a regra
  "gestor vê só a própria imobiliária").
- `referencia/supabase/01_estrutura.sql`: trilhas, aulas, quiz, `responder_quiz`,
  `quiz_da_trilha`, `minha_academia`.
- `referencia/src/pages/`: as telas atuais (`Projetos.jsx` tem o kit completo, `Inicio.jsx`
  a visão geral, `Parceiros.jsx` a gestão e a linha do tempo, `Academia.jsx` o
  treinamento, `LinkPublico.jsx` a página do cliente). Use para comportamento e textos.
  O visual segue o design do MaterImob (Fraunces + IBM Plex Sans, tokens dourados, borda
  em vez de sombra), não o do app antigo.

## 8. Ordem de trabalho sugerida

Cada fase termina testável e o Marcos aprova antes da próxima. Antes de mexer em layout,
mostre um protótipo para aprovação, como manda o `CLAUDE.md`.

1. **A0, banco**: tabelas novas, RLS (corretor vê o próprio, gestor da parceira vê a
   equipe, Marcos vê tudo), funções do servidor, importação do conteúdo e dos arquivos.
   Teste RLS de verdade com `set local role authenticated`.
2. **A1, acesso do corretor parceiro**: cadastro com escolha da imobiliária, fila de
   liberação para o Marcos, menu da Academia para quem tem acesso liberado.
3. **A2, Projetos e kit**: as quatro abas, envio pelo WhatsApp com link rastreado e a
   página pública do cliente.
4. **A3, Treinamento e Argumentos.**
5. **A4, Meus clientes**: o Registro de cliente do módulo Parcerias na visão do corretor
   (depende das fases P1/P2 de Parcerias; se ainda não existirem, construa o mínimo
   necessário aqui, seguindo `02-TELAS-E-FLUXOS-PARCERIAS.md`).
6. **A5, visão do gestor**: Visão geral, Corretores, Minha equipe, Conteúdo, Avisos.
7. **A6, troca**: o Marcos avisa os parceiros, o endereço antigo passa a redirecionar para
   o MaterImob, e o app separado é desligado.

Só existe um usuário real no app antigo (o próprio Marcos) e nenhum envio registrado, então
não há dados de uso para migrar: só o conteúdo deste pacote.

## 9. Como falar com o Marcos

Ele não é desenvolvedor. Português, sem jargão, sem travessão nos textos. Prefira caminho
gráfico a terminal. Teste antes de pedir qualquer ação manual. Quando uma decisão tiver
risco escondido, avise com clareza e dê a recomendação.

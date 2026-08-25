# Briefing para o Claude Code do projeto — Papéis e Administração

Este documento é a especificação do trabalho. As decisões que estão aqui já foram
tomadas com o Marcos — não é para reabri-las.

**Você faz tudo: banco e front-end.** O Marcos é corretor, não programador, e toca
isso entre atendimentos. Ele não abre terminal, não roda comando, não mexe em SQL.
O papel dele nesta tarefa é responder pergunta em português comum, mandar uma
credencial quando você pedir, e olhar a tela para dizer se ficou bom.

Duas coisas que valem para tudo daqui pra frente:

- **Nunca deixe um passo técnico frágil na mão dele.** Se depende do computador
  dele, deixe pronto e com um caminho único.
- **Cada publicação custa uma ação manual dele.** Teste tudo o que der antes de
  pedir uma.

---

## 0. Contexto e a decisão central

Hoje o sistema não tem papéis. A tela "Como você atua no mercado imobiliário?"
(`Entry.jsx` → `RoleChooser`) não grava a resposta em lugar nenhum, e a barra de
links do `Dashboard.jsx` é fixa — todo mundo vê *Organização*, *Portfólio* e
*Lançamentos*, sejam ou não deles.

**A decisão, já fechada com o Marcos:** existe agora `profiles.account_type`
(`corretor` | `imobiliaria` | `incorporadora`), escolhido no cadastro. Ele define
**a casa** da pessoa: a tela em que ela entra e o menu principal.

**Não é uma parede.** Pertencer a uma organização **acrescenta** áreas ao menu,
nunca substitui a casa. O motivo é a diretriz de continuidade da jornada do
corretor, já registrada no projeto: o corretor é a entidade permanente, a
organização é um chapéu que ele usa às vezes. O próprio Marcos é corretor **e**
dono da Mater Estate — uma conta só, uma carteira só. Se em algum momento o
código levar a "esta conta é imobiliária, portanto não tem carteira de clientes",
está errado.

---

## 1. Sua PRIMEIRA tarefa: aplicar a migração de banco você mesmo

**O Marcos não mexe em SQL.** Não peça a ele para abrir o SQL Editor do Supabase,
colar comando, rodar query nem conferir tabela. Isso é trabalho seu.

O arquivo é `supabase/migrations_papeis.sql`, na pasta do projeto. Ele já foi
escrito e testado ponta a ponta em PostgreSQL 16 — 8 verificações, incluindo
tentativa de corretor se promover a administrador e de diretor reativar a própria
organização suspensa, as duas recusadas pelo banco. **Não reescreva esse SQL.**
Se achar que algo nele está errado, fale antes de mudar.

### Como aplicar — tente na ordem, use o primeiro que funcionar

**1. MCP do Supabase.** Se esta sessão tiver um servidor MCP do Supabase
configurado, use a ferramenta de aplicar migração dele. Caminho mais limpo.

**2. CLI do Supabase.** Já é dependência do projeto (`supabase` em
`devDependencies`). O ref do projeto é `izslgjvxbthjxabtepti`:

```
npx supabase link --project-ref izslgjvxbthjxabtepti
npx supabase db push
```

**3. API de gerenciamento, por `curl`.** Funciona sem Node instalado — é o plano
B se o Mac não tiver ambiente de desenvolvimento:

```
curl -X POST "https://api.supabase.com/v1/projects/izslgjvxbthjxabtepti/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @<(jq -Rs '{query: .}' supabase/migrations_papeis.sql)
```

### Se faltar uma credencial

Peça **uma coisa por vez** ao Marcos, dizendo exatamente onde clicar, e peça só o
dado — nunca peça que ele rode o comando. Modelo do jeito certo:

> Preciso de um token de acesso do Supabase. Abra `supabase.com/dashboard`, clique
> na sua foto no canto superior direito → **Account settings** → **Access tokens**
> → **Generate new token**, dê o nome que quiser e me mande o código que aparecer.
> Ele começa com `sbp_`.

Regras: nunca gravar senha ou token em arquivo do repositório; conferir que não
foram parar no histórico do git; apagar qualquer script temporário que tenha
criado para aplicar a migração.

### Depois de aplicar

Rode você mesmo o **PASSO 2** que está comentado no fim do arquivo — é o `insert`
que cria o primeiro administrador da plataforma. O e-mail é `mtendler@gmail.com`.
Pela aplicação ninguém vira administrador sozinho, por desenho, então esse comando
é o único caminho.

Confira, por conta própria, que: `profiles` existe e tem uma linha por conta;
`platform_admins` tem a linha do Marcos; e a conta dele ficou com um
`account_type` coerente. Relate em uma frase — sem despejar SQL na conversa.

### O que a migração cria (para você saber o que já pode usar)

| Objeto | Para quê |
|---|---|
| `profiles` | Nome, CRECI, telefone, logo, cor e `account_type`. Nasce por gatilho junto com a conta; contas antigas já são preenchidas pela própria migração. |
| `platform_admins` + `is_platform_admin()` | O time MaterImob. Tabela separada de propósito — `profiles` é editável pelo dono, então `account_type` nunca pode conceder poder de plataforma. |
| `organizations.status` | `ativa` / `pendente` / `suspensa`. Suspensa some das buscas e do estoque para quem é de fora; os membros continuam vendo a própria casa; nada é apagado. |
| `av_team_picks` | A seleção curada da imobiliária para o time. |
| `platform_overview()`, `platform_organizations()`, `platform_accounts()` | Os três painéis do time MaterImob. Recusam quem não é admin. |
| `shares_organization()`, `org_visivel()`, `lancamento_visivel()`, `imovel_portfolio_visivel()`, `protege_status_organizacao()` | Auxiliares de RLS. |

Garantido pelo banco, já testado — o front pode assumir:

- Corretor não consegue se inserir em `platform_admins` (RLS recusa).
- `platform_overview()` levanta exceção para quem não é admin.
- Diretor de organização suspensa **não** consegue se reativar (gatilho recusa),
  mas continua podendo renomear a organização.
- Corretor de fora do time não vê nem escreve `av_team_picks` da organização.
- Colega de organização vê o perfil do time; quem é de fora, não.

---

## 2. Front-end — o que construir

### 2.1 `src/lib/useProfile.js` (novo)

Hook que carrega a linha de `profiles` do usuário logado e chama a RPC
`is_platform_admin()`. Devolve `{ profile, accountType, isPlatformAdmin, loading,
reload }`. Se a linha não existir (conta criada antes do gatilho), criar na hora
com `account_type: 'corretor'` em vez de quebrar a tela.

### 2.2 `src/components/AppLayout.jsx` (novo) — **a peça central**

Hoje não existe layout compartilhado: cada página repete os próprios links no
canto. Passa a existir um componente único que envolve todas as telas de `/app` e
`/admin` e monta o menu **a partir do papel**.

Regra do menu — implementar exatamente assim:

```
sempre:
  Meus clientes        /app
  Imóveis              /app/imoveis
  Meus roteiros        /app/selecoes
  Meu perfil           /app/perfil

se pertence a alguma organização:
  + Minha organização  /app/organizacao

se é gerente+ de uma incorporadora:
  + Estoque            /app/estoque

se é gerente+ de uma imobiliária:
  + Seleção do time    /app/time

se is_platform_admin:
  + Administração      /admin
```

Quando `accountType` é `imobiliaria` ou `incorporadora`, a **ordem** muda: a área
da organização vem primeiro e "Meus clientes" desce — mas continua no menu. A casa
muda; nada some.

O menu que existe hoje dentro de `Dashboard.jsx` (linhas 106–125) some, e os links
"← Meus clientes" espalhados por `Portfolio.jsx`, `Launches.jsx`, `Selections.jsx`
e `Organization.jsx` também — o layout já dá a navegação.

Manter o seletor "Ver como" de organização que já existe em `Organization.jsx`
para quem é membro de mais de uma (`useOrganization.setActiveOrgId`), mas movê-lo
para o layout, junto do menu.

### 2.3 Guardas de rota — `App.jsx`

Não basta esconder o item do menu; a rota tem que recusar quem digitar o endereço.
Criar um `<RoleRoute exige="...">` ao lado do `ProtectedRoute` que já existe:

- `/app/estoque`, `/app/portfolio`, `/app/lancamentos/*` → membro de organização
- `/app/time` → gerente+ de organização do tipo `imobiliaria`
- `/admin/*` → `is_platform_admin()`

Quem não passa vai para a própria casa com um aviso curto, não para uma tela de
erro.

### 2.4 `Entry.jsx` e `Login.jsx` — o cadastro passa a valer

`RoleChooser` some. O tipo de conta é escolhido **no cadastro**, junto com o nome:

```js
supabase.auth.signUp({
  email, password,
  options: { data: { full_name: nome, account_type: tipo } }
})
```

O gatilho `handle_new_user` no banco grava em `profiles` — e já protege contra
valor inesperado (qualquer coisa fora da lista vira `corretor`). O front **não**
escreve `account_type` direto na tabela no cadastro.

`Entry.jsx` passa a redirecionar por `accountType`:
`corretor` → `/app`; `imobiliaria`/`incorporadora` → `/app/organizacao` (que, sem
organização ainda, mostra o formulário de criar). Ser admin da plataforma **não**
muda a casa de ninguém — `/admin` é escolha no menu.

### 2.5 `/app/imoveis` — `src/pages/Properties.jsx` (novo)

Substitui, para o corretor, os menus *Portfólio* e *Lançamentos*. Uma busca só
sobre tudo que existe na plataforma. O corretor não precisa entender a diferença
entre catálogo e empreendimento — ele quer achar o que mostrar pro cliente.

Carregar as duas fontes e juntar num formato comum:

```js
// av_portfolio_properties: select("*, av_portfolio_units(*), organizations(id,name,tipo)")
// av_launches:             select("*, av_launch_units(*), organizations(id,name,tipo)")
{ kind: 'portfolio' | 'lancamento', id, name, address, summary,
  orgId, orgName, units: [{ id, name, table_value, status? }] }
```

A RLS já filtra organização suspensa — não precisa de filtro no cliente.

Filtros: texto (nome, endereço, organização), faixa de valor (usar o menor
`table_value` do item), organização, e um toggle "só lançamentos / só prontos".
Nada de categorias inventadas — **não** criar listas fixas de tipo de imóvel,
padrão ou finalidade. O projeto tem diretriz explícita sobre isso: constrói-se o
mecanismo, o conteúdo é do usuário.

Se a pessoa é membro de uma imobiliária, carregar `av_team_picks` da organização
ativa e mostrar no topo uma seção **"Seleção da <nome da organização>"**, com a
observação que o gestor escreveu em cada item.

Cada resultado tem "Adicionar ao roteiro": escolher um roteiro existente do
corretor ou criar um novo para um cliente.

### 2.6 Extrair a importação para `src/lib/importar.js`

A lógica de copiar um item para dentro de uma seleção já existe **duplicada** em
dois lugares: `ImportFromPortfolio` (`SelectionDetail.jsx`, ~linha 751) e o
formulário de gerar roteiro a partir de lançamento (`LaunchDetail.jsx`, ~linha
400). A tela nova precisa da mesma coisa — extrair antes, não triplicar.

Duas funções: `importarPortfolio(selectionId, item, position)` e
`importarLancamento(selectionId, launch, unidadesDisponiveis, position)`. A
segunda **tem que continuar gravando `launch_unit_id`** em `av_units` — é o que
liga a unidade do roteiro ao estoque vivo, e o painel do cliente vai depender
disso (item 2.10).

Depois de extrair, `SelectionDetail.jsx` e `LaunchDetail.jsx` passam a chamar as
funções novas. Comportamento não muda.

### 2.7 `/app/perfil` — `src/pages/Profile.jsx` (novo)

Nome, CRECI, telefone, cor da marca, e o tipo de conta — editável, com uma linha
explicando o que muda ("define a tela em que você entra"). Salva em `profiles`.

Aproveitar para trocar, no roster de `Organization.jsx`, o e-mail pelo nome do
perfil quando existir (a política `Colegas de organização veem o perfil` já
libera isso).

### 2.8 `/app/time` — `src/pages/TeamPicks.jsx` (novo)

O papel da imobiliária, que hoje não existe. `av_launch_partners` só sinaliza
"estamos trabalhando este lançamento" e não chega a corretor nenhum — isto aqui é
a curadoria de verdade.

Gerente+ de imobiliária monta a lista: reusar o componente de busca de `Properties`
para escolher itens, gravar em `av_team_picks` com uma observação livre por item,
reordenar (`position`) e remover. A lista aparece para o time em `/app/imoveis`.

### 2.9 `/app/estoque` e `/admin` (telas novas)

**Estoque** reúne, em abas, o que hoje são `Launches.jsx` e `Portfolio.jsx` —
mantendo o código dessas páginas, só reorganizando a entrada. É a casa da
incorporadora.

**Administração** — três telas, todas alimentadas pelas RPCs já prontas:

- `/admin` → `platform_overview()`. Números gerais em cartões: contas, contas nos
  últimos 30 dias, organizações ativas, lançamentos, unidades, roteiros,
  avaliações, propostas, corretores ativos em 30 dias.
- `/admin/organizacoes` → `platform_organizations()`. Tabela com tipo, status,
  membros, lançamentos, unidades, imóveis. Botões de suspender / reativar
  (`update organizations set status = ...` — a política de admin já permite).
- `/admin/contas` → `platform_accounts()`. E-mail, nome, tipo de conta,
  organizações, roteiros, se é admin. Marcar/desmarcar admin escrevendo em
  `platform_admins`.

Visual: mesmo sistema do resto (`bg`, `charcoal`, `gold`, `rule`, `graytext`), mas
pode ser denso — é público gerencial, não precisa da simplicidade radical do
corretor.

### 2.10 Duas correções que estavam pendentes

**a) O cliente vê o e-mail do corretor, não o nome.**
`supabase/functions/cliente-painel/index.ts` devolve `corretor_email` porque não
havia onde guardar nome. Agora há: buscar `profiles.full_name` e devolver
`corretor_nome`, caindo para o e-mail só se o perfil estiver vazio. Ajustar
`ClientHome.jsx` para mostrar o nome.

**b) Unidade vendida não aparece no painel do cliente.**
Lacuna já registrada no projeto. `supabase/functions/aval-panel/index.ts` não olha
`launch_unit_id`. Fazer o join `av_units.launch_unit_id → av_launch_units.status`
e devolver o status; `PublicPanel.jsx` mostra "vendida" na unidade correspondente.
O valor de tabela **continua sendo o copiado no momento do roteiro** — histórico
não se reescreve; só o status é lido ao vivo.

---

## 3. Guardrails — o que não fazer

- **Não** criar listas fixas de categoria, tipo de imóvel, padrão ou finalidade.
  Mecanismo sim, conteúdo não.
- **Não** deixar `account_type` esconder a carteira de clientes de ninguém.
- **Não** expor, em nenhum painel de organização, nome de cliente, identidade de
  corretor ou comentário de avaliação. Isso vale inclusive nas telas novas. A
  única exceção deliberada é `/admin`, que é o time que opera a plataforma — e
  mesmo lá, nada de conteúdo de avaliação ou contato de cliente final.
- **Não** dar ao front qualquer caminho para escrever em `platform_admins` sem
  passar pela RLS (que já exige ser admin).
- A chave `service_role` continua só dentro das Edge Functions.

---

## 4. Como verificar antes de publicar

Você verifica; o Marcos confere pela tela. Não peça a ele nenhuma checagem
técnica.

**Suas verificações, antes de mostrar qualquer coisa a ele:**

1. `npm run build` limpo.
2. Migração aplicada e `platform_admins` com a linha do Marcos.
3. Contas de teste criadas por SQL direto (tipos diferentes: corretor sem
   organização, gerente de imobiliária, gerente de incorporadora) — e apagadas no
   fim de cada rodada. Nunca criar conta real nem pedir a senha do Marcos.
4. Com a conta de teste sem organização: o menu **não** traz Organização, Estoque,
   Seleção do time nem Administração, e a URL `/admin` digitada na mão não abre.
5. Suspender uma organização de teste e conferir que os lançamentos dela somem de
   `/app/imoveis` para uma conta de fora, mas continuam visíveis para um membro.

**O que pedir ao Marcos, em português comum, depois:**

- "Entre no sistema e me diga se a primeira tela que abriu faz sentido pro seu
  papel."
- "No menu, aparece **Administração**? Clique e me diga se os números batem com o
  que você espera."
- "Abra o link permanente do Pedro e me diga se aparece o seu **nome** ou o seu
  e-mail."

Cada publicação custa uma ação manual dele. Teste tudo o que der antes de pedir
uma.

---

## 5. Ordem sugerida

Publicável e conferível um bloco por vez:

1. Aplicar a migração (seção 1) + `useProfile` + cadastro gravando o tipo.
2. `AppLayout` + guardas de rota + home por papel. *(É aqui que a bagunça acaba.)*
3. `/admin` completo.
4. `importar.js` extraído + `/app/imoveis`.
5. `/app/time` e `/app/estoque`.
6. As duas correções do item 2.10.

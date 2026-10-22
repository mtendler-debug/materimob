import { Link } from "react-router-dom";
import { WHATSAPP_EXIBIDO, whatsappUrl } from "../lib/contato";

const FERRAMENTAS = [
  {
    selo: "Gratuito",
    seloOk: true,
    titulo: "Avaliador",
    texto: "O cliente e a família avaliam cada imóvel visitado, pelo celular, sem senha e sem instalar nada.",
    itens: ["Ranking e comparativo por critério", "Propostas com deságio sobre a tabela", "Funil e cronograma até a assinatura"],
  },
  {
    selo: "Liberado agora",
    seloOk: true,
    titulo: "CRM",
    texto: "Seus leads e oportunidades num funil simples, ligado aos clientes que já avaliam com você.",
    itens: ["Pipeline de oportunidades", "Histórico de cada lead", "Aviso quando um lead pode virar dois negócios"],
  },
  {
    selo: "Acesso por aprovação",
    titulo: "Academia de Vendas",
    texto:
      "Tudo para apresentar e vender cada projeto: materiais prontos, treinamento e argumentos, para qualquer corretor que peça acesso.",
    itens: ["Materiais prontos e envio ao cliente pelo WhatsApp", "Treinamento e argumentos de venda", "Registro dos seus clientes, com prazo"],
  },
  {
    selo: "Incorporadoras",
    titulo: "Lançamentos e portfólio",
    texto: "A incorporadora publica o empreendimento e qualquer corretor da plataforma monta o roteiro com ele.",
    itens: ["Reserva de unidade sem duplicidade", "Status atualizado na hora para o cliente", "Estoque em tempo real"],
  },
];

const PASSOS = [
  { titulo: "Você monta o roteiro", texto: "Escolhe os imóveis, as unidades e os critérios que importam para aquele cliente." },
  {
    titulo: "O cliente avalia",
    texto:
      "Um link por cliente, no celular. Cada pessoa dá as próprias notas durante a visita, mesmo sem sinal dentro do prédio.",
  },
  {
    titulo: "A decisão fica clara",
    texto: "Ranking, comparativo e propostas. O cliente vê onde cada opção ganha e perde, e você conduz a negociação.",
  },
];

const PREMISSAS = [
  { titulo: "Sem curva de aprendizado", texto: "Pensado para quem vive de atender gente, não de operar sistema." },
  { titulo: "O corretor no centro", texto: "A ponte entre o mercado e o cliente continua sendo você." },
  {
    titulo: "Integrar, não competir",
    texto: "Não disputamos anúncio. Ajudamos a decidir depois que você já conhece o mercado.",
  },
];

const botao = {
  escuro: "bg-charcoal text-white hover:opacity-90",
  azul: "bg-sky-600 text-white hover:bg-sky-700",
  linha: "border-[1.5px] border-rule bg-white text-charcoal hover:border-sky-600",
};

// Página de entrada pública (materimob.com.br/). Quem já está logado nunca chega aqui:
// o Entry leva direto ao painel.
export default function Landing() {
  return (
    <div className="bg-bg text-slate-700">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
        <Link to="/" className="text-lg font-extrabold tracking-tight text-charcoal">
          MaterImob
        </Link>
        <span className="flex-1" />
        <Link to="/entrar" className={`rounded-[10px] px-3.5 py-2 text-sm font-bold ${botao.linha}`}>
          Entrar
        </Link>
        <Link to="/entrar?modo=criar" className={`hidden rounded-[10px] px-3.5 py-2 text-sm font-bold sm:inline-block ${botao.escuro}`}>
          Criar conta grátis
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 pt-8 pb-16 md:grid-cols-[1.1fr_.9fr] md:pt-14 md:pb-20">
          <div>
            <p className="text-[11.5px] font-bold tracking-[.16em] text-sky-700 uppercase">A plataforma do corretor</p>
            <h1 className="mt-3.5 text-[clamp(2rem,5.4vw,3.25rem)] leading-[1.08] font-extrabold tracking-tight text-balance text-charcoal">
              Da primeira visita ao fechamento, num só lugar.
            </h1>
            <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed">
              O MaterImob organiza o trabalho do corretor: o cliente avalia os imóveis pelo celular, você acompanha seus
              leads e propostas, e ainda conta com materiais, treinamento e argumentos de venda prontos para usar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/entrar?modo=criar" className={`rounded-[10px] px-5 py-3 text-[15px] font-bold ${botao.azul}`}>
                Criar conta grátis
              </Link>
              <a href="#ferramentas" className={`rounded-[10px] px-5 py-3 text-[15px] font-bold ${botao.linha}`}>
                Conhecer as ferramentas
              </a>
            </div>
            <p className="mt-3.5 text-[13.5px] text-graytext">
              Gratuito para o corretor. O CRM está liberado para todos neste momento.
            </p>
          </div>

          <div aria-label="Exemplo de ranking de imóveis" className="rounded-[18px] border border-rule bg-white p-[18px] shadow-[0_12px_36px_rgba(15,23,42,.08)]">
            <div className="flex items-baseline justify-between gap-2.5">
              <b className="text-[15px] text-charcoal">Ranking dos imóveis visitados</b>
              <span className="text-xs text-graytext">Casal Almeida</span>
            </div>
            <ol className="mt-3.5 space-y-2.5">
              {[
                ["1", "Residencial Vila Verde · apto 403", "Nota geral 9,0 · critérios 8,4", "8,7"],
                ["2", "Edifício Aurora · apto 101", "Nota geral 8,0 · critérios 8,1", "8,0"],
                ["3", "Condomínio Parque Sul · casa 12", "Nota geral 7,5 · critérios 7,2", "7,3"],
              ].map(([n, nome, nota, score]) => (
                <li key={n} className="grid grid-cols-[26px_1fr_auto] items-center gap-2.5 rounded-[12px] border border-rule px-3 py-2.5">
                  <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-sky-100 text-[13px] font-bold text-sky-800">
                    {n}
                  </span>
                  <div className="min-w-0">
                    <b className="block text-[14.5px] text-charcoal">{nome}</b>
                    <small className="text-[12.5px] text-graytext">{nota}</small>
                  </div>
                  <span className="font-extrabold text-charcoal tabular-nums">{score}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 rounded-[10px] bg-emerald-100 px-3 py-2 text-[13px] text-emerald-800">
              Proposta registrada: R$ 612.000 na unidade 403, 4,8% abaixo da tabela.
            </div>
            <p className="mt-2.5 text-[11.5px] text-graytext">Exemplo ilustrativo</p>
          </div>
        </section>

        <section id="ferramentas" className="border-y border-rule bg-white py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="max-w-[640px]">
              <p className="text-[11.5px] font-bold tracking-[.16em] text-sky-700 uppercase">Quatro ferramentas, uma conta</p>
              <h2 className="mt-2.5 text-[clamp(1.6rem,3.6vw,2.1rem)] leading-tight font-bold tracking-tight text-charcoal">
                Use só o que o seu trabalho pede.
              </h2>
              <p className="mt-3 text-graytext">
                Todas vivem no mesmo login. Você começa pelo Avaliador e liga as outras quando fizerem sentido.
              </p>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FERRAMENTAS.map((f) => (
                <article key={f.titulo} className="flex flex-col gap-2.5 rounded-[16px] border border-rule bg-bg p-5">
                  <span
                    className={`self-start rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                      f.seloOk ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                    }`}
                  >
                    {f.selo}
                  </span>
                  <h3 className="text-lg font-bold text-charcoal">{f.titulo}</h3>
                  <p className="text-[14.5px] leading-relaxed">{f.texto}</p>
                  <ul className="list-disc space-y-0.5 pl-[18px] text-sm text-graytext">
                    {f.itens.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="portas" className="mx-auto max-w-5xl px-5 py-16">
          <p className="text-[11.5px] font-bold tracking-[.16em] text-sky-700 uppercase">Por onde começar</p>
          <h2 className="mt-2.5 text-[clamp(1.6rem,3.6vw,2.1rem)] leading-tight font-bold tracking-tight text-charcoal">
            Escolha o seu caminho.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Porta
              quem="Corretor"
              titulo="Criar minha conta"
              texto="Monte o primeiro atendimento em poucos minutos e mande o link de avaliação ao cliente. O Avaliador é grátis, e o CRM está liberado."
              botaoLabel="Criar conta grátis"
              botaoTipo="azul"
              to="/entrar?modo=criar"
              extra={<Link to="/entrar" className="text-center text-sm text-graytext hover:underline">Já tenho conta · Entrar</Link>}
            />
            <Porta
              quem="Corretor ou gestor de imobiliária"
              titulo="Pedir acesso à Academia"
              texto="Faça o seu cadastro e peça acesso. A coordenação confere e libera, e você recebe o aviso. Gestores acompanham a equipe da imobiliária."
              botaoLabel="Pedir acesso à Academia"
              botaoTipo="escuro"
              to="/academia"
              extra={<Link to="/academia" className="text-center text-sm text-graytext hover:underline">Sou autônomo, sem imobiliária</Link>}
            />
            <Porta
              quem="Incorporadora ou imobiliária"
              titulo="Falar com a gente"
              texto="Publique seu portfólio ou seus lançamentos e conecte o seu time ao ecossistema de corretores."
              botaoLabel="Chamar no WhatsApp"
              botaoTipo="linha"
              href={whatsappUrl("Olá! Quero saber mais sobre o MaterImob para a minha empresa.")}
              extra={
                <>
                  <p className="text-center text-sm text-graytext">{WHATSAPP_EXIBIDO}</p>
                  <Link to="/parceria/cadastro" className="text-center text-sm text-graytext hover:underline">
                    Cadastrar minha imobiliária na rede de parceiras
                  </Link>
                </>
              }
            />
          </div>
        </section>

        <section className="border-y border-rule bg-white py-16">
          <div className="mx-auto max-w-5xl px-5">
            <p className="text-[11.5px] font-bold tracking-[.16em] text-sky-700 uppercase">Como funciona o Avaliador</p>
            <h2 className="mt-2.5 text-[clamp(1.6rem,3.6vw,2.1rem)] leading-tight font-bold tracking-tight text-charcoal">
              Três passos entre a visita e a decisão.
            </h2>
            <div className="mt-8 grid gap-7 sm:grid-cols-3">
              {PASSOS.map((p, i) => (
                <div key={p.titulo}>
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 font-extrabold text-sky-800">{i + 1}</div>
                  <h3 className="mt-3 text-[17px] font-bold text-charcoal">{p.titulo}</h3>
                  <p className="mt-1.5 text-[14.5px] text-graytext">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-charcoal text-slate-50">
          <div className="mx-auto grid max-w-5xl gap-7 px-5 py-14">
            <h2 className="max-w-[24ch] text-[clamp(1.5rem,3.4vw,2rem)] leading-tight font-bold tracking-tight text-balance">
              Simples para o corretor, mais simples ainda para o cliente.
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {PREMISSAS.map((p) => (
                <div key={p.titulo}>
                  <b className="block text-[15.5px]">{p.titulo}</b>
                  <span className="text-sm text-slate-300">{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-7 gap-y-3 px-5 pt-9 pb-6 text-[13.5px] text-graytext">
          <span>© MaterImob</span>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-5">
            <a href="/privacidade.html" className="hover:underline">Política de privacidade</a>
            <Link to="/entrar" className="hover:underline">Entrar</Link>
            <a href={whatsappUrl()} target="_blank" rel="noreferrer" className="hover:underline">
              Fale com a gente · {WHATSAPP_EXIBIDO}
            </a>
          </nav>
        </div>
        <p className="mx-auto max-w-5xl px-5 pb-10 text-[12.5px] text-graytext">
          As avaliações e propostas registradas indicam preferência e intenção. Não constituem proposta formal nem
          compromisso de compra.
        </p>
      </footer>
    </div>
  );
}

function Porta({ quem, titulo, texto, botaoLabel, botaoTipo, to, href, extra }) {
  const cls = `rounded-[10px] px-5 py-3 text-center text-[15px] font-bold ${botao[botaoTipo]}`;
  return (
    <article className="flex flex-col gap-2.5 rounded-[16px] border border-rule bg-white p-6">
      <span className="text-[12.5px] font-bold tracking-[.06em] text-graytext uppercase">{quem}</span>
      <h3 className="text-[19px] font-bold text-charcoal">{titulo}</h3>
      <p className="flex-1 text-[14.5px] leading-relaxed">{texto}</p>
      {to ? (
        <Link to={to} className={cls}>
          {botaoLabel}
        </Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer" className={cls}>
          {botaoLabel}
        </a>
      )}
      {extra}
    </article>
  );
}

import { Link } from "react-router-dom";
import { WHATSAPP_EXIBIDO, whatsappUrl } from "../lib/contato";
import Button from "../components/ui/Button";

const FERRAMENTAS = [
  {
    selo: "Avaliador · grátis",
    titulo: "Sem senha. Sem app. Só um link.",
    texto: "Cada pessoa da família dá as próprias notas durante a visita, mesmo sem sinal dentro do prédio.",
    itens: ["Ranking e comparativo por critério", "Propostas com deságio sobre a tabela", "Funil e cronograma até a assinatura"],
    visual: "ranking",
  },
  {
    selo: "CRM · liberado agora",
    titulo: "Seus leads num funil simples.",
    texto: "Ligado aos clientes que já avaliam com você, com aviso quando um lead pode virar dois negócios.",
    itens: ["Pipeline de oportunidades", "Histórico de cada lead", "Aviso de lead com dois negócios"],
    visual: "funil",
  },
  {
    selo: "Academia · por aprovação",
    titulo: "Materiais e argumentos prontos.",
    texto: "Treinamento, envio ao cliente pelo WhatsApp e registro dos seus clientes, com prazo.",
    itens: ["Materiais prontos para cada projeto", "Treinamento e argumentos de venda", "Registro dos clientes, com prazo"],
    visual: "academia",
  },
  {
    selo: "Lançamentos · incorporadoras",
    titulo: "O estoque, sempre atualizado.",
    texto: "A incorporadora publica o empreendimento e qualquer corretor da plataforma monta o roteiro com ele.",
    itens: ["Reserva de unidade sem duplicidade", "Status atualizado na hora para o cliente", "Estoque em tempo real"],
    visual: "estoque",
  },
];

const RANKING = [
  ["Vila Verde · 403", "Nota geral 9,0 · critérios 8,4", "8,7"],
  ["Aurora · 101", "Nota geral 8,0 · critérios 8,1", "8,0"],
  ["Parque Sul · casa 12", "Nota geral 7,5 · critérios 7,2", "7,3"],
];

const PREMISSAS = [
  { titulo: "Sem curva de aprendizado", texto: "Pensado para quem vive de atender gente, não de operar sistema." },
  { titulo: "O corretor no centro", texto: "A ponte entre o mercado e o cliente continua sendo você." },
  { titulo: "Integrar, não competir", texto: "Não disputamos anúncio. Ajudamos a decidir depois que você já conhece o mercado." },
];

const rotulo = "text-body-sm font-semibold text-brand";
const titulo = "font-bold tracking-[-0.035em] text-charcoal text-balance";
const gutter = "mx-auto w-full max-w-[1080px] px-4";

// Página de entrada pública (materimob.com.br/). Quem já está logado nunca chega aqui:
// o Entry leva direto ao painel.
export default function Landing() {
  return (
    <div className="bg-white text-slate-700">
      <header className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/75 backdrop-blur-xl">
        <div className={`${gutter} flex min-h-16 items-center gap-2`}>
          <Link to="/" className="mr-auto text-lg font-bold tracking-tight text-charcoal">
            MaterImob
          </Link>
          <Button to="/entrar" variant="secondary">
            Entrar
          </Button>
          <Button to="/entrar?modo=criar" variant="dark" className="hidden sm:inline-flex">
            Criar conta
          </Button>
        </div>
      </header>

      <main>
        <section className={`${gutter} pt-14 text-center sm:pt-24`}>
          <h1 className="mx-auto max-w-[14ch] text-[clamp(2.6rem,8vw,5.2rem)] leading-none font-bold tracking-[-0.045em] text-balance text-charcoal">
            O cliente avalia. <span className="text-brand">Você fecha.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-[46ch] text-[clamp(1.05rem,2.2vw,1.3rem)] text-graytext">
            A plataforma do corretor: avaliação de imóveis pelo celular, CRM e Academia de Vendas numa só conta.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button to="/entrar?modo=criar" size="lg">
              Criar conta grátis
            </Button>
            <Button href="#ferramentas" variant="secondary" size="lg">
              Ver como funciona
            </Button>
          </div>
          <p className="mt-4 text-body-sm text-graytext">Gratuito para o corretor. O CRM está liberado para todos neste momento.</p>

          <div className="mt-16 flex items-end justify-center gap-8 overflow-hidden rounded-t-[32px] bg-gradient-to-b from-light to-rule px-4 pt-12">
            <div className="hidden w-64 pb-10 text-left lg:block">
              <div className="rounded-card bg-white p-4 text-caption shadow-soft">
                <span className="text-graytext">Ranking · Casal Almeida</span>
                <b className="block text-body-sm text-charcoal">Vila Verde · apto 403</b>
                nota 8,7
              </div>
              <div className="mt-3 rounded-card bg-white p-4 text-caption shadow-soft">
                <b className="block text-body-sm text-charcoal">Proposta registrada</b>
                R$ 612.000 · 4,8% abaixo da tabela
              </div>
              <p className="mt-3 text-caption text-muted">Exemplo ilustrativo</p>
            </div>
            <div className="w-[min(300px,78vw)] rounded-t-[44px] bg-charcoal p-2.5 pb-0 shadow-float">
              <div className="min-h-[340px] rounded-t-[34px] bg-white px-[18px] pt-[22px] pb-6 text-left">
                <small className="text-caption text-graytext">Residencial Vila Verde · apto 403</small>
                <h2 className="mt-0.5 mb-3.5 text-title font-bold tracking-tight text-charcoal">Como foi a visita?</h2>
                {[
                  ["Localização", 4],
                  ["Acabamento", 3],
                  ["Luz natural", 5],
                ].map(([nome, n]) => (
                  <div key={nome}>
                    <small className="text-caption text-graytext">{nome}</small>
                    <div className="mt-1.5 mb-3.5 flex gap-1">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={`h-[22px] w-[22px] rounded-full ${i <= n ? "bg-brand" : "bg-rule"}`} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-5 grid min-h-11 place-items-center rounded-control bg-brand text-body-sm font-semibold text-white">
                  Enviar avaliação
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="ferramentas" className={`${gutter} grid gap-20 py-20 sm:gap-28 sm:py-32`}>
          {FERRAMENTAS.map((f, i) => (
            <div key={f.selo} className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
              <div className={`space-y-3.5 ${i % 2 ? "md:order-2" : ""}`}>
                <p className={rotulo}>{f.selo}</p>
                <h2 className={`text-[clamp(1.9rem,4vw,2.8rem)] leading-[1.05] ${titulo}`}>{f.titulo}</h2>
                <p className="max-w-[42ch] text-lg text-graytext">{f.texto}</p>
                <ul className="space-y-1 pt-1 text-body-sm text-graytext">
                  {f.itens.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <Visual tipo={f.visual} />
            </div>
          ))}
        </section>

        <section id="portas" className="bg-bg py-20 sm:py-28">
          <div className={gutter}>
            <div className="mx-auto max-w-[16ch] text-center">
              <h2 className={`text-[clamp(2rem,5vw,3.4rem)] leading-[1.05] ${titulo}`}>Comece pelo primeiro cliente.</h2>
            </div>
            <div className="mt-8 flex justify-center">
              <Button to="/entrar?modo=criar" size="lg">
                Criar conta grátis
              </Button>
            </div>
            <p className="mt-3.5 text-center text-body-sm text-graytext">
              Já tem conta?{" "}
              <Link to="/entrar" className="font-semibold text-charcoal hover:underline">
                Entrar
              </Link>
            </p>

            <div className="mt-14 grid gap-3 md:grid-cols-3">
              <Porta
                quem="Corretor ou gestor de imobiliária"
                titulo="Pedir acesso à Academia"
                texto="Faça o cadastro e peça acesso. A coordenação confere e libera, e você recebe o aviso."
                to="/academia"
                label="Pedir acesso"
              />
              <Porta
                quem="Incorporadora ou imobiliária"
                titulo="Falar com a gente"
                texto="Publique seu portfólio ou seus lançamentos e conecte o seu time ao ecossistema de corretores."
                href={whatsappUrl("Olá! Quero saber mais sobre o MaterImob para a minha empresa.")}
                label={`WhatsApp · ${WHATSAPP_EXIBIDO}`}
              />
              <Porta
                quem="Imobiliária parceira"
                titulo="Rede de parceiras"
                texto="Cadastre a sua imobiliária na rede de parceiras do MaterImob."
                to="/parceria/cadastro"
                label="Cadastrar imobiliária"
              />
            </div>
          </div>
        </section>

        <section className="bg-charcoal text-slate-200">
          <div className={`${gutter} py-16`}>
            <h2 className="max-w-[22ch] text-[clamp(1.5rem,3.4vw,2rem)] leading-tight font-bold tracking-tight text-balance text-white">
              Simples para o corretor, mais simples ainda para o cliente.
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {PREMISSAS.map((p) => (
                <div key={p.titulo}>
                  <b className="mb-1 block font-semibold text-white">{p.titulo}</b>
                  <span className="text-body-sm text-slate-400">{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className={`${gutter} py-10 text-body-sm text-graytext`}>
        <div className="flex flex-wrap items-center justify-between gap-x-7 gap-y-3">
          <span>© MaterImob</span>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-5">
            <a href="/privacidade.html" className="hover:text-charcoal">Política de privacidade</a>
            <Link to="/entrar" className="hover:text-charcoal">Entrar</Link>
            <a href={whatsappUrl()} target="_blank" rel="noreferrer" className="hover:text-charcoal">
              Fale com a gente · {WHATSAPP_EXIBIDO}
            </a>
          </nav>
        </div>
        <p className="mt-4 max-w-[70ch] text-caption text-muted">
          As avaliações e propostas registradas indicam preferência e intenção. Não constituem proposta formal nem
          compromisso de compra.
        </p>
      </footer>
    </div>
  );
}

function Visual({ tipo }) {
  const moldura = "grid min-h-[260px] place-items-center rounded-[28px] bg-bg p-7";
  const cartao = "w-full max-w-[340px] rounded-[18px] bg-white p-[18px] text-caption shadow-soft";
  const linha = "flex items-center gap-2.5 border-t border-slate-200/70 py-2.5 text-body-sm first:border-0";
  return (
    <div className={moldura} aria-hidden="true">
      <div className={cartao}>
        {tipo === "ranking" &&
          RANKING.map(([nome, nota, score]) => (
            <div key={nome} className={linha}>
              <span className="min-w-0">
                <b className="block font-semibold text-charcoal">{nome}</b>
                <i className="text-caption text-graytext not-italic">{nota}</i>
              </span>
              <b className="ml-auto font-bold text-charcoal tabular-nums">{score}</b>
            </div>
          ))}
        {tipo === "funil" &&
          [["Novo", 4], ["Visita marcada", 7], ["Proposta", 2]].map(([etapa, n]) => (
            <div key={etapa} className={linha}>
              <span>{etapa}</span>
              <b className="ml-auto font-bold text-charcoal tabular-nums">{n}</b>
            </div>
          ))}
        {tipo === "academia" && (
          <>
            <b className="text-body-sm text-charcoal">Residencial Vila Verde</b>
            <p className="mt-1.5 text-body-sm text-graytext">Book, tabela de preços e 5 argumentos de venda</p>
            <div className="mt-3.5 grid min-h-11 place-items-center rounded-control bg-brand text-body-sm font-semibold text-white">
              Enviar pelo WhatsApp
            </div>
          </>
        )}
        {tipo === "estoque" &&
          [["Unidade 403", "Reservada"], ["Unidade 501", "Disponível"], ["Unidade 702", "Disponível"]].map(([un, st]) => (
            <div key={un} className={linha}>
              <span>{un}</span>
              <b className={`ml-auto rounded-full px-2.5 py-0.5 text-caption font-semibold ${st === "Reservada" ? "bg-warning-bg text-warning-text" : "bg-success-bg text-success-text"}`}>
                {st}
              </b>
            </div>
          ))}
      </div>
    </div>
  );
}

function Porta({ quem, titulo, texto, to, href, label }) {
  const botao = to ? (
    <Button to={to} variant="secondary" block>
      {label}
    </Button>
  ) : (
    <Button href={href} target="_blank" rel="noreferrer" variant="secondary" block>
      {label}
    </Button>
  );
  return (
    <article className="flex flex-col gap-3 rounded-card border border-slate-200/70 bg-white p-7 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft">
      <span className="text-caption font-semibold tracking-[.06em] text-graytext uppercase">{quem}</span>
      <h3 className="text-title font-semibold tracking-tight text-charcoal">{titulo}</h3>
      <p className="flex-1 text-body-sm text-graytext">{texto}</p>
      {botao}
    </article>
  );
}

import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "Roteiro de visita",
    body: "A partir da conversa com o cliente, o corretor separa os imóveis certos — com critérios próprios, unidades e cronograma até a assinatura.",
  },
  {
    title: "Avaliação sem fricção",
    body: "O cliente avalia pelo celular, sem senha e sem instalar nada. O rascunho fica salvo automaticamente, mesmo com sinal ruim dentro do prédio.",
  },
  {
    title: "Ranking automático",
    body: "Nota geral e média por critério calculadas na hora, com comparativo lado a lado entre os imóveis visitados — sem planilha manual.",
  },
  {
    title: "Propostas com deságio",
    body: "Registradas direto no painel do cliente. O corretor recebe o valor, a unidade e a intenção de compra, prontos para conduzir a negociação.",
  },
  {
    title: "Portfólio compartilhado",
    body: "Imóveis prontos e usados ficam disponíveis para qualquer corretor da plataforma montar um roteiro — com cadastro em massa por planilha.",
  },
  {
    title: "Lançamentos ao vivo",
    body: "Incorporadora publica o empreendimento; qualquer corretor monta o roteiro. Reserva de unidade é atômica — sem duplicidade — e o status aparece na hora para o cliente.",
  },
];

const PRINCIPLES = [
  {
    label: "Simplicidade absoluta",
    body: "O corretor usa algo simples e direto, pensado para quem não vive de tecnologia. E o cliente final usa algo ainda mais simples que isso.",
  },
  {
    label: "O corretor e o cliente no centro da experiência",
    body: "A ponte entre o mercado e o cliente é feita pelo corretor de forma clara, objetiva e alinhada com as expectativas.",
  },
  {
    label: "Integrar, não substituir",
    body: "Não competimos por ter mais anúncio que ninguém. A diferença é o que se faz com a informação depois que o corretor já sabe o que existe no mercado.",
  },
];

export default function Landing() {
  return (
    <div className="bg-bg text-charcoal">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-serif text-lg tracking-tight">MaterImob</span>
        <Link
          to="/entrar"
          className="rounded-[9px] border-[1.5px] border-rule px-4 py-2 text-sm font-medium text-charcoal hover:border-gold"
        >
          Entrar
        </Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 pt-16 pb-20 text-center sm:pt-24">
        <p className="text-[11px] font-bold tracking-[0.2em] text-gold uppercase">
          Da visita à decisão
        </p>
        <h1 className="font-serif mt-4 text-[2.5rem] leading-[1.1] tracking-tight text-balance sm:text-[3.25rem]">
          A ferramenta do corretor para fechar negócio
        </h1>
        <p className="text-graytext mx-auto mt-6 max-w-xl text-[16px] leading-relaxed">
          O corretor monta o roteiro de visitas, o cliente avalia pelo celular, e os dois
          seguem juntos até a assinatura — em vez de PDF solto e conversa perdida no
          WhatsApp.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/entrar"
            className="rounded-[10px] bg-charcoal px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Sou corretor — entrar
          </Link>
          <a
            href="#incorporadoras"
            className="rounded-[10px] border-[1.5px] border-rule px-6 py-3 text-sm font-bold text-charcoal hover:border-gold"
          >
            Represento uma incorporadora
          </a>
        </div>
      </section>

      <section className="border-rule border-y bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-graytext text-center text-[11px] font-bold tracking-[0.14em] uppercase">
            Como funciona
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <Step n="1" title="O corretor monta o roteiro">
              A partir da conversa com o cliente, separa os imóveis de interesse — critérios,
              unidades visitadas e etapas até o fechamento.
            </Step>
            <Step n="2" title="O cliente avalia pelo celular">
              Só os imóveis que o corretor separou para ele. Sem conta, sem senha, sem
              instalar nada.
            </Step>
            <Step n="3" title="A decisão vira processo">
              Ranking, comparativo por critério e proposta — tudo isso já estrutura o caminho
              até a compra.
            </Step>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-graytext text-center text-[11px] font-bold tracking-[0.14em] uppercase">
          Funcionalidades
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="border-rule rounded-[14px] border bg-white p-5">
              <h3 className="text-[15px] font-bold text-charcoal">{f.title}</h3>
              <p className="text-graytext mt-2 text-[13.5px] leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-gold uppercase">
            Premissas
          </h2>
          <div className="mt-8 space-y-8">
            {PRINCIPLES.map((p) => (
              <div key={p.label}>
                <p className="font-serif text-xl">{p.label}</p>
                <p className="mx-auto mt-2 max-w-lg text-[14.5px] leading-relaxed text-[#C9C9C9]">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="incorporadoras" className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-graytext text-[11px] font-bold tracking-[0.14em] uppercase">
          Para incorporadoras e imobiliárias
        </h2>
        <p className="font-serif mt-4 text-2xl text-balance">
          Gratuito para o corretor autônomo. Para quem licencia o time inteiro, MaterImob
          conecta a sua equipe ao ecossistema.
        </p>
        <p className="text-graytext mx-auto mt-4 max-w-xl text-[15px] leading-relaxed">
          Publique seu portfólio ou seus lançamentos e ganhe distribuição por qualquer corretor
          da plataforma — com controle de estoque em tempo real e visão de como cada
          empreendimento está sendo apresentado, sem tirar a simplicidade de quem está na
          ponta com o cliente.
        </p>
        <div className="mt-8">
          <a
            href="mailto:contato@materimob.com.br"
            className="rounded-[10px] bg-charcoal px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Fale com a gente
          </a>
        </div>
      </section>

      <footer className="border-rule border-t px-6 py-10 text-center">
        <p className="text-muted text-[12px]">MaterImob — feito para o corretor fechar o próximo negócio.</p>
      </footer>
    </div>
  );
}

function Step({ n, title, children }) {
  return (
    <div className="text-center sm:text-left">
      <div className="border-gold text-gold mx-auto flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] font-serif text-base sm:mx-0">
        {n}
      </div>
      <h3 className="mt-3 text-[15px] font-bold text-charcoal">{title}</h3>
      <p className="text-graytext mt-1 text-[13.5px] leading-relaxed">{children}</p>
    </div>
  );
}

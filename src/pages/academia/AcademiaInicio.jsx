import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import Button from "../../components/ui/Button";

const PAPEL_LABELS = { corretor: "Corretor", gestor: "Gestor da imobiliária" };

const STATUS_TELA = {
  pendente: {
    simbolo: "…",
    tom: "bg-warning-bg text-warning-text",
    titulo: "Pedido recebido",
    texto: "Assim que o acesso for liberado, ele aparece aqui. Não precisa fazer mais nada.",
  },
  recusado: {
    simbolo: "×",
    tom: "bg-danger-bg text-danger-text",
    titulo: "Pedido não aprovado",
    texto: "Não foi possível liberar este acesso. Se foi um engano, fale com a coordenação de parcerias.",
  },
  bloqueado: {
    simbolo: "!",
    tom: "bg-light text-graytext",
    titulo: "Acesso suspenso",
    texto: "Seu acesso à Academia está suspenso. Fale com a coordenação de parcerias para saber o motivo.",
  },
};

export default function AcademiaInicio() {
  const { acesso } = useAcessoCanal();

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso === null) return <SemPedido />;
  if (acesso.status !== "liberado") return <StatusAcesso acesso={acesso} />;
  return <Inicio acesso={acesso} />;
}

function SemPedido() {
  return (
    <div className="mx-auto max-w-[420px] px-6 pt-14 pb-10 text-center">
      <h1 className="text-headline font-bold tracking-[-0.035em] text-charcoal">Academia de Vendas</h1>
      <p className="mt-2 text-base text-graytext">
        Materiais prontos, treinamento e argumentos de venda, para o corretor apresentar cada projeto com segurança.
        Peça acesso e a coordenação libera.
      </p>
      <Button to="/academia" size="lg" className="mt-6">
        Pedir acesso
      </Button>
    </div>
  );
}

function StatusAcesso({ acesso }) {
  const t = STATUS_TELA[acesso.status] ?? STATUS_TELA.pendente;
  return (
    <div className="mx-auto max-w-[420px] px-6 pt-14 pb-10">
      <div className="text-center">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-[26px] font-bold ${t.tom}`}>{t.simbolo}</div>
        <h1 className="mt-[18px] text-headline font-bold tracking-[-0.035em] text-charcoal">{t.titulo}</h1>
        <p className="mt-2 text-base text-graytext">{t.texto}</p>
      </div>
      <dl className="mt-6 divide-y divide-slate-100 rounded-card border border-slate-200/70 bg-white px-4 text-body-sm">
        <Linha rotulo="Nome" valor={acesso.nome} />
        <Linha rotulo="Papel" valor={PAPEL_LABELS[acesso.papel] ?? acesso.papel} />
        <Linha rotulo="Imobiliária" valor={acesso.parceira || "Autônomo"} />
      </dl>
      <Button to="/app/academia/dados" variant="ghost" block className="mt-3">
        Corrigir meus dados
      </Button>
    </div>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <div className="flex justify-between gap-3 py-3">
      <dt className="text-graytext">{rotulo}</dt>
      <dd className="text-right font-semibold text-charcoal">{valor}</dd>
    </div>
  );
}

function Inicio({ acesso }) {
  const [avisos, setAvisos] = useState(null);
  const [numeros, setNumeros] = useState(null);
  const [trilha, setTrilha] = useState(undefined);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const [av, nu, ac, tr] = await Promise.all([
        supabase.from("pc_avisos").select("id, titulo, texto").order("publicado_em", { ascending: false }).limit(3),
        supabase.rpc("pc_meus_numeros"),
        supabase.rpc("pc_minha_academia"),
        supabase.from("pc_trilhas").select("id, titulo, nivel, ordem").order("ordem").order("nivel"),
      ]);
      if (!ativo) return;
      setAvisos(av.data ?? []);
      setNumeros(nu.data ?? {});

      const andamento = new Map((ac.data ?? []).map((a) => [a.trilha_id, a]));
      const lista = (tr.data ?? []).filter((t) => andamento.has(t.id));
      const proxima = lista.find((t) => !andamento.get(t.id).certificado);
      setTrilha(proxima ? { ...proxima, ...andamento.get(proxima.id) } : lista.length ? null : undefined);
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const primeiroNome = (acesso.nome ?? "").trim().split(/\s+/)[0] || "parceiro";
  const pct = trilha && trilha.aulas_total ? Math.round((100 * trilha.aulas_feitas) / trilha.aulas_total) : 0;

  const ATALHOS = [
    ["/app/academia/projetos", "Projetos", "Materiais prontos", "M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 11h2M14 11h2"],
    ["/app/academia/argumentos", "Argumentos", "O que dizer", "M4 5h16v11H9l-5 4z"],
    ["/app/academia/clientes", "Clientes", "Registrar e acompanhar", "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c1.8.8 3 2.6 3 5M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
    ["/app/academia/treinamento", "Treinamento", "Todas as trilhas", "M3 9l9-4 9 4-9 4zM7 11v5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-5"],
  ];

  return (
    <div className="mx-auto max-w-[560px] px-5 pt-5 pb-24 md:pb-10">
      <div className="flex items-center justify-between gap-2.5">
        <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal">Olá, {primeiroNome}</h1>
        <span className="rounded-full bg-light px-2.5 py-1 text-caption font-semibold whitespace-nowrap text-graytext">
          {acesso.parceira || "Autônomo"}
        </span>
      </div>
      <Link to="/app/academia/dados" className="inline-flex min-h-9 items-center text-caption font-semibold text-graytext hover:text-charcoal">
        Meus dados
      </Link>

      {avisos?.length > 0 && (
        <section>
          <Titulo>Avisos</Titulo>
          <div className="grid gap-2.5">
            {avisos.map((a) => (
              <div key={a.id} className="rounded-[18px] bg-brand-soft px-4 py-3.5 text-[13.5px] text-sky-900">
                <b className="mb-0.5 block text-body-sm text-sky-800">{a.titulo}</b>
                {a.texto}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <Titulo>Continue seu treinamento</Titulo>
        <div className="flex items-center gap-4 rounded-[22px] border border-slate-200/70 bg-white p-[18px] shadow-soft">
          {trilha ? (
            <>
              <span
                className="grid h-16 w-16 flex-none place-items-center rounded-full"
                style={{ background: `conic-gradient(var(--color-brand) ${pct}%, #e2e8f0 0)` }}
              >
                <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white text-body-sm font-bold text-charcoal">{pct}%</span>
              </span>
              <div className="min-w-0 flex-1">
                <small className="text-caption text-graytext">
                  Trilha {trilha.ordem ?? ""} · nível {trilha.nivel}
                </small>
                <b className="block text-body font-semibold tracking-tight text-charcoal">{trilha.titulo}</b>
                <small className="text-caption text-graytext">
                  {trilha.aulas_feitas} de {trilha.aulas_total} aulas
                </small>
              </div>
              <Button to={`/app/academia/treinamento/${trilha.id}`} size="sm" className="flex-none">
                Continuar
              </Button>
            </>
          ) : (
            <p className="text-body-sm text-graytext">
              {trilha === undefined ? "As trilhas de treinamento aparecem aqui." : "Você concluiu todas as trilhas disponíveis."}
            </p>
          )}
        </div>
      </section>

      <section>
        <Titulo>Atalhos</Titulo>
        <div className="grid grid-cols-2 gap-2.5">
          {ATALHOS.map(([to, nome, texto, icone]) => (
            <Link
              key={to}
              to={to}
              className="grid min-h-[92px] content-between gap-2.5 rounded-[18px] border border-slate-200/70 bg-white p-3.5 transition-all duration-200 hover:border-slate-300 hover:shadow-soft"
            >
              <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-brand-soft text-sky-800">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={icone} />
                </svg>
              </span>
              <span>
                <b className="block text-body-sm text-charcoal">{nome}</b>
                <small className="text-caption text-graytext">{texto}</small>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Titulo>Seus números</Titulo>
        <div className="grid grid-cols-2 gap-2.5">
          <Numero valor={numeros?.materiais} rotulo="Materiais vistos" />
          <Numero valor={numeros?.envios} rotulo="Kits enviados" />
          <Numero valor={numeros?.clientes_abriram} rotulo="Clientes abriram" />
          <Numero valor={numeros?.registros} rotulo="Registros" />
        </div>
      </section>
    </div>
  );
}

function Titulo({ children }) {
  return <h2 className="mt-6 mb-2.5 text-caption font-semibold tracking-[.08em] text-muted uppercase">{children}</h2>;
}

function Numero({ valor, rotulo }) {
  return (
    <div className="rounded-[18px] border border-slate-200/70 bg-white px-4 py-3.5">
      <b className="block text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{valor ?? "–"}</b>
      <span className="text-[12.5px] text-graytext">{rotulo}</span>
    </div>
  );
}

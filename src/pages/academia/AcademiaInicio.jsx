import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";

const PAPEL_LABELS = { corretor: "Corretor", gestor: "Gestor da imobiliária" };

const STATUS_TELA = {
  pendente: {
    simbolo: "…",
    tom: "bg-amber-100 text-amber-800",
    titulo: "Pedido recebido",
    texto: "Assim que o acesso for liberado, ele aparece aqui. Não precisa fazer mais nada.",
  },
  recusado: {
    simbolo: "×",
    tom: "bg-rose-100 text-rose-800",
    titulo: "Pedido não aprovado",
    texto: "Não foi possível liberar este acesso. Se foi um engano, fale com a coordenação de parcerias.",
  },
  bloqueado: {
    simbolo: "!",
    tom: "bg-slate-100 text-slate-600",
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
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <h1 className="text-xl font-bold text-charcoal">Academia de Vendas</h1>
      <p className="mt-2 text-sm text-graytext">Você ainda não pediu acesso à Academia.</p>
      <Link to="/academia" className="mt-5 inline-block rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white">
        Pedir acesso
      </Link>
    </div>
  );
}

function StatusAcesso({ acesso }) {
  const t = STATUS_TELA[acesso.status] ?? STATUS_TELA.pendente;
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="text-center">
        <div className={`mx-auto grid h-[52px] w-[52px] place-items-center rounded-full text-[22px] font-bold ${t.tom}`}>
          {t.simbolo}
        </div>
        <h1 className="mt-4 text-xl font-bold text-charcoal">{t.titulo}</h1>
        <p className="mt-1 text-sm text-graytext">{t.texto}</p>
      </div>
      <dl className="mt-6 divide-y divide-rule rounded-[12px] border border-rule bg-white px-4 text-sm">
        <Linha rotulo="Nome" valor={acesso.nome} />
        <Linha rotulo="Papel" valor={PAPEL_LABELS[acesso.papel] ?? acesso.papel} />
        <Linha rotulo="Imobiliária" valor={acesso.parceira || "Autônomo"} />
      </dl>
    </div>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
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

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-charcoal">Olá, {primeiroNome}</h1>
        <span className="whitespace-nowrap rounded-full border border-rule bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
          {acesso.parceira || "Autônomo"}
        </span>
      </div>

      {avisos?.length > 0 && (
        <section className="mt-5">
          <Titulo>Avisos</Titulo>
          <div className="space-y-2">
            {avisos.map((a) => (
              <div key={a.id} className="rounded-[12px] border border-sky-200 bg-sky-100 px-3 py-2.5 text-[13px] text-sky-900">
                <b className="block">{a.titulo}</b>
                {a.texto}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5">
        <Titulo>Seus números</Titulo>
        <div className="grid grid-cols-2 gap-2">
          <Numero valor={numeros?.materiais} rotulo="Materiais vistos" />
          <Numero valor={numeros?.envios} rotulo="Kits enviados" />
          <Numero valor={numeros?.clientes_abriram} rotulo="Clientes abriram" />
          <Numero valor={numeros?.registros} rotulo="Registros" />
        </div>
      </section>

      <section className="mt-5">
        <Titulo>Continue seu treinamento</Titulo>
        <div className="rounded-[12px] border border-rule bg-white px-3.5 py-3">
          {trilha === undefined && <p className="text-sm text-graytext">As trilhas de treinamento aparecem aqui.</p>}
          {trilha === null && <p className="text-sm text-graytext">Você concluiu todas as trilhas disponíveis.</p>}
          {trilha && (
            <>
              <div className="text-xs text-graytext">
                Trilha {trilha.ordem ?? ""} · nível {trilha.nivel}
              </div>
              <div className="mt-0.5 text-sm font-semibold text-charcoal">{trilha.titulo}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
                <div
                  className="h-full bg-sky-700"
                  style={{ width: `${trilha.aulas_total ? (100 * trilha.aulas_feitas) / trilha.aulas_total : 0}%` }}
                />
              </div>
              <div className="mt-1.5 text-xs text-graytext">
                {trilha.aulas_feitas} de {trilha.aulas_total} aulas
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function Titulo({ children }) {
  return <h2 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">{children}</h2>;
}

function Numero({ valor, rotulo }) {
  return (
    <div className="rounded-[12px] border border-rule bg-white px-3 py-2.5">
      <b className="block text-[22px] leading-tight text-charcoal tabular-nums">{valor ?? "–"}</b>
      <span className="text-xs text-graytext">{rotulo}</span>
    </div>
  );
}

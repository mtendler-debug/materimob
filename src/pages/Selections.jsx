import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { addClientToCrm } from "../lib/crm";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";

const DIA = 86400000;

function diasDesde(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DIA);
}

function dataCurta(iso) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}

function iniciais(nome) {
  return (nome || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const PERIODOS = [
  ["Esta semana", (d) => d < 7],
  ["Este mês", (d) => d >= 7 && d < 31],
  ["Mais antigos", (d) => d >= 31],
];

export default function Selections() {
  const [selections, setSelections] = useState(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("ativos"); // ativos|desativados|todos
  const [busca, setBusca] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_selections")
      .select(
        "id, title, client_name, archived, created_at, client_id, av_clients(av_client_relations(archived))",
      )
      .order("created_at", { ascending: false });
    if (loadError) {
      setError("Não foi possível carregar os roteiros: " + loadError.message);
      return;
    }
    setSelections(
      (data ?? []).map((s) => ({
        ...s,
        clienteDesativado: s.av_clients?.av_client_relations?.[0]?.archived ?? false,
      })),
    );
  }

  const q = busca.trim().toLowerCase();
  const visiveis = (selections ?? []).filter((s) => {
    const desativado = s.archived || s.clienteDesativado;
    if (filtro === "desativados" && !desativado) return false;
    if (filtro === "ativos" && desativado) return false;
    return !q || `${s.title} ${s.client_name ?? ""}`.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[820px] px-4 py-8 pb-24 md:px-7">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Meus roteiros</h1>
        <p className="mt-1.5 max-w-[60ch] text-base text-graytext">
          Todos os roteiros, sem agrupar por cliente. Para criar um atendimento novo, use{" "}
          <Link to="/app" className="underline underline-offset-2">
            Meus clientes
          </Link>
          .
        </p>

        {error && <p className="mt-3 text-body-sm text-danger-text">{error}</p>}

        {selections !== null && selections.length > 0 && (
          <div className="mt-6 grid gap-3">
            <label className="flex min-h-[46px] items-center gap-2 rounded-control border border-slate-200 bg-white px-3.5 text-muted transition-all duration-200 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar roteiro ou cliente"
                aria-label="Buscar roteiro ou cliente"
                className="w-full min-w-0 bg-transparent text-body-sm text-charcoal outline-none placeholder:text-muted"
              />
            </label>
            <div className="inline-flex max-w-full gap-0.5 self-start overflow-x-auto rounded-control bg-light p-[3px]">
              {[
                ["ativos", "Ativos"],
                ["desativados", "Desativados"],
                ["todos", "Todos"],
              ].map(([v, rotulo]) => (
                <button
                  key={v}
                  onClick={() => setFiltro(v)}
                  aria-pressed={filtro === v}
                  className={`min-h-9 rounded-[9px] px-3.5 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${
                    filtro === v ? "bg-white text-charcoal shadow-sm" : "text-graytext hover:text-charcoal"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        )}

        {selections === null && <p className="mt-8 text-body-sm text-muted">Carregando…</p>}
        {selections?.length === 0 && (
          <div className="py-16 text-center text-graytext">
            <b className="mb-1.5 block text-body text-charcoal">Nenhum roteiro ainda</b>
            <p className="text-body-sm">Crie um atendimento em Meus clientes para começar.</p>
            <Button to="/app" className="mt-5">
              Ir para Meus clientes
            </Button>
          </div>
        )}
        {selections?.length > 0 && visiveis.length === 0 && (
          <div className="py-16 text-center text-graytext">
            <b className="mb-1.5 block text-body text-charcoal">Nenhum roteiro encontrado</b>
            <p className="text-body-sm">Mude o filtro ou a busca.</p>
          </div>
        )}

        {PERIODOS.map(([titulo, dentro]) => {
          const grupo = visiveis.filter((s) => dentro(diasDesde(s.created_at)));
          if (!grupo.length) return null;
          return (
            <section key={titulo} className="mt-7">
              <h2 className="mb-2.5 flex items-baseline gap-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                {titulo}
                <span className="font-medium tracking-normal normal-case text-graytext">{grupo.length}</span>
              </h2>
              <div className="space-y-2">
                {grupo.map((s) => (
                  <SelectionRow key={s.id} selection={s} onChange={load} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SelectionRow({ selection: s, onChange }) {
  const { confirm, toast } = useFeedback();
  const [crmMsg, setCrmMsg] = useState("");

  async function alternarArquivado() {
    const acao = s.archived ? "reativar" : "desativar";
    if (!(await confirm(`Confirma ${acao} este roteiro?`, { tone: s.archived ? "info" : "danger" }))) return;
    await supabase.from("av_selections").update({ archived: !s.archived }).eq("id", s.id);
    onChange();
    toast(`Roteiro ${s.archived ? "reativado" : "desativado"}.`);
  }

  async function adicionarAoCRM() {
    setCrmMsg("Adicionando…");
    const { error, existed } = await addClientToCrm(s.client_id);
    setCrmMsg(error ? "Erro: " + error.message : existed ? "Já estava no CRM." : "Adicionado ao CRM.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[18px] border border-slate-200/70 bg-white p-3.5 transition-all duration-200 ease-out hover:shadow-soft">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand-soft text-caption font-semibold text-sky-800">
        {iniciais(s.client_name)}
      </span>
      <Link to={`/app/selections/${s.id}`} className="min-w-0 flex-1">
        <b className="block truncate text-[15px] tracking-tight text-charcoal">{s.title}</b>
        <small className="text-body-sm text-graytext">
          {s.client_name} · {dataCurta(s.created_at)}
        </small>
        {(s.archived || s.clienteDesativado || crmMsg) && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {s.archived && <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">roteiro desativado</span>}
            {s.clienteDesativado && <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">cliente desativado</span>}
            {crmMsg && <span className="text-caption text-graytext">{crmMsg}</span>}
          </span>
        )}
      </Link>
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={adicionarAoCRM}
          disabled={!s.client_id}
          title={s.client_id ? "" : "Roteiro sem cliente vinculado"}
        >
          Adicionar ao CRM
        </Button>
        <Button variant="ghost" size="sm" onClick={alternarArquivado}>
          {s.archived ? "Reativar" : "Desativar"}
        </Button>
      </div>
    </div>
  );
}

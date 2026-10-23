import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { semAcento } from "../../lib/treino";
import { diasRestantes, estaVivo, situacaoEfetiva, STATUS_REGISTRO, TOM_STATUS } from "../../lib/registros";

const FILTROS = [
  ["todos", "Todos"],
  ["andamento", "Em andamento"],
  ["venda", "Vendas"],
  ["encerrados", "Encerrados"],
];

const campo =
  "w-full rounded-control border border-slate-200/70 bg-white px-[10px] py-[9px] text-[13.5px] text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none";

// Meus clientes: registros que o corretor fez (e, para o gestor, os da imobiliária).
// A leitura passa por pc_meus_registros, que não devolve anotações internas nem
// o registro conflitante.
export default function Clientes() {
  const { acesso } = useAcessoCanal();
  const { state } = useLocation();
  const [escopo, setEscopo] = useState(state?.escopo === "equipe" ? "equipe" : "meus");
  const [lista, setLista] = useState(null);
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");

  const gestor = acesso?.papel === "gestor";

  useEffect(() => {
    if (acesso?.status !== "liberado") return;
    setLista(null);
    supabase.rpc("pc_meus_registros", { p_escopo: escopo }).then(({ data }) => setLista(data ?? []));
  }, [acesso?.status, escopo]);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;

  const q = semAcento(busca.trim());
  const base = lista ?? [];
  const vivos = base.filter((r) => estaVivo(situacaoEfetiva(r))).length;
  const visiveis = base.filter((r) => {
    const s = situacaoEfetiva(r);
    if (filtro === "andamento" && !(estaVivo(s) || s === "conflito")) return false;
    if (filtro === "venda" && s !== "venda") return false;
    if (filtro === "encerrados" && !["expirado", "cancelado"].includes(s)) return false;
    if (q && !semAcento(`${r.cliente_nome} ${r.cliente_telefone}`).includes(q)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal">Clientes registrados</h1>
      <p className="mt-1 text-sm text-graytext">
        {lista === null
          ? "Carregando…"
          : `${base.length} ${base.length === 1 ? "registro" : "registros"} · ${vivos} ${vivos === 1 ? "vigente" : "vigentes"}`}
      </p>

      <Link
        to="/app/academia/clientes/novo"
        className="mt-3 block min-h-11 rounded-control bg-brand px-4 py-[11px] text-center text-sm font-bold text-white"
      >
        Registrar cliente
      </Link>

      {gestor && (
        <div className="mt-3 grid grid-cols-2 gap-1.5" role="group" aria-label="Quem">
          {[
            ["meus", "Meus"],
            ["equipe", "Da equipe"],
          ].map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              aria-pressed={escopo === k}
              onClick={() => setEscopo(k)}
              className={`rounded-control border px-2 py-2 text-[13px] font-semibold ${
                escopo === k ? "border-charcoal bg-brand text-white" : "border-slate-200/70 bg-white text-slate-700"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        aria-label="Buscar cliente"
        className={`${campo} mt-3`}
      />
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Situação">
        {FILTROS.map(([k, rotulo]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filtro === k}
            onClick={() => setFiltro(k)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
              filtro === k ? "border-charcoal bg-brand text-white" : "border-slate-200/70 bg-white text-slate-600"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {lista && visiveis.length === 0 && (
        <div className="mt-3 rounded-card border border-slate-200/70 bg-white px-3.5 py-4 text-center text-[13px] text-graytext">
          {base.length
            ? "Nenhum registro com esse filtro."
            : 'Você ainda não registrou nenhum cliente. Toque em "Registrar cliente" para começar.'}
        </div>
      )}

      {visiveis.map((r) => {
        const s = situacaoEfetiva(r);
        const dias = diasRestantes(r);
        return (
          <Link
            key={r.id}
            to={`/app/academia/clientes/${r.id}`}
            className="mt-2 block rounded-card border border-slate-200/70 bg-white px-3.5 py-3 hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-2">
              <b className="text-sm leading-tight text-charcoal">{r.cliente_nome}</b>
              <span className={`whitespace-nowrap rounded-full border px-2 py-px text-[11.5px] font-semibold ${TOM_STATUS[s]}`}>
                {STATUS_REGISTRO[s]}
              </span>
            </div>
            <div className="mt-0.5 text-[12.5px] text-graytext">
              {r.projeto}
              {escopo === "equipe" && r.corretor_nome ? ` · ${r.corretor_nome}` : ""}
            </div>
            <div className="mt-1.5 flex justify-between gap-2 text-xs text-graytext">
              <span>{r.cliente_telefone}</span>
              {estaVivo(s) && (
                <span className={`font-semibold ${dias <= 15 ? "text-amber-700" : ""}`}>
                  vence em {dias} {dias === 1 ? "dia" : "dias"}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

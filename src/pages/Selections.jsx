import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Selections() {
  const [selections, setSelections] = useState(null);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState("ativos"); // ativos|desativados|todos

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
      setError("Erro ao carregar seleções: " + loadError.message);
      return;
    }
    setSelections(
      (data ?? []).map((s) => ({
        ...s,
        clienteDesativado: s.av_clients?.av_client_relations?.[0]?.archived ?? false,
      })),
    );
  }

  const visiveis = (selections ?? []).filter((s) => {
    const desativado = s.archived || s.clienteDesativado;
    if (filtro === "todos") return true;
    if (filtro === "desativados") return desativado;
    return !desativado;
  });

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[27px] font-semibold text-charcoal">Meus roteiros</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-graytext">
          Visão solta de todos os roteiros, sem agrupar por cliente — pra criar um atendimento
          novo, use{" "}
          <Link to="/app" className="underline">
            Meus clientes
          </Link>
          .
        </p>

        {error && <p className="mt-2 text-sm text-[#B34A2E]">{error}</p>}

        {selections !== null && selections.length > 0 && (
          <div className="mt-5 flex items-center gap-2">
            <label className="text-[11.5px] font-bold uppercase tracking-[.06em] text-graytext">Mostrar</label>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="rounded-[8px] border border-rule bg-white px-2 py-1 text-sm"
            >
              <option value="ativos">Roteiros ativos</option>
              <option value="desativados">Roteiros desativados</option>
              <option value="todos">Todos os roteiros</option>
            </select>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {selections === null && <p className="text-sm text-muted">Carregando…</p>}
          {selections?.length === 0 && <p className="text-sm text-muted">Nenhuma seleção ainda.</p>}
          {visiveis.map((s) => (
            <SelectionRow key={s.id} selection={s} onChange={load} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SelectionRow({ selection: s, onChange }) {
  async function alternarArquivado() {
    const acao = s.archived ? "reativar" : "desativar";
    if (!window.confirm(`Confirma ${acao} este roteiro?`)) return;
    await supabase.from("av_selections").update({ archived: !s.archived }).eq("id", s.id);
    onChange();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <Link to={`/app/selections/${s.id}`} className="block hover:underline">
        <p className="font-serif font-semibold text-charcoal">{s.title}</p>
        <p className="text-sm text-graytext">{s.client_name}</p>
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {s.archived && (
          <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
            roteiro desativado
          </span>
        )}
        {s.clienteDesativado && (
          <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
            cliente desativado
          </span>
        )}
        <button onClick={alternarArquivado} className="text-xs font-bold text-[#B34A2E] underline">
          {s.archived ? "reativar roteiro" : "desativar roteiro"}
        </button>
      </div>
    </div>
  );
}

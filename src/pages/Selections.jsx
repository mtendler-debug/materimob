import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Selections() {
  const [selections, setSelections] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_selections")
      .select("id, title, client_name, archived, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError("Erro ao carregar seleções: " + loadError.message);
      return;
    }
    setSelections(data);
  }

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

        <div className="mt-6 space-y-2">
          {selections === null && <p className="text-sm text-muted">Carregando…</p>}
          {selections?.length === 0 && <p className="text-sm text-muted">Nenhuma seleção ainda.</p>}
          {selections?.map((s) => (
            <Link
              key={s.id}
              to={`/app/selections/${s.id}`}
              className="block rounded-[14px] border border-rule bg-white p-4 hover:border-gold"
            >
              <p className="font-serif font-semibold text-charcoal">{s.title}</p>
              <p className="text-sm text-graytext">{s.client_name}</p>
              {s.archived && (
                <span className="mt-[6px] inline-block rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
                  arquivada
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

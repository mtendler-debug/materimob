import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";

export default function Projetos() {
  const { acesso } = useAcessoCanal();
  const [kits, setKits] = useState(null);

  useEffect(() => {
    supabase
      .from("pc_kits")
      .select("codigo, nome, local_texto, fase, entrega, preco_desde, aviso, capa_url, ordem")
      .order("ordem")
      .then(({ data }) => setKits(data ?? []));
  }, []);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 pb-24 md:pb-10">
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal">Projetos</h1>
      <p className="mt-1 text-sm text-graytext">Escolha um empreendimento para ver como vender e enviar ao cliente.</p>

      {kits === null && <p className="mt-6 text-sm text-muted">Carregando…</p>}
      {kits?.length === 0 && <p className="mt-6 text-sm text-graytext">Nenhum projeto disponível por enquanto.</p>}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kits?.map((k) => (
          <Link
            key={k.codigo}
            to={`/app/academia/projetos/${k.codigo}`}
            className="overflow-hidden rounded-card border border-slate-200/70 bg-white transition-colors hover:border-slate-300"
          >
            {k.capa_url ? (
              <img src={k.capa_url} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] w-full bg-slate-100" />
            )}
            <div className="px-2.5 pb-2.5 pt-2">
              <div className="text-[13px] font-bold leading-tight text-charcoal">{k.nome}</div>
              <div className="mt-0.5 text-[11.5px] text-graytext">
                {[k.local_texto, k.fase].filter(Boolean).join(" · ")}
              </div>
              {k.preco_desde && <div className="mt-1 text-[11.5px] font-semibold text-sky-900">{k.preco_desde}</div>}
              {k.aviso && (
                <span className="mt-1 inline-block rounded-full border border-amber-300 bg-amber-100 px-[7px] text-[10.5px] font-bold text-amber-800">
                  Aviso
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

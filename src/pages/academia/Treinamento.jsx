import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { rotuloTrilha, situacaoTrilha, tituloCurto } from "../../lib/treino";

export default function Treinamento() {
  const { acesso } = useAcessoCanal();
  const [dados, setDados] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("pc_trilhas").select("id, titulo, descricao, nivel, ordem, empreendimento_id").order("ordem").order("nivel"),
      supabase.rpc("pc_minha_academia"),
    ]).then(([t, a]) =>
      setDados({
        trilhas: t.data ?? [],
        andamento: new Map((a.data ?? []).map((x) => [x.trilha_id, x])),
      }),
    );
  }, []);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;

  const emAndamento = dados?.trilhas.find((t) => {
    const a = dados.andamento.get(t.id);
    return a && a.aulas_feitas > 0 && !a.certificado;
  });

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <h1 className="text-xl font-bold text-charcoal">Treinamento</h1>
      <p className="mt-1 text-sm text-graytext">
        Trilhas do básico ao produto. O certificado sai quando você conclui as aulas e passa no quiz.
      </p>

      {!dados && <p className="mt-6 text-sm text-muted">Carregando…</p>}
      {dados?.trilhas.length === 0 && <p className="mt-6 text-sm text-graytext">Nenhuma trilha disponível por enquanto.</p>}

      <div className="mt-4 space-y-2">
        {dados?.trilhas.map((t) => {
          const a = dados.andamento.get(t.id);
          const s = situacaoTrilha(a);
          const total = a?.aulas_total ?? 0;
          const feitas = a?.aulas_feitas ?? 0;
          const destaque = emAndamento?.id === t.id;
          return (
            <Link
              key={t.id}
              to={`/app/academia/treinamento/${t.id}`}
              className={`block rounded-[12px] border bg-white px-3.5 py-3 ${
                destaque ? "border-sky-700 ring-1 ring-sky-700" : "border-rule hover:border-slate-300"
              }`}
            >
              {destaque && <div className="text-[11px] font-bold uppercase tracking-wide text-sky-800">Continue de onde parou</div>}
              <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                {rotuloTrilha(t)}
              </div>
              <div className="mt-0.5 text-sm font-bold leading-tight text-charcoal">{tituloCurto(t.titulo)}</div>
              {t.descricao && <p className="mb-2 mt-1 text-[12.5px] text-graytext">{t.descricao}</p>}
              <div className="h-1.5 overflow-hidden rounded-full bg-rule">
                <div className="h-full bg-sky-700" style={{ width: `${total ? (100 * feitas) / total : 0}%` }} />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-graytext">
                <span>
                  {feitas} de {total} aulas{a?.tem_quiz ? " · com quiz" : ""}
                </span>
                <span className={`whitespace-nowrap rounded-full border px-2 py-px text-[11.5px] font-semibold ${s.tom}`}>{s.rotulo}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

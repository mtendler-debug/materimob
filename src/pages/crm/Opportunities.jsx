import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useLeadsWithOpportunities,
  OPP_TYPES,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
  OPP_STAGES,
  OPP_STAGE_LABELS,
  brl,
} from "../../lib/crm";

export default function Opportunities() {
  const { leads, error } = useLeadsWithOpportunities();
  const [filtroTipo, setFiltroTipo] = useState("");

  if (error) return <p className="text-sm text-danger-text">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  const todas = leads.flatMap((l) =>
    (l.av_opportunities ?? []).map((o) => ({ ...o, lead: l })),
  );
  const filtradas = filtroTipo ? todas.filter((o) => o.type === filtroTipo) : todas;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {[["", "Todos"], ...OPP_TYPES.map((t) => [t, OPP_TYPE_LABELS[t]])].map(([valor, rotulo]) => (
          <button
            key={valor || "todos"}
            onClick={() => setFiltroTipo(valor)}
            aria-pressed={filtroTipo === valor}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 ${
              filtroTipo === valor
                ? "border-charcoal bg-charcoal text-white"
                : "border-slate-200 bg-white text-graytext hover:border-slate-300 hover:text-charcoal"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {OPP_STAGES.map((stage) => {
        const doGrupo = filtradas.filter((o) => o.stage === stage);
        if (doGrupo.length === 0) return null;
        return (
          <div key={stage}>
            <p className="mb-2.5 text-caption font-semibold tracking-[.08em] text-muted uppercase">
              {OPP_STAGE_LABELS[stage]} · {doGrupo.length}
            </p>
            <div className="space-y-2">
              {doGrupo.map((o) => (
                <Link
                  key={o.id}
                  to={`/app/crm/leads/${o.lead.id}`}
                  className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5 text-body-sm transition-all duration-200 hover:border-slate-300 hover:shadow-soft"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-0.5 text-caption font-semibold"
                      style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
                    >
                      {OPP_TYPE_LABELS[o.type]}
                    </span>
                    <span className="font-semibold text-charcoal">{o.property || o.lead.av_clients?.name}</span>
                  </span>
                  <span className="font-semibold text-slate-700 tabular-nums">{brl(o.value)}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {filtradas.length === 0 && (
        <div className="rounded-card border border-dashed border-slate-300 px-4 py-12 text-center text-graytext">
          <b className="mb-1 block text-body text-charcoal">Nenhuma oportunidade ainda</b>
          <p className="text-body-sm">Elas aparecem aqui quando você cria uma dentro de um lead.</p>
        </div>
      )}
    </div>
  );
}

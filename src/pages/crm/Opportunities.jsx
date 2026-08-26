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

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  const todas = leads.flatMap((l) =>
    (l.av_opportunities ?? []).map((o) => ({ ...o, lead: l })),
  );
  const filtradas = filtroTipo ? todas.filter((o) => o.type === filtroTipo) : todas;

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Filtrar por tipo</label>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="mt-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {OPP_TYPES.map((t) => (
            <option key={t} value={t}>
              {OPP_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {OPP_STAGES.map((stage) => {
        const doGrupo = filtradas.filter((o) => o.stage === stage);
        if (doGrupo.length === 0) return null;
        return (
          <div key={stage}>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              {OPP_STAGE_LABELS[stage]} · {doGrupo.length}
            </p>
            <div className="space-y-2">
              {doGrupo.map((o) => (
                <Link
                  key={o.id}
                  to={`/app/crm/leads/${o.lead.id}`}
                  className="flex items-center justify-between rounded-[11px] border border-rule bg-white px-3 py-2 text-sm hover:border-gold"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                      style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
                    >
                      {OPP_TYPE_LABELS[o.type]}
                    </span>
                    <span className="text-charcoal">{o.property || o.lead.av_clients?.name}</span>
                  </span>
                  <span className="text-graytext">{brl(o.value)}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {filtradas.length === 0 && <p className="text-sm text-muted">Nenhuma oportunidade ainda.</p>}
    </div>
  );
}

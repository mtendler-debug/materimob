import { Link } from "react-router-dom";
import {
  useLeadsWithOpportunities,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  OPP_TYPES,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
  OPP_STAGE_ATIVA,
  brl,
} from "../../lib/crm";

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.1em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-bold">{value}</div>
      <div className="mt-[3px] text-[11.5px] text-graytext">{foot}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</p>;
}

export default function CrmDashboard() {
  const { leads, error } = useLeadsWithOpportunities();

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  const todasOportunidades = leads.flatMap((l) => l.av_opportunities ?? []);
  const totalLeads = leads.length;
  const totalOportunidades = todasOportunidades.length;
  const volumeAberto = todasOportunidades
    .filter((o) => OPP_STAGE_ATIVA(o.stage))
    .reduce((sum, o) => sum + (o.value ?? 0), 0);
  const negociosFechados = todasOportunidades.filter((o) => o.stage === "fechada").length;

  const porEtapa = LEAD_STAGES.map((stage) => ({
    stage,
    n: leads.filter((l) => l.stage === stage).length,
  }));
  const maxEtapa = Math.max(...porEtapa.map((e) => e.n), 1);

  const porTipo = OPP_TYPES.map((type) => {
    const doTipo = todasOportunidades.filter((o) => o.type === type);
    return { type, n: doTipo.length, valor: doTipo.reduce((s, o) => s + (o.value ?? 0), 0) };
  });

  const multiplas = leads.filter((l) => (l.av_opportunities ?? []).length > 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Leads" value={totalLeads} foot="no funil" />
        <Kpi label="Oportunidades" value={totalOportunidades} foot="geradas" />
        <Kpi label="Volume em aberto" value={brl(volumeAberto)} foot="oportunidades ativas" />
        <Kpi label="Negócios fechados" value={negociosFechados} foot="oportunidades fechadas" />
      </div>

      <div>
        <SectionTitle>Leads por etapa</SectionTitle>
        <div className="space-y-[6px]">
          {porEtapa.map((e) => (
            <div key={e.stage} className="rounded-[10px] bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-charcoal">{LEAD_STAGE_LABELS[e.stage]}</span>
                <span className="text-xs text-graytext">{e.n}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-light">
                <div className="h-full rounded-full bg-gold" style={{ width: `${(e.n / maxEtapa) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Oportunidades por tipo</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {porTipo.map((t) => (
            <div key={t.type} className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <span
                className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                style={{ background: OPP_TYPE_COLORS[t.type].bg, color: OPP_TYPE_COLORS[t.type].color }}
              >
                {OPP_TYPE_LABELS[t.type]}
              </span>
              <div className="mt-2 text-xl font-bold text-charcoal">{t.n}</div>
              <div className="text-[11.5px] text-graytext">{brl(t.valor)}</div>
            </div>
          ))}
        </div>
      </div>

      {multiplas.length > 0 && (
        <div>
          <SectionTitle>Leads com múltiplas oportunidades</SectionTitle>
          <div className="space-y-2">
            {multiplas.map((l) => (
              <Link
                key={l.id}
                to={`/app/crm/leads/${l.id}`}
                className="flex items-center justify-between rounded-[11px] border border-rule bg-white px-3 py-2 text-sm hover:border-gold"
              >
                <span className="text-charcoal">{l.av_clients?.name}</span>
                <span className="text-graytext">
                  {l.av_opportunities.length} oportunidades ·{" "}
                  {brl(l.av_opportunities.reduce((s, o) => s + (o.value ?? 0), 0))}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

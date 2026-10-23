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
    <div className="bg-white p-4">
      <div className="text-caption text-graytext">{label}</div>
      <div className="mt-0.5 text-2xl leading-[1.2] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{value}</div>
      <div className="text-caption text-muted">{foot}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">{children}</h2>;
}

export default function CrmDashboard() {
  const { leads, error } = useLeadsWithOpportunities();

  if (error) return <p className="text-sm text-danger-text">{error}</p>;
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
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-slate-200/70 bg-slate-200/70 sm:grid-cols-4">
        <Kpi label="Leads" value={totalLeads} foot="no funil" />
        <Kpi label="Oportunidades" value={totalOportunidades} foot="geradas" />
        <Kpi label="Volume em aberto" value={brl(volumeAberto)} foot="oportunidades ativas" />
        <Kpi label="Negócios fechados" value={negociosFechados} foot="oportunidades fechadas" />
      </div>

      <div>
        <SectionTitle>Leads por etapa</SectionTitle>
        <div className="space-y-2">
          {porEtapa.map((e) => (
            <div key={e.stage} className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-body-sm font-semibold text-charcoal">{LEAD_STAGE_LABELS[e.stage]}</span>
                <span className="text-caption text-graytext tabular-nums">{e.n}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-light">
                <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${(e.n / maxEtapa) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle>Oportunidades por tipo</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {porTipo.map((t) => (
            <div key={t.type} className="rounded-card border border-slate-200/70 bg-white p-4">
              <span
                className="rounded-full px-2.5 py-0.5 text-caption font-semibold"
                style={{ background: OPP_TYPE_COLORS[t.type].bg, color: OPP_TYPE_COLORS[t.type].color }}
              >
                {OPP_TYPE_LABELS[t.type]}
              </span>
              <div className="mt-2 text-xl font-bold tracking-tight text-charcoal tabular-nums">{t.n}</div>
              <div className="text-caption text-graytext">{brl(t.valor)}</div>
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
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5 text-body-sm transition-all duration-200 hover:border-slate-300 hover:shadow-soft"
              >
                <span className="font-semibold text-charcoal">{l.av_clients?.name}</span>
                <span className="text-graytext tabular-nums">
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

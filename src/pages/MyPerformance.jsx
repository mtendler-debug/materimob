import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Map } from "../components/Map";

const ESTAGIO_LABELS = {
  "a-visitar": "A visitar",
  visitado: "Visitado",
  negociacao: "Em negociação",
  fechado: "Fechado",
  descartado: "Descartado",
};
const ESTAGIO_CLASSES = {
  "a-visitar": "bg-light text-graytext",
  visitado: "bg-brand-soft text-sky-800",
  negociacao: "bg-warning-bg text-warning-text",
  fechado: "bg-success-bg text-success-text",
  descartado: "bg-danger-bg text-danger-text",
};

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

function formatSemana(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Kpi({ label, value, foot }) {
  return (
    <div className="bg-white p-4">
      <div className="text-caption text-graytext">{label}</div>
      <div className="mt-0.5 text-2xl leading-[1.2] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{value}</div>
      <div className="text-caption text-muted">{foot}</div>
    </div>
  );
}

// Barras na mesma escala; a semana mais recente em azul pleno, as anteriores em azul claro.
function ActivityBars({ data }) {
  const max = Math.max(...data.map((d) => d.total_roteiros), 1);
  return (
    <div>
      <div className="flex h-[150px] items-end gap-2.5 border-b border-slate-200 pt-[18px]">
        {data.map((d, i) => (
          <div key={d.semana} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-xs font-semibold text-slate-700 tabular-nums">{d.total_roteiros}</span>
            <div
              className={`w-full rounded-t-lg rounded-b-[3px] transition-all duration-200 ${i === data.length - 1 ? "bg-brand" : "bg-sky-200"}`}
              style={{ height: `${d.total_roteiros > 0 ? Math.max((d.total_roteiros / max) * 100, 6) : 2}%`, minHeight: 3 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2.5">
        {data.map((d) => (
          <span key={d.semana} className="flex-1 text-center text-[11px] text-muted">
            {formatSemana(d.semana)}
          </span>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">{children}</h2>;
}

const th = "bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase";
const td = "border-t border-slate-100 px-3.5 py-3";

export default function MyPerformance() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .rpc("my_performance_dashboard")
      .then(({ data, error: rpcError }) => {
        if (rpcError) setError(rpcError.message);
        else setDashboard(data);
      });
  }, []);

  if (error) return <p className="p-6 text-sm text-danger-text">{error}</p>;
  if (!dashboard) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[860px] px-4 py-8 pb-24 md:px-7">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Meu desempenho</h1>
        <p className="mt-1.5 text-base text-graytext">Números agregados de todos os seus roteiros e clientes.</p>

        <div className="mt-6 grid gap-3.5 md:grid-cols-[1.2fr_1fr]">
          <div className="grid min-h-[190px] content-end gap-1 rounded-3xl bg-gradient-to-br from-sky-600 via-sky-700 to-sky-800 p-6 text-white shadow-[0_20px_44px_-24px_rgba(2,132,199,.8)]">
            <small className="text-body-sm text-sky-100">Vendas confirmadas</small>
            <b className="text-[clamp(2.75rem,8vw,3.4rem)] leading-none tracking-[-0.045em] tabular-nums">{dashboard.total_vendas}</b>
            <span className="text-body-sm text-sky-100">
              {dashboard.ticket_medio_vendas != null ? `ticket médio ${brl(dashboard.ticket_medio_vendas)}` : "nenhuma venda confirmada ainda"}
            </span>
          </div>
          <div className="grid content-end gap-1 rounded-3xl border border-slate-200/70 bg-white p-6">
            <small className="text-body-sm text-graytext">Ticket médio previsto</small>
            <b className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{brl(dashboard.ticket_medio_previsto)}</b>
            <span className="text-body-sm text-muted">propostas com intenção de compra</span>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-px overflow-hidden rounded-[18px] border border-slate-200/70 bg-slate-200/70 sm:grid-cols-3">
          <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_clientes} cliente(s)`} />
          <Kpi
            label="Avaliações"
            value={dashboard.total_avaliacoes}
            foot={dashboard.nota_media != null ? `nota média ${String(dashboard.nota_media).replace(".", ",")}` : "recebidas"}
          />
          <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
        </div>

        {dashboard.atividade_periodo?.length > 0 && (
          <div className="mt-3.5 rounded-card border border-slate-200/70 bg-white p-5">
            <h3 className="text-body font-semibold tracking-tight text-charcoal">Atividade</h3>
            <p className="mt-0.5 mb-4 text-caption text-graytext">Roteiros criados por semana.</p>
            <ActivityBars data={dashboard.atividade_periodo} />
          </div>
        )}

        {dashboard.clientes?.length > 0 && (
          <section className="mt-8">
            <SectionTitle>Meus clientes</SectionTitle>
            <div className="overflow-x-auto rounded-card border border-slate-200/70 bg-white">
              <table className="w-full min-w-[520px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Cliente", "Estágio", "Roteiros", "Propostas", "Nota média"].map((h, i) => (
                      <th key={h} className={`${th} ${i > 1 ? "text-center" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clientes.map((c) => (
                    <tr key={c.id}>
                      <td className={`${td} font-semibold text-charcoal`}>{c.name}</td>
                      <td className={td}>
                        <span className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${ESTAGIO_CLASSES[c.estagio] ?? "bg-light text-graytext"}`}>
                          {ESTAGIO_LABELS[c.estagio] || c.estagio}
                        </span>
                      </td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>{c.total_roteiros}</td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>{c.total_propostas}</td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>
                        {c.nota_media != null ? String(c.nota_media).replace(".", ",") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {dashboard.por_incorporadora?.length > 0 && (
          <section className="mt-8">
            <SectionTitle>Vendas por incorporadora</SectionTitle>
            <div className="overflow-x-auto rounded-card border border-slate-200/70 bg-white">
              <table className="w-full min-w-[480px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    {["Incorporadora", "Roteiros", "Vendas", "Ticket médio"].map((h, i) => (
                      <th key={h} className={`${th} ${i > 0 ? "text-center" : ""}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.por_incorporadora.map((i) => (
                    <tr key={i.organization_id}>
                      <td className={`${td} font-semibold text-charcoal`}>{i.name}</td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>{i.total_roteiros}</td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>{i.total_vendas}</td>
                      <td className={`${td} text-center tabular-nums text-graytext`}>
                        {i.ticket_medio_vendas != null ? brl(i.ticket_medio_vendas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(dashboard.unidades_em_roteiro?.some((u) => u.latitude != null) || dashboard.vendas_localizacao?.some((v) => v.latitude != null)) && (
          <section className="mt-8">
            <SectionTitle>Mapas</SectionTitle>
            <div className="grid gap-3.5 md:grid-cols-2">
              {dashboard.unidades_em_roteiro?.some((u) => u.latitude != null) && (
                <div>
                  <p className="mb-2 text-body-sm font-medium text-slate-700">Unidades em roteiro</p>
                  <div className="overflow-hidden rounded-card border border-slate-200/70">
                    <Map
                      pins={dashboard.unidades_em_roteiro
                        .filter((u) => u.latitude != null && u.longitude != null)
                        .map((u) => ({ lat: u.latitude, lng: u.longitude, label: u.name }))}
                      height={260}
                    />
                  </div>
                </div>
              )}
              {dashboard.vendas_localizacao?.some((v) => v.latitude != null) && (
                <div>
                  <p className="mb-2 text-body-sm font-medium text-slate-700">Vendas</p>
                  <div className="overflow-hidden rounded-card border border-slate-200/70">
                    <Map
                      pins={dashboard.vendas_localizacao
                        .filter((v) => v.latitude != null && v.longitude != null)
                        .map((v) => ({ lat: v.latitude, lng: v.longitude, label: v.name, color: "#10b981" }))}
                      height={260}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

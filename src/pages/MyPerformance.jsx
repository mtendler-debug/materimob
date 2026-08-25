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
const ESTAGIO_COLORS = {
  "a-visitar": { bg: "#EFEFEF", color: "#6B6B6B" },
  visitado: { bg: "#E3EEF5", color: "#2F6690" },
  negociacao: { bg: "#FFF3E0", color: "#B26A00" },
  fechado: { bg: "#E3F0E4", color: "#2E7D32" },
  descartado: { bg: "#F1E4E0", color: "#B34A2E" },
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
    <div className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.1em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-bold">{value}</div>
      <div className="mt-[3px] text-[11.5px] text-graytext">{foot}</div>
    </div>
  );
}

function ActivityBars({ data }) {
  const max = Math.max(...data.map((d) => d.total_roteiros), 1);
  return (
    <div className="flex items-end gap-2">
      {data.map((d) => (
        <div key={d.semana} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-charcoal">{d.total_roteiros}</span>
          <div className="flex h-20 w-full items-end">
            <div
              className="w-full rounded-t-[4px] bg-gold"
              style={{ height: `${d.total_roteiros > 0 ? Math.max((d.total_roteiros / max) * 100, 6) : 2}%` }}
            />
          </div>
          <span className="text-[9px] text-graytext">{formatSemana(d.semana)}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</p>;
}

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

  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!dashboard) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-charcoal">Meu desempenho</h1>
          <p className="text-sm text-graytext">Números agregados de todos os seus roteiros e clientes.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_clientes} cliente(s)`} />
          <Kpi
            label="Avaliações"
            value={dashboard.total_avaliacoes}
            foot={dashboard.nota_media != null ? `nota média ${String(dashboard.nota_media).replace(".", ",")}` : "recebidas"}
          />
          <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
          <Kpi label="Ticket médio previsto" value={brl(dashboard.ticket_medio_previsto)} foot="propostas com intenção de compra" />
          <Kpi
            label="Vendas"
            value={dashboard.total_vendas}
            foot={dashboard.ticket_medio_vendas != null ? `ticket médio ${brl(dashboard.ticket_medio_vendas)}` : "confirmadas"}
          />
        </div>

        {dashboard.atividade_periodo?.length > 0 && (
          <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
            <SectionTitle>Atividade — roteiros por semana</SectionTitle>
            <ActivityBars data={dashboard.atividade_periodo} />
          </div>
        )}

        {dashboard.clientes?.length > 0 && (
          <div>
            <SectionTitle>Meus clientes</SectionTitle>
            <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr>
                    {["Cliente", "Estágio", "Roteiros", "Propostas", "Nota média"].map((h) => (
                      <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.clientes.map((c) => (
                    <tr key={c.id}>
                      <td className="border-b border-rule p-[10px] font-bold text-charcoal">{c.name}</td>
                      <td className="border-b border-rule p-[10px]">
                        <span
                          className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                          style={{ background: ESTAGIO_COLORS[c.estagio]?.bg, color: ESTAGIO_COLORS[c.estagio]?.color }}
                        >
                          {ESTAGIO_LABELS[c.estagio] || c.estagio}
                        </span>
                      </td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{c.total_roteiros}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{c.total_propostas}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">
                        {c.nota_media != null ? String(c.nota_media).replace(".", ",") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dashboard.por_incorporadora?.length > 0 && (
          <div>
            <SectionTitle>Vendas por incorporadora</SectionTitle>
            <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead>
                  <tr>
                    {["Incorporadora", "Roteiros", "Vendas", "Ticket médio"].map((h) => (
                      <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboard.por_incorporadora.map((i) => (
                    <tr key={i.organization_id}>
                      <td className="border-b border-rule p-[10px] font-bold text-charcoal">{i.name}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{i.total_roteiros}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{i.total_vendas}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">
                        {i.ticket_medio_vendas != null ? brl(i.ticket_medio_vendas) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dashboard.unidades_em_roteiro?.some((u) => u.latitude != null) && (
          <div>
            <SectionTitle>Mapa de unidades em roteiro</SectionTitle>
            <div className="overflow-hidden rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
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
            <SectionTitle>Mapa de vendas</SectionTitle>
            <div className="overflow-hidden rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <Map
                pins={dashboard.vendas_localizacao
                  .filter((v) => v.latitude != null && v.longitude != null)
                  .map((v) => ({ lat: v.latitude, lng: v.longitude, label: v.name, color: "#2E7D32" }))}
                height={260}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

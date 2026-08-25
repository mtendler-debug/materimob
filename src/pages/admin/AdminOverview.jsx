import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Map } from "../../components/Map";

const TIPO_LABELS = { corretor: "Corretor", imobiliaria: "Imobiliária", incorporadora: "Incorporadora" };

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

function formatSemana(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
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
          <span className="text-[9px] text-graytext">{d.total_avaliacoes} aval.</span>
        </div>
      ))}
    </div>
  );
}

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("platform_overview").then(({ data, error }) => {
      if (error) setError(error.message);
      else setData(data);
    });
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div>
      <SectionTitle>Plataforma</SectionTitle>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Contas" value={data.contas} foot={`${data.contas_30d} nos últimos 30 dias`} />
        <Kpi label="Organizações" value={data.organizacoes} foot={`${data.organizacoes_ativas} ativas`} />
        <Kpi label="Lançamentos" value={data.lancamentos} foot={`${data.unidades} unidade(s)`} />
        <Kpi label="Unidades vendidas" value={data.unidades_vendidas} foot="lançamento + portfólio" />
        <Kpi label="Ticket médio" value={brl(data.ticket_medio_vendas)} foot="unidades vendidas" />
        <Kpi label="Previsão" value={brl(data.previsao_vendas)} foot="em propostas com intenção de compra" />
        <Kpi label="Imóveis de portfólio" value={data.imoveis_portfolio} foot="" />
        <Kpi label="Clientes" value={data.clientes} foot="identidade permanente" />
        <Kpi label="Roteiros" value={data.roteiros} foot={`${data.roteiros_30d} nos últimos 30 dias`} />
        <Kpi label="Avaliações" value={data.avaliacoes} foot={`${data.avaliacoes_30d} nos últimos 30 dias`} />
        <Kpi label="Propostas" value={data.propostas} foot="" />
        <Kpi label="Corretores ativos" value={data.ativos_30d} foot="com roteiro nos últimos 30 dias" />
      </div>

      {data.contas_por_tipo && Object.keys(data.contas_por_tipo).length > 0 && (
        <>
          <SectionTitle>Contas por tipo</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.contas_por_tipo).map(([tipo, n]) => (
              <span key={tipo} className="rounded-full bg-light px-[10px] py-1 text-[11.5px] font-bold text-graytext">
                {n} {(TIPO_LABELS[tipo] || tipo).toLowerCase()}
              </span>
            ))}
          </div>
        </>
      )}

      {data.atividade_periodo?.length > 0 && (
        <>
          <SectionTitle>Atividade da plataforma — por semana</SectionTitle>
          <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
            <ActivityBars data={data.atividade_periodo} />
          </div>
        </>
      )}

      {data.mapa?.length > 0 && (
        <>
          <SectionTitle>Mapa da plataforma</SectionTitle>
          <p className="mb-2 text-xs text-graytext">
            <span className="mr-3">
              <span className="inline-block h-[9px] w-[9px] rounded-full align-middle" style={{ background: "#a68a5b" }} /> lançamento
            </span>
            <span>
              <span className="inline-block h-[9px] w-[9px] rounded-full align-middle" style={{ background: "#4A6FA5" }} /> portfólio
            </span>
          </p>
          <div className="overflow-hidden rounded-[14px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
            <Map
              pins={data.mapa.map((m) => ({
                lat: m.latitude,
                lng: m.longitude,
                label: m.name,
                color: m.tipo === "lancamento" ? "#a68a5b" : "#4A6FA5",
              }))}
              height={320}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
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

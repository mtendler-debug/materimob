import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const TIPO_LABELS = { corretor: "Corretor", imobiliaria: "Imobiliária", incorporadora: "Incorporadora" };

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
        <Kpi label="Unidades vendidas" value={data.unidades_vendidas} foot="via reserva na plataforma" />
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

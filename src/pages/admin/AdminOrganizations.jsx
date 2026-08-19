import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const TIPO_LABELS = { imobiliaria: "Imobiliária", incorporadora: "Incorporadora" };
const STATUS_LABELS = { ativa: "Ativa", pendente: "Pendente", suspensa: "Suspensa" };
const STATUS_COLORS = {
  ativa: { bg: "#E3F0E4", color: "#2E7D32" },
  pendente: { bg: "#FFF3E0", color: "#B26A00" },
  suspensa: { bg: "#F1E4E0", color: "#B34A2E" },
};

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const { data, error } = await supabase.rpc("platform_organizations");
    if (error) setError(error.message);
    else setOrgs(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleStatus(org) {
    const novoStatus = org.status === "suspensa" ? "ativa" : "suspensa";
    const acao = novoStatus === "suspensa" ? "suspender" : "reativar";
    if (!window.confirm(`Confirma ${acao} "${org.name}"?`)) return;
    setBusyId(org.id);
    const { error } = await supabase.from("organizations").update({ status: novoStatus }).eq("id", org.id);
    setBusyId(null);
    if (error) {
      alert("Erro: " + error.message);
      return;
    }
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!orgs) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            {["Organização", "Tipo", "Status", "Membros", "Lançamentos", "Unidades", "Imóveis", ""].map((h) => (
              <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id}>
              <td className="border-b border-rule p-[10px] font-bold text-charcoal">{o.name}</td>
              <td className="border-b border-rule p-[10px] text-graytext">{TIPO_LABELS[o.tipo] || o.tipo}</td>
              <td className="border-b border-rule p-[10px]">
                <span
                  className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                  style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.color }}
                >
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.membros}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.lancamentos}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.unidades}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.imoveis}</td>
              <td className="border-b border-rule p-[10px] text-right">
                <button
                  disabled={busyId === o.id}
                  onClick={() => toggleStatus(o)}
                  className="text-xs font-bold text-graytext underline disabled:opacity-50"
                >
                  {o.status === "suspensa" ? "reativar" : "suspender"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

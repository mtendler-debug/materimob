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
  const [showForm, setShowForm] = useState(false);

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

  async function toggleCrm(org) {
    const acao = org.crm_included ? "remover" : "incluir";
    if (!window.confirm(`Confirma ${acao} o CRM no plano de "${org.name}"?`)) return;
    setBusyId(org.id);
    const { error } = await supabase.from("organizations").update({ crm_included: !org.crm_included }).eq("id", org.id);
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
    <div>
      {showForm ? (
        <NewOrgManagerForm onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mb-4 rounded-[10px] border-[1.5px] border-rule px-4 py-2 text-sm font-bold text-charcoal hover:border-gold"
        >
          + Nova organização
        </button>
      )}

      <div className="overflow-hidden overflow-x-auto rounded-[14px] border border-rule">
        <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            {["Organização", "Tipo", "Status", "CRM", "Membros", "Lançamentos", "Unidades", "Imóveis", ""].map((h) => (
              <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id}>
              <td className="border-b border-rule p-[10px] font-serif font-semibold text-charcoal">{o.name}</td>
              <td className="border-b border-rule p-[10px] text-graytext">{TIPO_LABELS[o.tipo] || o.tipo}</td>
              <td className="border-b border-rule p-[10px]">
                <span
                  className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                  style={{ background: STATUS_COLORS[o.status]?.bg, color: STATUS_COLORS[o.status]?.color }}
                >
                  {STATUS_LABELS[o.status] || o.status}
                </span>
              </td>
              <td className="border-b border-rule p-[10px]">
                <span
                  className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                  style={o.crm_included ? { background: "#E3F0E4", color: "#2E7D32" } : { background: "#EDEAE4", color: "#5C5C5C" }}
                >
                  {o.crm_included ? "incluído" : "não incluído"}
                </span>
              </td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.membros}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.lancamentos}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.unidades}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{o.imoveis}</td>
              <td className="border-b border-rule p-[10px] text-right whitespace-nowrap">
                <button
                  disabled={busyId === o.id}
                  onClick={() => toggleCrm(o)}
                  className="text-xs font-bold text-graytext underline disabled:opacity-50"
                >
                  {o.crm_included ? "remover CRM" : "incluir CRM"}
                </button>
                <button
                  disabled={busyId === o.id}
                  onClick={() => toggleStatus(o)}
                  className="ml-3 text-xs font-bold text-graytext underline disabled:opacity-50"
                >
                  {o.status === "suspensa" ? "reativar" : "suspender"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function NewOrgManagerForm({ onCancel, onCreated }) {
  const [orgName, setOrgName] = useState("");
  const [orgTipo, setOrgTipo] = useState("imobiliaria");
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!orgName.trim() || !managerName.trim() || !managerEmail.trim()) {
      setError("Preencha nome da organização, nome e e-mail do gestor.");
      return;
    }
    setSaving(true);
    const { data, error: fnError } = await supabase.functions.invoke("admin-create-org-manager", {
      body: {
        org_name: orgName.trim(),
        org_tipo: orgTipo,
        manager_name: managerName.trim(),
        manager_email: managerEmail.trim(),
        origin: window.location.origin,
      },
    });
    setSaving(false);
    if (fnError || data?.error) {
      setError(data?.error || fnError.message);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mb-4 space-y-3 rounded-[14px] border border-rule bg-white p-4">
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome da organização</label>
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Tipo</label>
        <select
          value={orgTipo}
          onChange={(e) => setOrgTipo(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        >
          <option value="imobiliaria">Imobiliária</option>
          <option value="incorporadora">Incorporadora</option>
        </select>
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome do gestor</label>
        <input
          value={managerName}
          onChange={(e) => setManagerName(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">E-mail do gestor</label>
        <input
          type="email"
          value={managerEmail}
          onChange={(e) => setManagerEmail(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-graytext">
          A pessoa recebe um e-mail de convite pra definir a própria senha e já entra como diretor(a)
          desta organização.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Criando…" : "Criar organização e convidar gestor"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-graytext underline">
          cancelar
        </button>
      </div>
    </form>
  );
}

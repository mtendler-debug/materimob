import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  useLeadsWithOpportunities,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
} from "../../lib/crm";

export default function Leads() {
  const { leads, error, reload } = useLeadsWithOpportunities();
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function removerLead(id) {
    if (!window.confirm("Remover este lead? As oportunidades vinculadas também somem.")) return;
    await supabase.from("av_leads").delete().eq("id", id);
    reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  const filtrados = leads.filter((l) => {
    const nome = (l.av_clients?.name ?? "").toLowerCase();
    const tel = l.av_clients?.phone ?? "";
    const buscaOk = !busca || nome.includes(busca.toLowerCase()) || tel.includes(busca);
    const etapaOk = !filtroEtapa || l.stage === filtroEtapa;
    return buscaOk && etapaOk;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Buscar</label>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome ou telefone"
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Etapa</label>
          <select
            value={filtroEtapa}
            onChange={(e) => setFiltroEtapa(e.target.value)}
            className="mt-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {LEAD_STAGES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          {showForm ? "cancelar" : "+ Novo lead"}
        </button>
      </div>

      {showForm && <NewLeadForm onCreated={() => { setShowForm(false); reload(); }} />}

      <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              {["Nome", "Contato", "Origem", "Etapa", "Oportunidades", ""].map((h) => (
                <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => (
              <tr key={l.id}>
                <td className="border-b border-rule p-[10px] font-bold text-charcoal">
                  <Link to={`/app/crm/leads/${l.id}`} className="hover:underline">
                    {l.av_clients?.name}
                  </Link>
                </td>
                <td className="border-b border-rule p-[10px] text-graytext">{l.av_clients?.phone || "—"}</td>
                <td className="border-b border-rule p-[10px] text-graytext">{SOURCE_LABELS[l.source] || "—"}</td>
                <td className="border-b border-rule p-[10px]">
                  <span className="rounded-full bg-light px-[9px] py-[3px] text-[10.5px] font-bold text-graytext">
                    {LEAD_STAGE_LABELS[l.stage]}
                  </span>
                </td>
                <td className="border-b border-rule p-[10px]">
                  <div className="flex flex-wrap gap-1">
                    {(l.av_opportunities ?? []).map((o) => (
                      <span
                        key={o.id}
                        className="rounded-full px-[7px] py-[1px] text-[9.5px] font-bold"
                        style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
                      >
                        {OPP_TYPE_LABELS[o.type]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="border-b border-rule p-[10px] text-right">
                  <Link to={`/app/crm/leads/${l.id}`} className="text-xs font-bold text-graytext underline">
                    editar
                  </Link>
                  <button onClick={() => removerLead(l.id)} className="ml-3 text-xs font-bold text-[#B34A2E] underline">
                    excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="p-[10px] text-center text-muted">
                  Nenhum lead encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewLeadForm({ onCreated }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
      p_name: name.trim(),
      p_phone: phone.trim() || null,
      p_email: email.trim() || null,
    });
    if (clientError) {
      setSaving(false);
      setError("Erro ao vincular cliente: " + clientError.message);
      return;
    }
    const { error: insertError } = await supabase.from("av_leads").insert({
      client_id: clientId,
      source: source || null,
    });
    setSaving(false);
    if (insertError) {
      setError("Erro ao criar lead: " + insertError.message);
      return;
    }
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-[14px] border border-rule bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Telefone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Origem</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Criando…" : "Criar lead"}
      </button>
    </form>
  );
}

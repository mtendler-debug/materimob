import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { callFunction } from "../../lib/edgeFunctions";
import {
  useLeadsWithOpportunities,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
} from "../../lib/crm";
import { useFeedback } from "../../lib/feedback";
import Button from "../../components/ui/Button";
import Input, { classesCampo } from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";

// Best-effort: leva o lead também pro Leadlinks (CRM de WhatsApp em
// paralelo que o Marcos já usa). Só vale para o lead do próprio Marcos: a
// função confere no servidor e ignora a chamada de qualquer outro corretor.
// Nunca bloqueia a criação do lead no
// MaterImob, que já aconteceu antes desta chamada — se o Leadlinks
// estiver fora do ar ou faltar email/phone, só ignora.
function syncLeadToLeadlinks({ name, phone, email, source }) {
  callFunction("leadlinks-push", {
    method: "POST",
    auth: true,
    body: {
      integration_source: "materimob-crm",
      contact: { name, phone: phone || undefined, email: email || undefined },
      deal: { title: `${name} — lead MaterImob`, custom_fields: { origem: source || "outro" } },
    },
  }).catch((err) => console.error("leadlinks: falha ao sincronizar lead", err));
}

export default function Leads() {
  const { confirm, toast } = useFeedback();
  const { leads, error, reload } = useLeadsWithOpportunities();
  const [busca, setBusca] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [showForm, setShowForm] = useState(false);

  async function removerLead(id) {
    if (!(await confirm("Remover este lead? As oportunidades vinculadas também somem.", { confirmLabel: "Remover" }))) return;
    await supabase.from("av_leads").delete().eq("id", id);
    reload();
    toast("Lead removido.");
  }

  if (error) return <p className="text-sm text-danger-text">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  const filtrados = leads.filter((l) => {
    const nome = (l.av_clients?.name ?? "").toLowerCase();
    const tel = l.av_clients?.phone ?? "";
    const buscaOk = !busca || nome.includes(busca.toLowerCase()) || tel.includes(busca);
    const etapaOk = !filtroEtapa || l.stage === filtroEtapa;
    return buscaOk && etapaOk;
  });

  const th = "bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase";
  const td = "border-t border-slate-100 px-3.5 py-3";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex min-h-[46px] min-w-[200px] flex-1 items-center gap-2 rounded-control border border-slate-200 bg-white px-3.5 text-muted transition-all duration-200 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone"
            aria-label="Buscar lead"
            className="w-full min-w-0 bg-transparent text-body-sm text-charcoal outline-none placeholder:text-muted"
          />
        </label>
        <select
          value={filtroEtapa}
          onChange={(e) => setFiltroEtapa(e.target.value)}
          aria-label="Filtrar por etapa"
          className="min-h-[46px] rounded-control border border-slate-200 bg-white px-3.5 text-body-sm text-slate-700"
        >
          <option value="">Todas as etapas</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowForm(true)}>+ Novo lead</Button>
      </div>

      <div className="overflow-x-auto rounded-card border border-slate-200/70 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead>
            <tr>
              {["Nome", "Contato", "Origem", "Etapa", "Oportunidades", ""].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => (
              <tr key={l.id} className="transition-colors duration-200 hover:bg-[#fafcfe]">
                <td className={`${td} font-semibold text-charcoal`}>
                  <Link to={`/app/crm/leads/${l.id}`} className="hover:underline">
                    {l.av_clients?.name}
                  </Link>
                </td>
                <td className={`${td} text-graytext`}>{l.av_clients?.phone || "—"}</td>
                <td className={`${td} text-graytext`}>{SOURCE_LABELS[l.source] || "—"}</td>
                <td className={td}>
                  <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">
                    {LEAD_STAGE_LABELS[l.stage]}
                  </span>
                </td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">
                    {(l.av_opportunities ?? []).map((o) => (
                      <span
                        key={o.id}
                        className="rounded-full px-2 py-px text-[11.5px] font-semibold"
                        style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
                      >
                        {OPP_TYPE_LABELS[o.type]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <Link to={`/app/crm/leads/${l.id}`} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-xs font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
                    Editar
                  </Link>
                  <button onClick={() => removerLead(l.id)} className="min-h-9 rounded-[10px] px-2.5 text-xs font-medium text-graytext transition-all duration-200 hover:bg-danger-bg hover:text-danger-text">
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-graytext">
                  <b className="mb-1 block text-body text-charcoal">{leads.length === 0 ? "Nenhum lead ainda" : "Nenhum lead encontrado"}</b>
                  <span className="text-body-sm">{leads.length === 0 ? "Crie o primeiro ou leve um cliente do Avaliador para o CRM." : "Mude a busca ou a etapa."}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo lead">
        <NewLeadForm
          onCancel={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      </Modal>
    </div>
  );
}

function NewLeadForm({ onCreated, onCancel }) {
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
    syncLeadToLeadlinks({ name: name.trim(), phone: phone.trim(), email: email.trim(), source });
    onCreated();
  }

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <div>
        <label className="mb-1.5 block text-caption font-medium text-graytext">Origem</label>
        <select value={source} onChange={(e) => setSource(e.target.value)} className={classesCampo}>
          <option value="">—</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-body-sm text-danger-text">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Criando…" : "Criar lead"}
        </Button>
      </div>
    </form>
  );
}

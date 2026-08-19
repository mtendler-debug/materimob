import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { generateToken } from "../lib/token";
import { CriteriaPresets } from "../components/CriteriaPresets";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [clients, setClients] = useState(null);
  const [orphanSelections, setOrphanSelections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [criteria, setCriteria] = useState("");

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_selections")
      .select("id, title, client_name, archived, created_at, client_id, av_clients(id, name, phone, email, token)")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError("Erro ao carregar clientes: " + loadError.message);
      return;
    }
    const map = new Map();
    const orphans = [];
    for (const s of data ?? []) {
      const c = s.av_clients;
      if (!c) {
        orphans.push(s);
        continue;
      }
      if (!map.has(c.id)) map.set(c.id, { ...c, selections: [] });
      map.get(c.id).selections.push(s);
    }
    setClients([...map.values()]);
    setOrphanSelections(orphans);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !clientName.trim()) {
      setError("Título e nome do cliente são obrigatórios.");
      return;
    }
    setSaving(true);
    const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
      p_name: clientName.trim(),
      p_phone: clientPhone.trim() || null,
      p_email: clientEmail.trim() || null,
    });
    if (clientError) {
      setSaving(false);
      setError("Erro ao vincular cliente: " + clientError.message);
      return;
    }
    const { error: insertError } = await supabase.from("av_selections").insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      client_id: clientId,
      criteria: criteria
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      token_form: generateToken(),
      token_panel: generateToken(),
    });
    setSaving(false);
    if (insertError) {
      setError("Erro ao criar seleção: " + insertError.message);
      return;
    }
    setTitle("");
    setSubtitle("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setCriteria("");
    setShowForm(false);
    load();
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted">Avaliador MaterImob</p>
            <h1 className="mt-1 text-xl font-medium text-charcoal">Meus clientes</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">{user.email}</p>
            <div className="mt-1 flex items-center gap-3">
              <Link to="/app/selecoes" className="text-sm text-graytext underline">
                Todas as seleções
              </Link>
              <Link to="/app/organizacao" className="text-sm text-graytext underline">
                Organização
              </Link>
              <Link to="/app/portfolio" className="text-sm text-graytext underline">
                Portfólio
              </Link>
              <Link to="/app/lancamentos" className="text-sm text-graytext underline">
                Lançamentos
              </Link>
              <button onClick={signOut} className="text-sm text-graytext underline">
                Sair
              </button>
            </div>
          </div>
        </div>
        <p className="mt-2 text-sm text-graytext">
          Cada cliente ganha um link permanente que reúne todos os roteiros que você já criou pra
          ele. Precisa de imóveis pra apresentar? Veja o{" "}
          <Link to="/app/portfolio" className="underline">
            portfólio
          </Link>{" "}
          e os{" "}
          <Link to="/app/lancamentos" className="underline">
            lançamentos
          </Link>{" "}
          disponíveis na plataforma.
        </p>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="mt-6 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {showForm ? "Cancelar" : "+ Novo atendimento"}
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-4 space-y-3 rounded-md border border-rule bg-white p-4">
            <Field label="Título" value={title} onChange={setTitle} required />
            <Field label="Subtítulo" value={subtitle} onChange={setSubtitle} />
            <Field label="Nome do cliente" value={clientName} onChange={setClientName} required />
            <Field label="Telefone do cliente" value={clientPhone} onChange={setClientPhone} />
            <Field label="E-mail do cliente" value={clientEmail} onChange={setClientEmail} />
            <div>
              <label className="block text-xs font-medium text-graytext">Critérios (um por linha)</label>
              <textarea
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
                rows={4}
                placeholder={"Arquitetura e fachada\nLocalização\nAcabamento"}
                className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm focus:border-gold focus:outline-none"
              />
              <CriteriaPresets criteriaText={criteria} onApply={setCriteria} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Criar seleção"}
            </button>
          </form>
        )}

        <div className="mt-6 space-y-3">
          {clients === null && <p className="text-sm text-muted">Carregando…</p>}
          {clients?.length === 0 && orphanSelections.length === 0 && (
            <p className="text-sm text-muted">Nenhum cliente ainda. Crie um atendimento pra começar.</p>
          )}
          {clients?.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>

        {orphanSelections.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              Seleções sem cliente vinculado
            </h2>
            <div className="space-y-2">
              {orphanSelections.map((s) => (
                <Link
                  key={s.id}
                  to={`/app/selections/${s.id}`}
                  className="block rounded-md border border-rule bg-white p-4 hover:border-gold"
                >
                  <p className="font-medium text-charcoal">{s.title}</p>
                  <p className="text-sm text-graytext">{s.client_name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientCard({ client }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const homeUrl = `${window.location.origin}/cliente/${client.token}`;

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <b className="text-charcoal">{client.name || "Sem nome"}</b>
        <span className="text-xs text-graytext">{client.selections.length} roteiro(s)</span>
      </div>
      {(client.phone || client.email) && (
        <p className="mt-1 text-sm text-graytext">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-[9px] bg-light px-3 py-2">
        <span className="flex-1 truncate text-xs text-graytext">{homeUrl}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(homeUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-[9px] bg-charcoal px-2 py-1 text-xs font-bold text-white hover:opacity-90"
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>

      <button onClick={() => setExpanded((v) => !v)} className="mt-2 text-xs font-bold text-graytext underline">
        {expanded ? "Fechar" : "Ver roteiros"}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1 border-t border-rule pt-2">
          {client.selections.map((s) => (
            <Link
              key={s.id}
              to={`/app/selections/${s.id}`}
              className="flex items-center justify-between rounded-[9px] px-2 py-1.5 text-sm hover:bg-light"
            >
              <span className="text-charcoal">{s.title}</span>
              {s.archived && <span className="text-xs text-muted">arquivada</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-graytext">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-rule px-3 py-2 text-sm focus:border-gold focus:outline-none"
      />
    </div>
  );
}

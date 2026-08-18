import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useOrganization } from "../lib/useOrganization";
import { generateToken } from "../lib/token";
import { CriteriaPresets } from "../components/CriteriaPresets";

export default function Selections() {
  const { user, signOut } = useAuth();
  const { org, loading: loadingOrg } = useOrganization();
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [selections, setSelections] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [criteria, setCriteria] = useState("");

  async function loadSelections() {
    const { data, error: loadError } = await supabase
      .from("av_selections")
      .select("id, title, client_name, archived, created_at")
      .order("created_at", { ascending: false });
    if (loadError) {
      setError("Erro ao carregar seleções: " + loadError.message);
      return;
    }
    setSelections(data);
  }

  useEffect(() => {
    loadSelections();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !clientName.trim()) {
      setError("Título e nome do cliente são obrigatórios.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("av_selections").insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
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
    loadSelections();
  }

  const showOnboarding =
    !loadingOrg && !org && !user.user_metadata?.onboarded && !dismissedOnboarding;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted">
              Avaliador MaterImob
            </p>
            <h1 className="mt-1 text-xl font-medium text-charcoal">
              Minhas seleções
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">{user.email}</p>
            <div className="mt-1 flex items-center gap-3">
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

        {showOnboarding && <Onboarding onDismiss={() => setDismissedOnboarding(true)} />}

        <button
          onClick={() => setShowForm((v) => !v)}
          className="mt-6 rounded-md bg-charcoal px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {showForm ? "Cancelar" : "+ Nova seleção"}
        </button>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-4 space-y-3 rounded-md border border-rule bg-white p-4"
          >
            <Field label="Título" value={title} onChange={setTitle} required />
            <Field label="Subtítulo" value={subtitle} onChange={setSubtitle} />
            <Field label="Nome do cliente" value={clientName} onChange={setClientName} required />
            <Field label="Telefone do cliente" value={clientPhone} onChange={setClientPhone} />
            <Field label="E-mail do cliente" value={clientEmail} onChange={setClientEmail} />
            <div>
              <label className="block text-xs font-medium text-graytext">
                Critérios (um por linha)
              </label>
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

        <div className="mt-6 space-y-2">
          {selections === null && <p className="text-sm text-muted">Carregando…</p>}
          {selections?.length === 0 && (
            <p className="text-sm text-muted">Nenhuma seleção ainda.</p>
          )}
          {selections?.map((s) => (
            <Link
              key={s.id}
              to={`/app/selections/${s.id}`}
              className="block rounded-md border border-rule bg-white p-4 hover:border-gold"
            >
              <p className="font-medium text-charcoal">{s.title}</p>
              <p className="text-sm text-graytext">{s.client_name}</p>
              {s.archived && (
                <span className="mt-1 inline-block rounded bg-light px-2 py-0.5 text-xs text-graytext">
                  arquivada
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Onboarding({ onDismiss }) {
  async function markOnboarded() {
    await supabase.auth.updateUser({ data: { onboarded: true } });
    onDismiss();
  }

  return (
    <div className="mt-6 rounded-md border border-rule bg-white p-4">
      <p className="text-sm font-medium text-charcoal">Como você atua no mercado imobiliário?</p>
      <div className="mt-3 space-y-2">
        <button
          onClick={markOnboarded}
          className="block w-full rounded-md border border-rule p-3 text-left text-sm hover:border-gold"
        >
          <span className="font-medium text-charcoal">Corretor autônomo</span>
          <span className="block text-graytext">
            Vou usar o Avaliador direto com meus clientes, sem organização.
          </span>
        </button>
        <button
          onClick={markOnboarded}
          className="block w-full rounded-md border border-rule p-3 text-left text-sm hover:border-gold"
        >
          <span className="font-medium text-charcoal">Corretor de uma imobiliária ou construtora</span>
          <span className="block text-graytext">
            Peça pra quem te convidou o link de convite — assim que você abrir esse link, entra
            automaticamente na organização. Enquanto isso, pode usar o Avaliador normalmente.
          </span>
        </button>
        <Link
          to="/app/organizacao"
          className="block w-full rounded-md border border-rule p-3 text-left text-sm hover:border-gold"
        >
          <span className="font-medium text-charcoal">Sou gestor de uma imobiliária ou incorporadora</span>
          <span className="block text-graytext">
            Crie a organização e convide o resto do time.
          </span>
        </Link>
      </div>
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { generateToken } from "../lib/token";
import { CriteriaPresets } from "../components/CriteriaPresets";

export default function Dashboard() {
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
      .select(
        "id, title, client_name, archived, created_at, client_id, token_form, token_panel, av_clients(id, name, phone, email, token)",
      )
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
        <p className="text-sm uppercase tracking-wide text-muted">Avaliador MaterImob</p>
        <h1 className="mt-1 text-xl font-medium text-charcoal">Meus clientes</h1>
        <p className="mt-2 text-sm text-graytext">
          Cada cliente ganha um link permanente que reúne todos os roteiros que você já criou pra
          ele. Precisa de imóveis pra apresentar? Veja{" "}
          <Link to="/app/imoveis" className="underline">
            Imóveis
          </Link>
          .
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
            <ClientCard key={c.id} client={c} onChange={load} />
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

function ClientCard({ client, onChange }) {
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
        <div className="mt-2 space-y-2 border-t border-rule pt-2">
          {client.selections.map((s) => (
            <RoteiroRow key={s.id} selection={s} onChange={onChange} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoteiroRow({ selection, onChange }) {
  const [show, setShow] = useState(false);
  const [copiado, setCopiado] = useState(null); // "form" | "painel" | null
  const formUrl = `${window.location.origin}/c/${selection.token_form}`;
  const panelUrl = `${window.location.origin}/r/${selection.token_panel}`;

  function copiar(url, tipo) {
    navigator.clipboard.writeText(url);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 1500);
  }

  async function renomear() {
    const novo = window.prompt("Novo título do roteiro", selection.title);
    if (novo == null || !novo.trim()) return;
    await supabase.from("av_selections").update({ title: novo.trim() }).eq("id", selection.id);
    onChange();
  }

  async function gerarNovosLinks() {
    if (!window.confirm("Gerar links novos invalida os links já enviados para este roteiro. Continuar?")) return;
    await supabase
      .from("av_selections")
      .update({ token_form: generateToken(), token_panel: generateToken() })
      .eq("id", selection.id);
    onChange();
  }

  async function alternarArquivado() {
    const acao = selection.archived ? "reativar" : "desativar";
    if (!window.confirm(`Confirma ${acao} este roteiro?`)) return;
    await supabase.from("av_selections").update({ archived: !selection.archived }).eq("id", selection.id);
    onChange();
  }

  return (
    <div className="rounded-[9px] px-2 py-1.5 text-sm hover:bg-light">
      <div className="flex items-center justify-between gap-2">
        <Link to={`/app/selections/${selection.id}`} className="flex-1 font-medium text-charcoal">
          {selection.title}
        </Link>
        {selection.archived && <span className="text-xs text-muted">desativado</span>}
        <button onClick={() => setShow((v) => !v)} className="shrink-0 text-xs font-bold text-graytext underline">
          {show ? "fechar" : "links e ações"}
        </button>
      </div>

      {show && (
        <div className="mt-2 space-y-1.5 border-t border-rule pt-2">
          <LinkLine label="Avaliação" url={formUrl} copied={copiado === "form"} onCopy={() => copiar(formUrl, "form")} />
          <LinkLine
            label="Painel"
            url={panelUrl}
            copied={copiado === "painel"}
            onCopy={() => copiar(panelUrl, "painel")}
            openable
          />
          <div className="flex flex-wrap gap-3 pt-1">
            <button onClick={renomear} className="text-xs font-bold text-graytext underline">
              renomear
            </button>
            <button onClick={gerarNovosLinks} className="text-xs font-bold text-[#B34A2E] underline">
              gerar novos links
            </button>
            <button onClick={alternarArquivado} className="text-xs font-bold text-[#B34A2E] underline">
              {selection.archived ? "reativar" : "desativar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkLine({ label, url, copied, onCopy, openable }) {
  return (
    <div className="flex items-center gap-2 rounded-[9px] bg-light px-2 py-1.5">
      <span className="w-16 shrink-0 text-[10px] font-bold uppercase text-graytext">{label}</span>
      <span className="flex-1 truncate text-xs text-graytext">{url}</span>
      <button onClick={onCopy} className="shrink-0 rounded-[7px] bg-charcoal px-2 py-1 text-[11px] font-bold text-white">
        {copied ? "Copiado!" : "copiar"}
      </button>
      {openable && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-[7px] border border-rule px-2 py-1 text-[11px] font-bold text-charcoal"
        >
          abrir
        </a>
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

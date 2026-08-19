import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Clients() {
  const [clients, setClients] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from("av_selections")
      .select("id, title, archived, created_at, client_id, av_clients(id, name, phone, email, token)")
      .not("client_id", "is", null)
      .order("created_at", { ascending: false });

    const map = new Map();
    for (const s of data ?? []) {
      const c = s.av_clients;
      if (!c) continue;
      if (!map.has(c.id)) map.set(c.id, { ...c, selections: [] });
      map.get(c.id).selections.push(s);
    }
    setClients([...map.values()]);
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/app" className="text-sm text-graytext underline">
          ← Minhas seleções
        </Link>
        <h1 className="mt-3 text-xl font-bold text-charcoal">Meus clientes</h1>
        <p className="text-sm text-graytext">
          Cada cliente ganha um link permanente que reúne todos os roteiros que você já criou pra
          ele — mesmo que sejam de lançamentos diferentes.
        </p>

        <div className="mt-4 space-y-3">
          {clients === null && <p className="text-sm text-muted">Carregando…</p>}
          {clients?.length === 0 && (
            <p className="text-sm text-muted">
              Nenhum cliente ainda. Ao criar uma seleção com telefone ou e-mail, ele aparece aqui.
            </p>
          )}
          {clients?.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
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
        <span className="text-xs text-graytext">
          {client.selections.length} roteiro(s)
        </span>
      </div>
      {(client.phone || client.email) && (
        <p className="mt-1 text-sm text-graytext">
          {[client.phone, client.email].filter(Boolean).join(" · ")}
        </p>
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

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-xs font-bold text-graytext underline"
      >
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

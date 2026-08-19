import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";

function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const STATUS_COLORS = {
  disponivel: { bg: "#E3F0E4", color: "#2E7D32" },
  reservada: { bg: "#FFF3E0", color: "#B26A00" },
  vendida: { bg: "#F1E4E0", color: "#B34A2E" },
};

export default function Launches() {
  const { org, role } = useOrganization();
  const [launches, setLaunches] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("av_launches")
      .select("*, av_launch_units(*)")
      .order("created_at", { ascending: false });
    setLaunches((data ?? []).map((l) => ({ ...l, units: l.av_launch_units })));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app" className="text-sm text-graytext underline">
          ← Minhas seleções
        </Link>
        <h1 className="mt-3 text-xl font-bold text-charcoal">Lançamentos</h1>
        <p className="text-sm text-graytext">
          Empreendimentos publicados por qualquer incorporadora na plataforma. Qualquer corretor pode
          montar um roteiro de visita para um cliente a partir daqui.
        </p>

        <div className="mt-4 space-y-3">
          {launches === null && <p className="text-sm text-muted">Carregando…</p>}
          {launches?.length === 0 && <p className="text-sm text-muted">Nenhum lançamento publicado ainda.</p>}
          {launches?.map((l) => (
            <LaunchCard key={l.id} launch={l} />
          ))}
        </div>

        {org && org.tipo === "incorporadora" && canManage(role) && (
          <NewLaunch organizationId={org.id} onCreated={load} />
        )}
      </div>
    </div>
  );
}

function LaunchCard({ launch }) {
  const counts = launch.units.reduce(
    (acc, u) => ({ ...acc, [u.status]: (acc[u.status] ?? 0) + 1 }),
    {},
  );

  return (
    <Link
      to={`/app/lancamentos/${launch.id}`}
      className="block rounded-[14px] border border-rule bg-white p-4 hover:border-gold"
      style={{ borderLeft: `5px solid ${launch.color || "#A68A5B"}` }}
    >
      <p className="font-bold text-charcoal">{launch.name}</p>
      {launch.address && <p className="text-sm text-graytext">{launch.address}</p>}
      {launch.summary && <p className="text-xs text-graytext">{launch.summary}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(counts).map(([status, n]) => (
          <span
            key={status}
            className="rounded-full px-[10px] py-1 text-[10.5px] font-bold"
            style={{ background: STATUS_COLORS[status].bg, color: STATUS_COLORS[status].color }}
          >
            {n} {STATUS_LABELS[status].toLowerCase()}
          </span>
        ))}
        {launch.units.length === 0 && <span className="text-xs text-muted">sem unidades cadastradas</span>}
      </div>
    </Link>
  );
}

function NewLaunch({ organizationId, onCreated }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [summary, setSummary] = useState("");
  const [criteria, setCriteria] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("av_launches").insert({
      organization_id: organizationId,
      name: name.trim(),
      address: address.trim() || null,
      summary: summary.trim() || null,
      criteria: linesToArray(criteria),
    });
    setSaving(false);
    setName("");
    setAddress("");
    setSummary("");
    setCriteria("");
    setShow(false);
    onCreated();
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-6 rounded-[10px] border-[1.5px] border-rule px-4 py-2 text-sm font-bold text-charcoal"
      >
        + Publicar novo lançamento
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 rounded-[14px] border border-rule bg-white p-4">
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome do empreendimento</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Endereço</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Resumo</label>
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-[11.5px] font-bold text-graytext uppercase">
          Critérios de avaliação (um por linha)
        </label>
        <textarea
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Publicando…" : "Publicar lançamento"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="text-sm text-graytext underline">
          cancelar
        </button>
      </div>
    </form>
  );
}

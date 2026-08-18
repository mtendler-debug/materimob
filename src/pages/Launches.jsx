import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}
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
            <LaunchCard key={l.id} launch={l} org={org} role={role} onChange={load} />
          ))}
        </div>

        {org && canManage(role) && <NewLaunch organizationId={org.id} onCreated={load} />}
      </div>
    </div>
  );
}

function LaunchCard({ launch, org, role, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const manage = org?.id === launch.organization_id && canManage(role);

  const counts = launch.units.reduce(
    (acc, u) => ({ ...acc, [u.status]: (acc[u.status] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${launch.color || "#A68A5B"}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-charcoal">{launch.name}</p>
          {launch.address && <p className="text-sm text-graytext">{launch.address}</p>}
          {launch.summary && <p className="text-xs text-graytext">{launch.summary}</p>}
        </div>
        <button onClick={() => setExpanded((v) => !v)} className="shrink-0 text-sm text-graytext underline">
          {expanded ? "Fechar" : "Ver unidades"}
        </button>
      </div>

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
      </div>

      {expanded && (
        <div className="mt-3 space-y-1 border-t border-rule pt-3">
          {launch.units.map((u) => (
            <UnitRow key={u.id} unit={u} manage={manage} onChange={onChange} />
          ))}
          {manage && <NewLaunchUnit launchId={launch.id} onCreated={onChange} />}
        </div>
      )}

      <CreateRoteiro launch={launch} />
    </div>
  );
}

function UnitRow({ unit, manage, onChange }) {
  async function markSold() {
    if (!window.confirm(`Marcar "${unit.name}" como vendida?`)) return;
    await supabase.from("av_launch_units").update({ status: "vendida" }).eq("id", unit.id);
    onChange();
  }
  async function release() {
    if (!window.confirm(`Desfazer a reserva de "${unit.name}"?`)) return;
    await supabase
      .from("av_launch_units")
      .update({ status: "disponivel", reserved_by: null, reserved_for: null })
      .eq("id", unit.id);
    onChange();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 py-1 text-sm">
      <span className="flex-1 text-charcoal">{unit.name}</span>
      <span className="text-graytext">{brl(unit.table_value)}</span>
      <span
        className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
        style={{ background: STATUS_COLORS[unit.status].bg, color: STATUS_COLORS[unit.status].color }}
      >
        {STATUS_LABELS[unit.status]}
        {unit.reserved_for ? ` · ${unit.reserved_for}` : ""}
      </span>
      {manage && unit.status === "reservada" && (
        <>
          <button onClick={markSold} className="text-xs font-bold text-[#2E7D32]">
            confirmar venda
          </button>
          <button onClick={release} className="text-xs font-bold text-[#B34A2E]">
            desfazer reserva
          </button>
        </>
      )}
    </div>
  );
}

function NewLaunchUnit({ launchId, onCreated }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from("av_launch_units").insert({
      launch_id: launchId,
      name: name.trim(),
      table_value: value ? Number(value) : null,
    });
    setName("");
    setValue("");
    onCreated();
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="403 · Sereine · 216 m²"
        className="min-w-[160px] flex-1 rounded border border-rule px-2 py-1 text-sm"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor de tabela"
        className="w-32 rounded border border-rule px-2 py-1 text-sm"
      />
      <button type="submit" className="rounded bg-charcoal px-2 py-1 text-sm font-bold text-white">
        + unidade
      </button>
    </form>
  );
}

function CreateRoteiro({ launch }) {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [clientName, setClientName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const disponiveis = launch.units.filter((u) => u.status === "disponivel");

  async function create(e) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setBusy(true);
    setError("");

    const { data: selection, error: selError } = await supabase
      .from("av_selections")
      .insert({
        title: launch.name,
        subtitle: launch.summary,
        client_name: clientName.trim(),
        criteria: launch.criteria,
        milestones: launch.milestones,
        launch_id: launch.id,
        token_form: generateToken(),
        token_panel: generateToken(),
      })
      .select("id")
      .single();
    if (selError) {
      setBusy(false);
      setError(selError.message);
      return;
    }

    const { data: property, error: propError } = await supabase
      .from("av_properties")
      .insert({
        selection_id: selection.id,
        name: launch.name,
        color: launch.color,
        address: launch.address,
        summary: launch.summary,
        extra_criteria: launch.extra_criteria,
        questions: launch.questions,
      })
      .select("id")
      .single();
    if (propError) {
      setBusy(false);
      setError(propError.message);
      return;
    }

    if (disponiveis.length) {
      await supabase.from("av_units").insert(
        disponiveis.map((u) => ({
          property_id: property.id,
          name: u.name,
          table_value: u.table_value,
          launch_unit_id: u.id,
        })),
      );
    }

    setBusy(false);
    navigate(`/app/selections/${selection.id}`);
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-3 w-full rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90"
      >
        Criar roteiro para cliente
      </button>
    );
  }

  return (
    <form onSubmit={create} className="mt-3 flex flex-wrap items-end gap-2 border-t border-rule pt-3">
      <input
        autoFocus
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        placeholder="Nome do cliente"
        className="min-w-[160px] flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Criando…" : "Gerar link"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
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

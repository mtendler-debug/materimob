import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}
function n1(v) {
  return v == null ? "—" : String(v).replace(".", ",");
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const STATUS_COLORS = {
  disponivel: { bg: "#E3F0E4", color: "#2E7D32" },
  reservada: { bg: "#FFF3E0", color: "#B26A00" },
  vendida: { bg: "#F1E4E0", color: "#B34A2E" },
};
const STAGE_LABELS = { "a-visitar": "A visitar", visitado: "Visitado", negociacao: "Em negociação", descartado: "Descartado" };

export default function LaunchDetail() {
  const { id } = useParams();
  const { org, role } = useOrganization();
  const [launch, setLaunch] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState("");

  const manage = org && launch && org.id === launch.organization_id && canManage(role);
  const isOwnerOrg = org && launch && org.id === launch.organization_id;

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_launches")
      .select("*, av_launch_units(*)")
      .eq("id", id)
      .single();
    if (loadError) {
      setError("Erro ao carregar lançamento: " + loadError.message);
      return;
    }
    setLaunch({ ...data, units: data.av_launch_units });
  }

  async function loadDashboard() {
    const { data, error: rpcError } = await supabase.rpc("launch_dashboard", { p_launch_id: id });
    if (!rpcError) setDashboard(data);
  }

  async function loadPartners() {
    const { data } = await supabase
      .from("av_launch_partners")
      .select("organization_id, organizations(name)")
      .eq("launch_id", id);
    setPartners(data ?? []);
  }

  useEffect(() => {
    load();
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (manage) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manage]);

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!launch) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app/lancamentos" className="text-sm text-graytext underline">
          ← Lançamentos
        </Link>

        <div className="mt-3" style={{ borderLeft: `5px solid ${launch.color || "#A68A5B"}`, paddingLeft: 14 }}>
          <h1 className="text-xl font-bold text-charcoal">{launch.name}</h1>
          {launch.address && <p className="text-sm text-graytext">{launch.address}</p>}
          {launch.summary && <p className="text-xs text-graytext">{launch.summary}</p>}
        </div>

        {org && canManage(role) && !isOwnerOrg && (
          <PartnerToggle launchId={launch.id} org={org} partners={partners} onChange={loadPartners} />
        )}

        {partners?.length > 0 && (
          <p className="mt-2 text-xs text-graytext">
            Imobiliárias trabalhando este lançamento: {partners.map((p) => p.organizations?.name).filter(Boolean).join(", ")}
          </p>
        )}

        {manage && (
          <>
            <SectionTitle>Painel do lançamento</SectionTitle>
            {dashboard ? <LaunchDashboard dashboard={dashboard} /> : <p className="text-sm text-muted">Carregando painel…</p>}
          </>
        )}

        <SectionTitle>Unidades</SectionTitle>
        <div className="space-y-1 rounded-[14px] border border-rule bg-white p-4">
          {launch.units.map((u) => (
            <UnitRow key={u.id} unit={u} manage={manage} onChange={() => { load(); if (manage) loadDashboard(); }} />
          ))}
          {manage && <NewLaunchUnit launchId={launch.id} onCreated={load} />}
        </div>

        <SectionTitle>Roteiro para cliente</SectionTitle>
        <CreateRoteiro launch={launch} />
      </div>
    </div>
  );
}

function PartnerToggle({ launchId, org, partners, onChange }) {
  const [busy, setBusy] = useState(false);
  const checked = (partners ?? []).some((p) => p.organization_id === org.id);

  async function toggle() {
    setBusy(true);
    if (checked) {
      await supabase
        .from("av_launch_partners")
        .delete()
        .eq("launch_id", launchId)
        .eq("organization_id", org.id);
    } else {
      await supabase.from("av_launch_partners").insert({ launch_id: launchId, organization_id: org.id });
    }
    setBusy(false);
    onChange();
  }

  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-charcoal">
      <input type="checkbox" checked={checked} disabled={busy} onChange={toggle} className="h-4 w-4" />
      {org.name} está trabalhando este lançamento
    </label>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
}

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.1em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-bold">{value}</div>
      <div className="mt-[3px] text-[11.5px] text-graytext">{foot}</div>
    </div>
  );
}

function LaunchDashboard({ dashboard }) {
  const funilEntries = Object.entries(dashboard.funil || {});
  const porUnidade = dashboard.por_unidade || [];

  return (
    <div>
      <p className="text-xs text-graytext">
        Números agregados de todos os roteiros feitos a partir deste lançamento — sem nome de
        cliente nem identidade do corretor.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_corretores} corretor(es)`} />
        <Kpi label="Avaliações" value={dashboard.total_avaliacoes} foot="recebidas" />
        <Kpi label="Nota média" value={n1(dashboard.nota_media)} foot="escala de 1 a 10" />
        <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
      </div>

      {funilEntries.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-rule bg-white p-4">
          <p className="text-[11.5px] font-bold uppercase tracking-[.08em] text-graytext">Funil</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {funilEntries.map(([stage, n]) => (
              <span key={stage} className="rounded-full bg-light px-[10px] py-1 text-[11.5px] font-bold text-graytext">
                {n} {(STAGE_LABELS[stage] || stage).toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {porUnidade.length > 0 && (
        <div className="mt-3 rounded-[14px] border border-rule bg-white p-4">
          <p className="text-[11.5px] font-bold uppercase tracking-[.08em] text-graytext">Nota por unidade</p>
          <div className="mt-2 space-y-1">
            {porUnidade.map((u) => (
              <div key={u.launch_unit_id} className="flex items-center justify-between text-sm">
                <span className="text-charcoal">{u.name}</span>
                <span className="text-graytext">
                  {u.avaliacoes > 0 ? `${n1(u.nota_media)}/10 · ${u.avaliacoes} aval.` : "sem avaliação"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
    <div className="flex flex-wrap items-center gap-2 border-b border-rule py-2 text-sm last:border-0">
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
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const disponiveis = launch.units.filter((u) => u.status === "disponivel");

  async function create(e) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setBusy(true);
    setError("");

    const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
      p_name: clientName.trim(),
      p_phone: clientPhone.trim() || null,
      p_email: null,
    });
    if (clientError) {
      setBusy(false);
      setError("Erro ao vincular cliente: " + clientError.message);
      return;
    }

    const { data: selection, error: selError } = await supabase
      .from("av_selections")
      .insert({
        title: launch.name,
        subtitle: launch.summary,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_id: clientId,
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

  return (
    <form onSubmit={create} className="flex flex-wrap items-end gap-2 rounded-[14px] border border-rule bg-white p-4">
      <div className="min-w-[160px] flex-1">
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome do cliente</label>
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
      <div className="min-w-[140px] flex-1">
        <label className="block text-[11.5px] font-bold text-graytext uppercase">Telefone (opcional)</label>
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="reúne outros roteiros dele"
          className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      </div>
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

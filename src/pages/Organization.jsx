import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, ROLE_LABELS, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";

export default function Organization() {
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading, reload } = useOrganization();
  const [showNew, setShowNew] = useState(false);

  if (loading) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  function handleCreated(newOrgId) {
    setShowNew(false);
    reload();
    if (newOrgId) setActiveOrgId(newOrgId);
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-charcoal">Organização</h1>

        {memberships.length > 1 && (
          <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} onSwitch={setActiveOrgId} />
        )}

        {!org ? (
          <CreateOrganization onCreated={handleCreated} />
        ) : (
          <>
            <OrganizationDetail org={org} role={role} onChange={reload} />
            {showNew ? (
              <div className="mt-6">
                <CreateOrganization onCreated={handleCreated} />
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="mt-6 text-sm text-graytext underline"
              >
                + Criar outra organização
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OrgSwitcher({ memberships, activeOrgId, onSwitch }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-[11.5px] font-bold uppercase tracking-[.06em] text-graytext">Ver como</label>
      <select
        value={activeOrgId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        className="rounded-[9px] border-[1.5px] border-rule bg-white px-3 py-1.5 text-sm"
      >
        {memberships.map((m) => (
          <option key={m.organizations.id} value={m.organizations.id}>
            {m.organizations.name} ({ROLE_LABELS[m.role]})
          </option>
        ))}
      </select>
    </div>
  );
}

function CreateOrganization({ onCreated }) {
  const [name, setName] = useState("");
  const [tipo, setTipo] = useState("imobiliaria");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("organizations")
      .insert({ name: name.trim(), tipo })
      .select("id")
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated(data.id);
  }

  return (
    <div className="mt-4 rounded-[14px] border border-rule bg-white p-4">
      <p className="text-sm text-graytext">
        Você ainda não faz parte de uma organização. Crie uma se for licenciar o sistema para o time —
        você vira o diretor e pode convidar o resto da equipe.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Tipo</label>
          <div className="mt-1 flex gap-2">
            <TipoOption value="imobiliaria" current={tipo} onSelect={setTipo}>
              Imobiliária
              <span className="block font-normal text-graytext">gerencia equipe e portfólio de imóveis prontos/usados</span>
            </TipoOption>
            <TipoOption value="incorporadora" current={tipo} onSelect={setTipo}>
              Incorporadora
              <span className="block font-normal text-graytext">além disso, publica lançamentos</span>
            </TipoOption>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome da imobiliária/incorporadora"
            className="flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Criando…" : "Criar organização"}
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TipoOption({ value, current, onSelect, children }) {
  const selected = value === current;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex-1 rounded-[9px] border-[1.5px] p-2 text-left text-sm ${
        selected ? "border-gold bg-light" : "border-rule"
      }`}
    >
      {children}
    </button>
  );
}

function OrganizationDetail({ org, role, onChange }) {
  const [roster, setRoster] = useState(null);
  const [properties, setProperties] = useState(null);
  const [launches, setLaunches] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const manage = canManage(role);
  const incorporadora = org.tipo === "incorporadora";

  async function loadRoster() {
    const { data } = await supabase.rpc("organization_roster", { org: org.id });
    setRoster(data ?? []);
  }

  async function loadPortfolio() {
    const { data } = await supabase
      .from("av_portfolio_properties")
      .select("id, name, av_portfolio_units(id)")
      .eq("organization_id", org.id)
      .order("name");
    setProperties(data ?? []);
  }

  async function loadLaunches() {
    const { data } = await supabase
      .from("av_launches")
      .select("id, name, av_launch_units(id, status)")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });
    setLaunches(data ?? []);
  }

  async function loadDashboard() {
    const { data, error } = await supabase.rpc("organization_launches_dashboard", { p_org_id: org.id });
    if (!error) setDashboard(data);
  }

  useEffect(() => {
    loadRoster();
    loadPortfolio();
    if (incorporadora) loadLaunches();
    if (incorporadora && manage) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id]);

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-[14px] border border-rule bg-white p-4">
        <p className="text-lg font-bold text-charcoal">{org.name}</p>
        <p className="text-sm text-graytext">
          {org.tipo === "incorporadora" ? "Incorporadora" : "Imobiliária"} · Você é {ROLE_LABELS[role]}.
        </p>
        <Link to={`/app/organizacoes/${org.id}`} className="mt-2 inline-block text-xs text-graytext underline">
          Ver como aparece para o ecossistema →
        </Link>
      </div>

      {incorporadora && manage && dashboard && (
        <div>
          <SectionTitle>Painel agregado — todos os lançamentos</SectionTitle>
          <p className="text-xs text-graytext">
            Números somados de todos os lançamentos desta organização — sem nome de cliente nem
            identidade de corretor.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Lançamentos" value={dashboard.total_lancamentos} foot={`${dashboard.total_unidades} unidade(s)`} />
            <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_corretores} corretor(es)`} />
            <Kpi label="Avaliações" value={dashboard.total_avaliacoes} foot={dashboard.nota_media != null ? `nota média ${String(dashboard.nota_media).replace(".", ",")}` : "recebidas"} />
            <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
          </div>
          {dashboard.unidades_por_status && Object.keys(dashboard.unidades_por_status).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(dashboard.unidades_por_status).map(([status, n]) => (
                <span key={status} className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
                  {n} {(STATUS_LABELS[status] || status).toLowerCase()}
                </span>
              ))}
            </div>
          )}
          {dashboard.imobiliarias_parceiras?.length > 0 && (
            <p className="mt-3 text-xs text-graytext">
              Imobiliárias parceiras: {dashboard.imobiliarias_parceiras.join(", ")}
            </p>
          )}
        </div>
      )}

      {incorporadora && (
        <div>
          <SectionTitle>Lançamentos</SectionTitle>
          <div className="space-y-2">
            {launches?.length === 0 && <p className="text-sm text-muted">Nenhum lançamento publicado ainda.</p>}
            {launches?.map((l) => {
              const total = l.av_launch_units?.length ?? 0;
              const disponiveis = (l.av_launch_units ?? []).filter((u) => u.status === "disponivel").length;
              return (
                <Link
                  key={l.id}
                  to={`/app/lancamentos/${l.id}`}
                  className="flex items-center justify-between rounded-[11px] border border-rule bg-white px-3 py-2 text-sm hover:border-gold"
                >
                  <span className="text-charcoal">{l.name}</span>
                  <span className="text-graytext">{disponiveis}/{total} disponível(is)</span>
                </Link>
              );
            })}
          </div>
          <Link to="/app/lancamentos" className="mt-2 inline-block text-xs text-graytext underline">
            Gerenciar lançamentos →
          </Link>
        </div>
      )}

      <div>
        <SectionTitle>Portfólio</SectionTitle>
        <div className="space-y-2">
          {properties?.length === 0 && <p className="text-sm text-muted">Nenhum imóvel no portfólio ainda.</p>}
          {properties?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-[11px] border border-rule bg-white px-3 py-2 text-sm">
              <span className="text-charcoal">{p.name}</span>
              <span className="text-graytext">{p.av_portfolio_units?.length ?? 0} unidade(s)</span>
            </div>
          ))}
        </div>
        <Link to="/app/portfolio" className="mt-2 inline-block text-xs text-graytext underline">
          Gerenciar portfólio →
        </Link>
      </div>

      <div>
        <SectionTitle>Equipe</SectionTitle>
        <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">E-mail</th>
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">Papel</th>
              </tr>
            </thead>
            <tbody>
              {roster?.map((m) => (
                <tr key={m.user_id}>
                  <td className="border-b border-rule p-[10px] text-charcoal">{m.email}</td>
                  <td className="border-b border-rule p-[10px] text-graytext">{ROLE_LABELS[m.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {manage && <Invites orgId={org.id} onChange={onChange} />}
    </div>
  );
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.1em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-bold">{value}</div>
      <div className="mt-[3px] text-[11.5px] text-graytext">{foot}</div>
    </div>
  );
}

function Invites({ orgId }) {
  const [invites, setInvites] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("corretor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase
      .from("organization_invites")
      .select("id, email, role, token, accepted_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    setInvites(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function sendInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("organization_invites").insert({
      organization_id: orgId,
      email: email.trim(),
      role,
      token: generateToken(),
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEmail("");
    load();
  }

  async function removeInvite(id) {
    await supabase.from("organization_invites").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <SectionTitle>Convites</SectionTitle>
      <div className="rounded-[14px] border border-rule bg-white p-4">
        <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            >
              <option value="corretor">Corretor</option>
              <option value="coordenador">Coordenador</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Gerando…" : "Gerar convite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 space-y-2">
          {invites?.length === 0 && <p className="text-sm text-muted">Nenhum convite ainda.</p>}
          {invites?.map((inv) => (
            <InviteRow key={inv.id} invite={inv} onRemove={() => removeInvite(inv.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InviteRow({ invite, onRemove }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/convite/${invite.token}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[9px] bg-bg p-2 text-sm">
      <span className="flex-1 text-charcoal">
        {invite.email} <span className="text-graytext">· {ROLE_LABELS[invite.role]}</span>
      </span>
      {invite.accepted_at ? (
        <span className="text-xs font-bold text-[#2E7D32]">aceito</span>
      ) : (
        <>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-[9px] bg-charcoal px-2 py-1 text-xs font-bold text-white hover:opacity-90"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button onClick={onRemove} className="text-xs font-bold text-[#B34A2E]">
            cancelar
          </button>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
}

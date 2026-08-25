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
  const [teamDashboard, setTeamDashboard] = useState(null);
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

  async function loadTeamDashboard() {
    const { data, error } = await supabase.rpc("organization_team_dashboard", { p_org_id: org.id });
    if (!error) setTeamDashboard(data);
  }

  useEffect(() => {
    loadRoster();
    loadPortfolio();
    if (incorporadora) loadLaunches();
    if (incorporadora && manage) loadDashboard();
    if (!incorporadora && manage) loadTeamDashboard();
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
            <div className="mt-4 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">Funil de unidades</p>
              <FunnelBar counts={dashboard.unidades_por_status} />
            </div>
          )}

          {dashboard.por_lancamento?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
                Comparação entre lançamentos
              </p>
              <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {["Lançamento", "Status", "Unidades", "Roteiros", "Avaliações", "Nota média", "Propostas"].map((h) => (
                        <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.por_lancamento.map((l) => (
                      <tr key={l.id}>
                        <td className="border-b border-rule p-[10px] font-bold text-charcoal">{l.name}</td>
                        <td className="border-b border-rule p-[10px]">
                          <span
                            className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                            style={
                              l.status === "ativo"
                                ? { background: "#E3F0E4", color: "#2E7D32" }
                                : { background: "#F1E4E0", color: "#B34A2E" }
                            }
                          >
                            {LAUNCH_STATUS_LABELS[l.status] || l.status}
                          </span>
                        </td>
                        <td className="min-w-[140px] border-b border-rule p-[10px]">
                          <FunnelBar
                            compact
                            counts={{ disponivel: l.disponiveis, reservada: l.reservadas, vendida: l.vendidas }}
                          />
                        </td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{l.total_roteiros}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{l.total_avaliacoes}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">
                          {l.nota_media != null ? String(l.nota_media).replace(".", ",") : "—"}
                        </td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">
                          {l.total_propostas} ({l.propostas_interesse} c/ interesse)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(dashboard.por_parceiro?.length > 0 || dashboard.top_corretores?.length > 0) && (
            <div className="mt-6">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">Ecossistema</p>

              {dashboard.por_parceiro?.length > 0 && (
                <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr>
                        {["Imobiliária parceira", "Corretores", "Roteiros", "Propostas", "Interesse"].map((h) => (
                          <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.por_parceiro.map((p) => (
                        <tr key={p.organization_id}>
                          <td className="border-b border-rule p-[10px] font-bold text-charcoal">{p.name}</td>
                          <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_corretores}</td>
                          <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_roteiros}</td>
                          <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_propostas}</td>
                          <td className="border-b border-rule p-[10px] text-center text-graytext">{p.propostas_interesse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dashboard.top_corretores?.length > 0 && (
                <div className={dashboard.por_parceiro?.length > 0 ? "mt-4" : ""}>
                  <p className="mb-2 text-xs text-graytext">Corretores que mais geram roteiros com seus lançamentos</p>
                  <div className="space-y-[6px]">
                    {dashboard.top_corretores.map((c) => (
                      <LeaderboardBar
                        key={c.user_id}
                        label={c.full_name || c.email}
                        sublabel={c.org_name || "Independente"}
                        value={c.total_roteiros}
                        max={dashboard.top_corretores[0].total_roteiros}
                        foot={`${c.total_propostas} proposta(s) · ${c.propostas_interesse} c/ interesse`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!incorporadora && manage && teamDashboard && (
        <div>
          <SectionTitle>Painel da equipe</SectionTitle>
          <p className="text-xs text-graytext">
            Números somados de todos os corretores desta organização.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Roteiros" value={teamDashboard.total_roteiros} foot={`${teamDashboard.total_membros} corretor(es)`} />
            <Kpi label="Clientes" value={teamDashboard.total_clientes} foot="atendidos" />
            <Kpi
              label="Avaliações"
              value={teamDashboard.total_avaliacoes}
              foot={teamDashboard.nota_media != null ? `nota média ${String(teamDashboard.nota_media).replace(".", ",")}` : "recebidas"}
            />
            <Kpi label="Propostas" value={teamDashboard.total_propostas} foot={`${teamDashboard.propostas_interesse} com interesse`} />
          </div>
          <p className="mt-3 text-xs text-graytext">
            {teamDashboard.ativos_30d} corretor(es) ativo(s) nos últimos 30 dias ·{" "}
            {teamDashboard.total_imoveis_portfolio} imóvel(is) no portfólio da organização
          </p>

          <p className="mt-5 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
            Ranking da equipe
          </p>
          <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Nome", "Papel", "Roteiros", "Avaliações", "Nota média", "Propostas", ""].map((h) => (
                    <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamDashboard.por_corretor?.map((c) => {
                  const maxRoteiros = Math.max(...teamDashboard.por_corretor.map((x) => x.total_roteiros), 1);
                  return (
                    <tr key={c.user_id}>
                      <td className="border-b border-rule p-[10px] text-charcoal">{c.full_name || c.email}</td>
                      <td className="border-b border-rule p-[10px] text-graytext">{ROLE_LABELS[c.role]}</td>
                      <td className="min-w-[90px] border-b border-rule p-[10px]">
                        <div className="mx-auto w-16 text-center text-graytext">{c.total_roteiros}</div>
                        <div className="mx-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-light">
                          <div
                            className="h-full rounded-full bg-gold"
                            style={{ width: `${c.total_roteiros > 0 ? Math.max((c.total_roteiros / maxRoteiros) * 100, 6) : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{c.total_avaliacoes}</td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">
                        {c.nota_media != null ? String(c.nota_media).replace(".", ",") : "—"}
                      </td>
                      <td className="border-b border-rule p-[10px] text-center text-graytext">{c.total_propostas}</td>
                      <td className="border-b border-rule p-[10px] text-center">
                        {c.ativo_30d && (
                          <span className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold" style={{ background: "#E3F0E4", color: "#2E7D32" }}>
                            ativo
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {teamDashboard.atividade_periodo?.length > 0 && (
            <div className="mt-6 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
                Atividade da equipe — roteiros por semana
              </p>
              <ActivityBars data={teamDashboard.atividade_periodo} />
            </div>
          )}

          {teamDashboard.portfolio_performance?.length > 0 && (
            <div className="mt-6">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
                Desempenho do portfólio
              </p>
              <p className="mb-2 text-xs text-graytext">
                Quantas vezes qualquer corretor da plataforma usou cada imóvel — contagem a partir de
                agora, roteiros importados antes desta métrica não entram.
              </p>
              <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {["Imóvel", "Usos", "Corretores", "Avaliações", "Nota média", "Propostas"].map((h) => (
                        <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamDashboard.portfolio_performance.map((p) => (
                      <tr key={p.id}>
                        <td className="border-b border-rule p-[10px] font-bold text-charcoal">{p.name}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_usos}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_corretores}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_avaliacoes}</td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">
                          {p.nota_media != null ? String(p.nota_media).replace(".", ",") : "—"}
                        </td>
                        <td className="border-b border-rule p-[10px] text-center text-graytext">{p.total_propostas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">Nome</th>
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">Papel</th>
              </tr>
            </thead>
            <tbody>
              {roster?.map((m) => (
                <tr key={m.user_id}>
                  <td className="border-b border-rule p-[10px] text-charcoal">{m.full_name || m.email}</td>
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
const UNIT_STATUS_COLORS = {
  disponivel: { bg: "#E3F0E4", color: "#2E7D32" },
  reservada: { bg: "#FFF3E0", color: "#B26A00" },
  vendida: { bg: "#F1E4E0", color: "#B34A2E" },
};
const LAUNCH_STATUS_LABELS = { ativo: "Ativo", encerrado: "Encerrado" };
const UNIT_STATUS_ORDER = ["disponivel", "reservada", "vendida"];

function FunnelBar({ counts, compact }) {
  const total = UNIT_STATUS_ORDER.reduce((sum, k) => sum + (counts[k] || 0), 0);
  if (!total) return compact ? <span className="text-xs text-graytext">—</span> : null;
  return (
    <div>
      <div className={`flex overflow-hidden rounded-full ${compact ? "h-2" : "h-3"}`}>
        {UNIT_STATUS_ORDER.map(
          (k) =>
            counts[k] > 0 && (
              <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: UNIT_STATUS_COLORS[k].color }} />
            ),
        )}
      </div>
      {!compact && (
        <div className="mt-2 flex flex-wrap gap-2">
          {UNIT_STATUS_ORDER.map(
            (k) =>
              counts[k] > 0 && (
                <span
                  key={k}
                  className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
                  style={{ background: UNIT_STATUS_COLORS[k].bg, color: UNIT_STATUS_COLORS[k].color }}
                >
                  {counts[k]} {STATUS_LABELS[k].toLowerCase()}
                </span>
              ),
          )}
        </div>
      )}
    </div>
  );
}

function formatSemana(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ActivityBars({ data }) {
  const max = Math.max(...data.map((d) => d.total_roteiros), 1);
  return (
    <div className="flex items-end gap-2">
      {data.map((d) => (
        <div key={d.semana} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-charcoal">{d.total_roteiros}</span>
          <div className="flex h-20 w-full items-end">
            <div
              className="w-full rounded-t-[4px] bg-gold"
              style={{ height: `${d.total_roteiros > 0 ? Math.max((d.total_roteiros / max) * 100, 6) : 2}%` }}
            />
          </div>
          <span className="text-[9px] text-graytext">{formatSemana(d.semana)}</span>
        </div>
      ))}
    </div>
  );
}

function LeaderboardBar({ label, sublabel, value, max, foot }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 4) : 0;
  return (
    <div className="rounded-[10px] bg-white px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-charcoal">{label}</span>
        <span className="shrink-0 text-xs text-graytext">{sublabel}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-light">
          <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 shrink-0 text-right text-xs font-bold text-graytext">{value}</span>
      </div>
      <div className="mt-1 text-[11px] text-graytext">{foot}</div>
    </div>
  );
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

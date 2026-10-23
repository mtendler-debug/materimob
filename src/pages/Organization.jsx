import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, ROLE_LABELS, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";
import { geocodeAddress } from "../lib/geocode";
import { Map } from "../components/Map";
import { useFeedback } from "../lib/feedback";
import { useAuth } from "../lib/AuthContext";

export default function Organization() {
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading, reload } = useOrganization();
  const [showNew, setShowNew] = useState(false);

  if (loading) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  function handleCreated(newOrgId) {
    setShowNew(false);
    reload();
    if (newOrgId) setActiveOrgId(newOrgId);
  }

  const trocador = (
    <div className="space-y-2">
      {memberships.length > 1 && <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} onSwitch={setActiveOrgId} />}
      {!showNew && (
        <button
          onClick={() => setShowNew(true)}
          className="min-h-10 w-full rounded-[10px] px-3 text-left text-body-sm font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal"
        >
          + Criar outra organização
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {!org ? (
        <div className="mx-auto max-w-2xl px-4 py-8 md:px-8">
          <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Organização</h1>
          {memberships.length > 1 && <OrgSwitcher memberships={memberships} activeOrgId={activeOrgId} onSwitch={setActiveOrgId} />}
          <CreateOrganization onCreated={handleCreated} />
        </div>
      ) : (
        <OrganizationDetail
          org={org}
          role={role}
          onChange={reload}
          trocador={trocador}
          novaOrg={showNew ? <CreateOrganization onCreated={handleCreated} /> : null}
        />
      )}
    </div>
  );
}

function OrgSwitcher({ memberships, activeOrgId, onSwitch }) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <label className="mb-1 block text-[11px] font-semibold tracking-[.06em] text-muted uppercase">Ver como</label>
      <select
        value={activeOrgId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        className="min-h-10 rounded-[10px] border border-slate-200 bg-white px-3 text-body-sm"
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
    <div className="mt-4 rounded-card border border-slate-200/70 bg-white p-4">
      <p className="text-sm text-graytext">
        Você ainda não faz parte de uma organização. Crie uma se for licenciar o sistema para o time —
        você vira o diretor e pode convidar o resto da equipe.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 space-y-3">
        <div>
          <label className="mb-1.5 block text-caption font-medium text-graytext">Tipo</label>
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
            className="flex-1 min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-control min-h-11 bg-brand px-5 text-body-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Criando…" : "Criar organização"}
          </button>
        </div>
      </form>
      {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}
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

function OrgHeaderCard({ org, role, manage, onChange }) {
  const { user } = useAuth();
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(org.name);
  const [address, setAddress] = useState(org.address ?? "");
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function sair() {
    if (
      !(await confirm(
        `Sair de "${org.name}"? Você volta a ser corretor autônomo e perde acesso ao que é exclusivo da organização.`,
        { confirmLabel: "Sair da organização" },
      ))
    )
      return;
    setLeaving(true);
    // Só a própria linha: sem o user_id, um gerente apagaria a equipe inteira
    // (e o banco recusa tudo, porque o diretor não pode sair assim).
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", org.id)
      .eq("user_id", user.id);
    if (error) {
      setLeaving(false);
      toast("Não foi possível sair: " + error.message, "danger");
      return;
    }
    window.location.href = "/";
  }

  async function salvar() {
    if (!name.trim()) return;
    setSaving(true);
    const trimmedAddress = address.trim();
    let coords = { latitude: org.latitude ?? null, longitude: org.longitude ?? null };
    if (trimmedAddress !== (org.address ?? "")) {
      const geo = trimmedAddress ? await geocodeAddress(trimmedAddress) : null;
      coords = { latitude: geo?.lat ?? null, longitude: geo?.lng ?? null };
    }
    await supabase
      .from("organizations")
      .update({ name: name.trim(), address: trimmedAddress || null, ...coords })
      .eq("id", org.id);
    setSaving(false);
    setEditing(false);
    onChange();
  }

  if (editing) {
    return (
      <div className="rounded-card border border-slate-200/70 bg-white p-4">
        <label className="mb-1.5 block text-caption font-medium text-graytext">Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
        <label className="mt-3 mb-1.5 block text-caption font-medium text-graytext">Endereço</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Usado só pra aparecer no mapa do ecossistema"
          className="mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={salvar}
            disabled={saving}
            className="rounded-control min-h-11 bg-brand px-5 text-body-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button onClick={() => setEditing(false)} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
            cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-4">
      <p className="text-lg font-semibold text-charcoal">{org.name}</p>
      <p className="text-sm text-graytext">
        {org.tipo === "incorporadora" ? "Incorporadora" : "Imobiliária"} · Você é {ROLE_LABELS[role]}.
        {org.address ? ` · ${org.address}` : ""}
      </p>
      <div className="mt-2 flex items-center gap-3">
        <Link to={`/app/organizacoes/${org.id}`} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
          Ver como aparece para o ecossistema →
        </Link>
        {manage && (
          <button onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
            editar
          </button>
        )}
        <button
          onClick={sair}
          disabled={leaving}
          className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal disabled:opacity-50"
        >
          {leaving ? "saindo…" : "sair da organização"}
        </button>
      </div>
    </div>
  );
}

// Marca e domínio — white-label da organização. Mesmas colunas lidas por
// useOrganization() pra reskinar a casca do app (ver AppLayout.jsx); aqui
// é só a tela pra editar. Gate de UI segue o mesmo "manage" (gerente+) que
// já vale pro "editar" do card acima, mesma organização/coluna.
function MarcaCard({ org, manage, onChange }) {
  const [editing, setEditing] = useState(false);
  const [nomeExibicao, setNomeExibicao] = useState(org.nome_exibicao ?? "");
  const [logoUrl, setLogoUrl] = useState(org.logo_url ?? "");
  const [corPrimaria, setCorPrimaria] = useState(org.cor_primaria ?? "#0284C7");
  const [corSecundaria, setCorSecundaria] = useState(org.cor_secundaria ?? "#1C1C1C");
  const [slug, setSlug] = useState(org.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!manage) return null;

  async function salvar() {
    setSaving(true);
    setError("");
    const { error: saveError } = await supabase
      .from("organizations")
      .update({
        nome_exibicao: nomeExibicao.trim() || null,
        logo_url: logoUrl.trim() || null,
        cor_primaria: corPrimaria || null,
        cor_secundaria: corSecundaria || null,
        slug: slug.trim() || null,
      })
      .eq("id", org.id);
    setSaving(false);
    if (saveError) {
      setError(
        saveError.message.includes("organizations_slug_unico")
          ? "Esse endereço já está em uso por outra organização."
          : saveError.message.includes("reservado")
            ? "Esse endereço é reservado pelo próprio Materimob."
            : "Erro ao salvar: " + saveError.message,
      );
      return;
    }
    setEditing(false);
    onChange();
  }

  const temMarca = Boolean(org.cor_primaria || org.cor_secundaria || org.logo_url || org.slug);

  if (!editing) {
    return (
      <div className="rounded-card border border-slate-200/70 bg-white p-4">
        <p className="text-lg font-semibold text-charcoal">Marca e domínio</p>
        {temMarca ? (
          <p className="text-sm text-graytext">
            {org.nome_exibicao || org.name}
            {org.slug ? ` · materimob.com.br/${org.slug}` : " · sem endereço próprio ainda"}
          </p>
        ) : (
          <p className="text-sm text-graytext">
            Ainda com a aparência padrão do MaterImob — configure aqui pra vestir o sistema com a
            cara da organização.
          </p>
        )}
        <button onClick={() => setEditing(true)} className="mt-2 inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
          {temMarca ? "editar marca" : "configurar marca"}
        </button>
      </div>
    );
  }

  const previewUrl = slug.trim() ? `materimob.com.br/${slug.trim()}` : null;

  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-4">
      <p className="text-lg font-semibold text-charcoal">Marca e domínio</p>
      <p className="mt-1 text-caption text-graytext">
        Aparece pro seu time quando estiver atuando dentro desta organização — no menu, no login e
        em materimob.com.br/{slug.trim() || "seu-endereço"}.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-caption font-medium text-graytext">Nome de exibição</label>
            <input
              value={nomeExibicao}
              onChange={(e) => setNomeExibicao(e.target.value)}
              placeholder={org.name}
              className="mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-caption font-medium text-graytext">Logo (URL da imagem)</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            />
          </div>
          <div className="flex gap-4">
            <div>
              <label className="mb-1.5 block text-caption font-medium text-graytext">Cor primária</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-[8px] border border-slate-200"
                />
                <input
                  value={corPrimaria}
                  onChange={(e) => setCorPrimaria(e.target.value)}
                  className="w-24 rounded-[9px] border border-slate-200 px-2 py-2 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-caption font-medium text-graytext">Cor secundária</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-[8px] border border-slate-200"
                />
                <input
                  value={corSecundaria}
                  onChange={(e) => setCorSecundaria(e.target.value)}
                  className="w-24 rounded-[9px] border border-slate-200 px-2 py-2 text-xs"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-caption font-medium text-graytext">Endereço</label>
            <div className="mt-1 flex items-stretch">
              <span className="flex items-center rounded-l-[9px] border-[1.5px] border-r-0 border-rule bg-light px-2 text-caption text-graytext">
                materimob.com.br/
              </span>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="chaincorp"
                className="w-full rounded-r-[9px] border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            {previewUrl && <p className="mt-1 text-caption text-graytext">→ {previewUrl}</p>}
          </div>

          {error && <p className="text-sm text-danger-text">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={salvar}
              disabled={saving}
              className="rounded-control min-h-11 bg-brand px-5 text-body-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            <button onClick={() => setEditing(false)} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
              cancelar
            </button>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-caption font-semibold tracking-[.06em] text-muted uppercase">
            Pré-visualização
          </p>
          <div className="flex h-[150px] overflow-hidden rounded-xl border border-slate-200/70">
            <div className="flex w-2/5 flex-col gap-2 p-3" style={{ background: corSecundaria }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" className="max-h-5" />
              ) : (
                <span
                  className="text-[9px] font-bold uppercase tracking-[.08em]"
                  style={{ color: corPrimaria }}
                >
                  {(nomeExibicao || org.name).slice(0, 16)}
                </span>
              )}
              <span className="h-[6px] rounded-full" style={{ background: corPrimaria }} />
              <span className="h-[6px] w-3/4 rounded-full bg-white/15" />
            </div>
            <div className="flex-1 space-y-2 bg-[#f7f5f2] p-3">
              <p className="text-[13px] font-semibold" style={{ color: corSecundaria }}>
                {nomeExibicao || org.name}
              </p>
              <span className="block h-[5px] w-3/4 rounded-full bg-black/10" />
              <span className="block h-[5px] w-1/2 rounded-full bg-black/10" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationDetail({ org, role, onChange, trocador, novaOrg }) {
  const [roster, setRoster] = useState(null);
  const [properties, setProperties] = useState(null);
  const [launches, setLaunches] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [teamDashboard, setTeamDashboard] = useState(null);
  const manage = canManage(role);
  const [ativa, setAtiva] = useState(manage ? "painel" : "imoveis");
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
      .select("id, name, latitude, longitude, av_launch_units(id, status)")
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
    // Painel da equipe (roteiros/avaliações) também vale pra
    // incorporadora — o diretor pode atuar como corretor também, não só
    // acompanhar o agregado de lançamentos.
    if (manage) loadTeamDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id]);

  // Item ativo do índice acompanha a rolagem da página.
  useEffect(() => {
    function onScroll() {
      const secoes = [...document.querySelectorAll("[data-secao]")];
      let atual = secoes[0];
      for (const el of secoes) if (el.getBoundingClientRect().top <= 110) atual = el;
      if (atual) setAtiva(atual.dataset.secao);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [manage, roster, properties, launches]);

  const indice = [
    ...(manage ? [["painel", "Painéis"]] : []),
    ["imoveis", incorporadora ? "Lançamentos e portfólio" : "Portfólio"],
    ["equipe", manage ? "Equipe e convites" : "Equipe"],
    ["marca", manage ? "Marca e dados" : "Dados"],
  ];
  const cor = org.cor_primaria || "#0284C7";

  return (
    <div className="md:grid md:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-[18px] border-b border-slate-200/70 bg-white px-4 py-6 md:sticky md:top-[60px] md:h-[calc(100vh-60px)] md:overflow-y-auto md:border-r md:border-b-0 md:px-5 md:py-7">
        {org.logo_url ? (
          <img src={org.logo_url} alt="" className="h-16 w-16 rounded-[20px] object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-[20px] text-2xl font-bold text-white" style={{ background: cor }}>
            {(org.nome_exibicao || org.name || "?")[0].toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="text-title leading-tight font-bold tracking-tight text-charcoal">{org.nome_exibicao || org.name}</h1>
          <span className="mt-2 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-sky-800">
            {incorporadora ? "Incorporadora" : "Imobiliária"}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-1">
          <div>
            <dt className="text-[11px] font-semibold tracking-[.06em] text-muted uppercase">Seu papel</dt>
            <dd className="mt-0.5 font-medium text-slate-700">{ROLE_LABELS[role]}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[.06em] text-muted uppercase">Pessoas</dt>
            <dd className="mt-0.5 font-medium text-slate-700">{roster ? `${roster.length} na equipe` : "…"}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold tracking-[.06em] text-muted uppercase">{incorporadora ? "Lançamentos" : "Portfólio"}</dt>
            <dd className="mt-0.5 font-medium text-slate-700">
              {incorporadora ? (launches ? `${launches.length} publicado(s)` : "…") : properties ? `${properties.length} imóvel(is)` : "…"}
            </dd>
          </div>
        </dl>
        <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 md:mx-0 md:grid md:gap-0.5 md:overflow-visible md:px-0" aria-label="Seções">
          {indice.map(([id, rotulo]) => (
            <a
              key={id}
              href={`#s-${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(`s-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              aria-current={ativa === id}
              className={`flex min-h-10 flex-none items-center rounded-[10px] border px-3 text-body-sm whitespace-nowrap transition-all duration-200 md:border-transparent ${
                ativa === id
                  ? "border-brand-soft bg-brand-soft font-semibold text-sky-800"
                  : "border-slate-200 font-medium text-slate-600 hover:bg-light md:border-transparent"
              }`}
            >
              {rotulo}
            </a>
          ))}
        </nav>
        <div className="md:mt-auto">{trocador}</div>
      </aside>

      <div className="min-w-0 max-w-[900px] space-y-10 px-4 py-7 pb-24 md:px-8">
        {novaOrg}

        {manage && (
          <section id="s-painel" data-secao="painel" className="scroll-mt-20 space-y-6">
      {incorporadora && manage && dashboard && (
        <div>
          <SectionTitle>Painel agregado — todos os lançamentos</SectionTitle>
          <p className="text-caption text-graytext">
            Números somados de todos os lançamentos desta organização — sem nome de cliente nem
            identidade de corretor.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200/70 bg-slate-200/70 sm:grid-cols-4">
            <Kpi label="Lançamentos" value={dashboard.total_lancamentos} foot={`${dashboard.total_unidades} unidade(s)`} />
            <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_corretores} corretor(es)`} />
            <Kpi label="Avaliações" value={dashboard.total_avaliacoes} foot={dashboard.nota_media != null ? `nota média ${String(dashboard.nota_media).replace(".", ",")}` : "recebidas"} />
            <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
            <Kpi label="Ticket médio" value={dashboard.ticket_medio_vendas != null ? brl(dashboard.ticket_medio_vendas) : "—"} foot="unidades vendidas" />
            <Kpi label="Previsão" value={brl(dashboard.previsao_vendas)} foot="em propostas com intenção de compra" />
          </div>

          {dashboard.unidades_por_status && Object.keys(dashboard.unidades_por_status).length > 0 && (
            <div className="mt-4 rounded-card border border-slate-200/70 bg-white p-4">
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">Funil de unidades</p>
              <FunnelBar counts={dashboard.unidades_por_status} />
            </div>
          )}

          {dashboard.por_lancamento?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Comparação entre lançamentos
              </p>
              <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {["Lançamento", "Status", "Unidades", "Roteiros", "Avaliações", "Nota média", "Propostas", "Ticket médio"].map((h) => (
                        <th key={h} className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.por_lancamento.map((l) => (
                      <tr key={l.id}>
                        <td className="border-t border-slate-100 p-[10px] font-semibold text-charcoal">{l.name}</td>
                        <td className="border-t border-slate-100 p-[10px]">
                          <span
                            className="rounded-full px-2.5 py-0.5 text-caption font-semibold"
                            style={
                              l.status === "ativo"
                                ? { background: "#E3F0E4", color: "#2E7D32" }
                                : { background: "#F1E4E0", color: "#B34A2E" }
                            }
                          >
                            {LAUNCH_STATUS_LABELS[l.status] || l.status}
                          </span>
                        </td>
                        <td className="min-w-[140px] border-t border-slate-100 p-[10px]">
                          <FunnelBar
                            compact
                            counts={{ disponivel: l.disponiveis, reservada: l.reservadas, vendida: l.vendidas }}
                          />
                        </td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{l.total_roteiros}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{l.total_avaliacoes}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                          {l.nota_media != null ? String(l.nota_media).replace(".", ",") : "—"}
                        </td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                          {l.total_propostas} ({l.propostas_interesse} c/ interesse)
                        </td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                          {l.ticket_medio_vendas != null ? brl(l.ticket_medio_vendas) : "—"}
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
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">Ecossistema</p>

              {(dashboard.por_parceiro?.some((p) => p.latitude != null) ||
                dashboard.top_corretores?.some((c) => c.latitude != null)) && (
                <div className="mb-4 overflow-hidden rounded-card border border-slate-200/70">
                  <Map
                    pins={[
                      ...(dashboard.por_parceiro ?? [])
                        .filter((p) => p.latitude != null && p.longitude != null)
                        .map((p) => ({ lat: p.latitude, lng: p.longitude, label: `${p.name} (imobiliária)`, color: "#0284C7" })),
                      ...(dashboard.top_corretores ?? [])
                        .filter((c) => c.latitude != null && c.longitude != null)
                        .map((c) => ({ lat: c.latitude, lng: c.longitude, label: `${c.full_name || c.email} (corretor)`, color: "#4A6FA5" })),
                    ]}
                    height={260}
                  />
                </div>
              )}

              {dashboard.por_parceiro?.length > 0 && (
                <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr>
                        {["Imobiliária parceira", "Corretores", "Roteiros", "Propostas", "Interesse", "Vendidas", "Ticket médio"].map((h) => (
                          <th key={h} className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.por_parceiro.map((p) => (
                        <tr key={p.organization_id}>
                          <td className="border-t border-slate-100 p-[10px] font-semibold text-charcoal">{p.name}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_corretores}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_roteiros}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_propostas}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.propostas_interesse}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_vendidas}</td>
                          <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                            {p.ticket_medio_vendas != null ? brl(p.ticket_medio_vendas) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {dashboard.top_corretores?.length > 0 && (
                <div className={dashboard.por_parceiro?.length > 0 ? "mt-4" : ""}>
                  <p className="mb-2 text-caption text-graytext">Corretores que mais geram roteiros com seus lançamentos</p>
                  <div className="space-y-[6px]">
                    {dashboard.top_corretores.map((c) => (
                      <LeaderboardBar
                        key={c.user_id}
                        label={c.full_name || c.email}
                        sublabel={c.org_name || "Independente"}
                        value={c.total_roteiros}
                        max={dashboard.top_corretores[0].total_roteiros}
                        foot={`${c.total_propostas} proposta(s) · ${c.propostas_interesse} c/ interesse · ${c.total_vendidas} vendida(s)${
                          c.ticket_medio_vendas != null ? ` (ticket médio ${brl(c.ticket_medio_vendas)})` : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {manage && teamDashboard && (
        <div>
          <SectionTitle>Painel da equipe</SectionTitle>
          <p className="text-caption text-graytext">
            Números somados de todos os corretores desta organização.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200/70 bg-slate-200/70 sm:grid-cols-4">
            <Kpi label="Roteiros" value={teamDashboard.total_roteiros} foot={`${teamDashboard.total_membros} corretor(es)`} />
            <Kpi label="Clientes" value={teamDashboard.total_clientes} foot="atendidos" />
            <Kpi
              label="Avaliações"
              value={teamDashboard.total_avaliacoes}
              foot={teamDashboard.nota_media != null ? `nota média ${String(teamDashboard.nota_media).replace(".", ",")}` : "recebidas"}
            />
            <Kpi label="Propostas" value={teamDashboard.total_propostas} foot={`${teamDashboard.propostas_interesse} com interesse`} />
            <Kpi label="Vendas" value={teamDashboard.total_vendas} foot={teamDashboard.ticket_medio_vendas != null ? `ticket médio ${brl(teamDashboard.ticket_medio_vendas)}` : "confirmadas"} />
            <Kpi label="Previsão" value={brl(teamDashboard.previsao_vendas)} foot="em propostas com intenção de compra" />
          </div>
          <p className="mt-3 text-caption text-graytext">
            {teamDashboard.ativos_30d} corretor(es) ativo(s) nos últimos 30 dias ·{" "}
            {teamDashboard.total_imoveis_portfolio} imóvel(is) no portfólio da organização
          </p>

          <p className="mt-5 mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
            Ranking da equipe
          </p>
          <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr>
                  {["Nome", "Papel", "Roteiros", "Avaliações", "Nota média", "Propostas", "Vendas", ""].map((h) => (
                    <th key={h} className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">
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
                      <td className="border-t border-slate-100 p-[10px] text-charcoal">{c.full_name || c.email}</td>
                      <td className="border-t border-slate-100 p-[10px] text-graytext">{ROLE_LABELS[c.role]}</td>
                      <td className="min-w-[90px] border-t border-slate-100 p-[10px]">
                        <div className="mx-auto w-16 text-center text-graytext">{c.total_roteiros}</div>
                        <div className="mx-auto mt-1 h-1 w-16 overflow-hidden rounded-full bg-light">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${c.total_roteiros > 0 ? Math.max((c.total_roteiros / maxRoteiros) * 100, 6) : 0}%` }}
                          />
                        </div>
                      </td>
                      <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{c.total_avaliacoes}</td>
                      <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                        {c.nota_media != null ? String(c.nota_media).replace(".", ",") : "—"}
                      </td>
                      <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{c.total_propostas}</td>
                      <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                        {c.total_vendas}
                        {c.ticket_medio_vendas != null && (
                          <span className="block text-[10px] text-muted">{brl(c.ticket_medio_vendas)}</span>
                        )}
                      </td>
                      <td className="border-t border-slate-100 p-[10px] text-center">
                        {c.ativo_30d && (
                          <span className="rounded-full px-2.5 py-0.5 text-caption font-semibold" style={{ background: "#E3F0E4", color: "#2E7D32" }}>
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
            <div className="mt-6 rounded-card border border-slate-200/70 bg-white p-4">
              <p className="mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Atividade da equipe — roteiros por semana
              </p>
              <ActivityBars data={teamDashboard.atividade_periodo} />
            </div>
          )}

          {teamDashboard.portfolio_performance?.length > 0 && (
            <div className="mt-6">
              <p className="mb-1 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Desempenho do portfólio
              </p>
              <p className="mb-2 text-caption text-graytext">
                Quantas vezes qualquer corretor da plataforma usou cada imóvel — contagem a partir de
                agora, roteiros importados antes desta métrica não entram.
              </p>
              <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {["Imóvel", "Usos", "Corretores", "Avaliações", "Nota média", "Propostas"].map((h) => (
                        <th key={h} className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamDashboard.portfolio_performance.map((p) => (
                      <tr key={p.id}>
                        <td className="border-t border-slate-100 p-[10px] font-semibold text-charcoal">{p.name}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_usos}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_corretores}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_avaliacoes}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                          {p.nota_media != null ? String(p.nota_media).replace(".", ",") : "—"}
                        </td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{p.total_propostas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {teamDashboard.portfolio_performance.some((p) => p.latitude != null) && (
                <div className="mt-3 overflow-hidden rounded-card border border-slate-200/70">
                  <Map
                    pins={teamDashboard.portfolio_performance
                      .filter((p) => p.latitude != null && p.longitude != null)
                      .map((p) => ({ lat: p.latitude, lng: p.longitude, label: p.name }))}
                    height={260}
                  />
                </div>
              )}
            </div>
          )}

          {teamDashboard.launches_em_roteiro?.some((l) => l.latitude != null) && (
            <div className="mt-6">
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Mapa de projetos
              </p>
              <div className="overflow-hidden rounded-card border border-slate-200/70">
                <Map
                  pins={teamDashboard.launches_em_roteiro
                    .filter((l) => l.latitude != null && l.longitude != null)
                    .map((l) => ({ lat: l.latitude, lng: l.longitude, label: l.name }))}
                  height={260}
                />
              </div>
            </div>
          )}

          {teamDashboard.imoveis_em_roteiro?.some((im) => im.latitude != null) && (
            <div className="mt-6">
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Mapa de imóveis em roteiro
              </p>
              <div className="overflow-hidden rounded-card border border-slate-200/70">
                <Map
                  pins={teamDashboard.imoveis_em_roteiro
                    .filter((im) => im.latitude != null && im.longitude != null)
                    .map((im) => ({ lat: im.latitude, lng: im.longitude, label: im.name }))}
                  height={260}
                />
              </div>
            </div>
          )}

          {teamDashboard.por_incorporadora?.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">
                Vendas por incorporadora
              </p>
              <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead>
                    <tr>
                      {["Incorporadora", "Roteiros", "Vendas", "Ticket médio"].map((h) => (
                        <th key={h} className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teamDashboard.por_incorporadora.map((i) => (
                      <tr key={i.organization_id}>
                        <td className="border-t border-slate-100 p-[10px] font-semibold text-charcoal">{i.name}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{i.total_roteiros}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">{i.total_vendas}</td>
                        <td className="border-t border-slate-100 p-[10px] text-center text-graytext">
                          {i.ticket_medio_vendas != null ? brl(i.ticket_medio_vendas) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

          </section>
        )}

        <section id="s-imoveis" data-secao="imoveis" className="scroll-mt-20 space-y-6">
      {incorporadora && (
        <div>
          <SectionTitle>Lançamentos</SectionTitle>
          {launches?.some((l) => l.latitude != null && l.longitude != null) && (
            <div className="mb-3 overflow-hidden rounded-card border border-slate-200/70">
              <Map
                pins={launches
                  .filter((l) => l.latitude != null && l.longitude != null)
                  .map((l) => ({ lat: l.latitude, lng: l.longitude, label: l.name }))}
                height={260}
              />
            </div>
          )}
          <div className="space-y-2">
            {launches?.length === 0 && <p className="text-sm text-muted">Nenhum lançamento publicado ainda.</p>}
            {launches?.map((l) => {
              const total = l.av_launch_units?.length ?? 0;
              const disponiveis = (l.av_launch_units ?? []).filter((u) => u.status === "disponivel").length;
              return (
                <Link
                  key={l.id}
                  to={`/app/lancamentos/${l.id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm hover:border-slate-300"
                >
                  <span className="font-semibold text-charcoal">{l.name}</span>
                  <span className="text-graytext">{disponiveis}/{total} disponível(is)</span>
                </Link>
              );
            })}
          </div>
          <Link to="/app/lancamentos" className="mt-2 inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
            Gerenciar lançamentos →
          </Link>
        </div>
      )}

      <div>
        <SectionTitle>Portfólio</SectionTitle>
        <div className="space-y-2">
          {properties?.length === 0 && <p className="text-sm text-muted">Nenhum imóvel no portfólio ainda.</p>}
          {properties?.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-charcoal">{p.name}</span>
              <span className="text-graytext">{p.av_portfolio_units?.length ?? 0} unidade(s)</span>
            </div>
          ))}
        </div>
        <Link to="/app/portfolio" className="mt-2 inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal">
          Gerenciar portfólio →
        </Link>
      </div>

        </section>

        <section id="s-equipe" data-secao="equipe" className="scroll-mt-20 space-y-6">
      <div>
        <SectionTitle>Equipe</SectionTitle>
        <div className="overflow-hidden overflow-x-auto rounded-card border border-slate-200/70">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">Nome</th>
                <th className="bg-bg px-3.5 py-2.5 text-left text-caption font-semibold tracking-[.04em] text-muted uppercase">Papel</th>
              </tr>
            </thead>
            <tbody>
              {roster?.map((m) => (
                <tr key={m.user_id}>
                  <td className="border-t border-slate-100 p-[10px] text-charcoal">{m.full_name || m.email}</td>
                  <td className="border-t border-slate-100 p-[10px] text-graytext">{ROLE_LABELS[m.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {manage && <Invites orgId={org.id} role={role} onChange={onChange} />}
        </section>

        <section id="s-marca" data-secao="marca" className="scroll-mt-20 space-y-6">
      <OrgHeaderCard org={org} role={role} manage={manage} onChange={onChange} />
      <MarcaCard org={org} manage={manage} onChange={onChange} />

        </section>
      </div>
    </div>
  );
}

function FunnelBar({ counts, compact }) {
  const total = UNIT_STATUS_ORDER.reduce((sum, k) => sum + (counts[k] || 0), 0);
  if (!total) return compact ? <span className="text-caption text-graytext">—</span> : null;
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
                  className="rounded-full px-2.5 py-0.5 text-caption font-semibold"
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
          <span className="text-xs font-semibold text-slate-700">{d.total_roteiros}</span>
          <div className="flex h-20 w-full items-end">
            <div
              className="w-full rounded-t-[4px] bg-brand"
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
    <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-charcoal">{label}</span>
        <span className="shrink-0 text-caption text-graytext">{sublabel}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-light">
          <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-6 shrink-0 text-right text-caption font-semibold text-graytext">{value}</span>
      </div>
      <div className="mt-1 text-caption text-graytext">{foot}</div>
    </div>
  );
}

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

function Kpi({ label, value, foot }) {
  return (
    <div className="bg-white p-[15px]">
      <div className="text-[11px] font-semibold uppercase tracking-[.06em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-semibold">{value}</div>
      <div className="mt-0.5 text-caption text-graytext">{foot}</div>
    </div>
  );
}

// O banco recusa convite com papel acima do de quem convida
// (migrations_trava_papeis_organizacao.sql); a lista já não oferece.
const PAPEIS_CONVITE = [
  ["corretor", "Corretor", 1],
  ["coordenador", "Coordenador", 2],
  ["gerente", "Gerente", 3],
  ["diretor", "Diretor", 4],
];
const RANK_PAPEL = { corretor: 1, coordenador: 2, gerente: 3, diretor: 4 };

function Invites({ orgId, role: meuPapel }) {
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
      <div className="rounded-card border border-slate-200/70 bg-white p-4">
        <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-caption font-medium text-graytext">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
              className="mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-caption font-medium text-graytext">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 min-h-11 rounded-control border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
            >
              {PAPEIS_CONVITE.filter(([, , rank]) => rank <= (RANK_PAPEL[meuPapel] ?? 0)).map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-control min-h-11 bg-brand px-5 text-body-sm font-semibold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? "Gerando…" : "Gerar convite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-danger-text">{error}</p>}

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
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-bg p-2.5 text-sm">
      <span className="flex-1 text-charcoal">
        {invite.email} <span className="text-graytext">· {ROLE_LABELS[invite.role]}</span>
      </span>
      {invite.accepted_at ? (
        <span className="text-caption font-semibold text-success-text">aceito</span>
      ) : (
        <>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="min-h-9 rounded-[10px] bg-brand px-3 text-xs font-semibold text-white transition-all duration-200 hover:bg-brand-hover"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button onClick={onRemove} className="inline-flex min-h-9 items-center rounded-[10px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-danger-bg hover:text-danger-text">
            cancelar
          </button>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-6 mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase first:mt-0">{children}</h2>;
}

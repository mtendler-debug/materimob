import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";
import { geocodeAddress } from "../lib/geocode";
import { BookImporter } from "../components/BookImporter";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function brl(n) {
  return "R$ " + Math.round(n).toLocaleString("pt-BR");
}

function menorValor(launch) {
  const valores = launch.units.filter((u) => u.status !== "vendida" && u.table_value != null).map((u) => u.table_value);
  return valores.length ? Math.min(...valores) : null;
}

function capa(launch) {
  const cor = launch.color || "#0284C7";
  return launch.photo_urls?.[0]
    ? { background: `center/cover url(${launch.photo_urls[0]})` }
    : { background: `linear-gradient(135deg, ${cor}, ${cor}bb)` };
}

export default function Launches() {
  const { org, role } = useOrganization();
  const [launches, setLaunches] = useState(null);
  const [texto, setTexto] = useState("");
  const [orgFiltro, setOrgFiltro] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("av_launches")
      .select("*, av_launch_units(*), organizations(name)")
      .order("created_at", { ascending: false });
    setLaunches((data ?? []).map((l) => ({ ...l, units: l.av_launch_units })));
  }

  useEffect(() => {
    load();
  }, []);

  const incorporadoras = useMemo(
    () => [...new Set((launches ?? []).map((l) => l.organizations?.name).filter(Boolean))],
    [launches],
  );

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return (launches ?? []).filter((l) => {
      if (orgFiltro && l.organizations?.name !== orgFiltro) return false;
      if (!q) return true;
      return `${l.name} ${l.address ?? ""} ${l.organizations?.name ?? ""}`.toLowerCase().includes(q);
    });
  }, [launches, texto, orgFiltro]);

  const podePublicar = org && org.tipo === "incorporadora" && canManage(role);
  const [destaque, ...demais] = filtrados;
  const chip = "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 ease-out";

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1000px] px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Lançamentos</h1>
            <p className="mt-1.5 max-w-[60ch] text-base text-graytext">
              Empreendimentos publicados por qualquer incorporadora na plataforma. Qualquer corretor pode montar um roteiro de
              visita para um cliente a partir daqui.
            </p>
          </div>
          {podePublicar && (
            <div className="flex flex-wrap items-start gap-2">
              <Button onClick={() => setNovoAberto(true)}>+ Publicar lançamento</Button>
              <BookImporter kind="launch" ownerFields={{ organization_id: org.id }} onImported={load} />
            </div>
          )}
        </div>

        {launches !== null && launches.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <label className="flex min-h-[46px] min-w-[220px] flex-1 items-center gap-2 rounded-control border border-slate-200 bg-white px-3.5 text-muted transition-all duration-200 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Nome, endereço ou incorporadora"
                aria-label="Buscar lançamento"
                className="w-full min-w-0 bg-transparent text-body-sm text-charcoal outline-none placeholder:text-muted"
              />
            </label>
            {incorporadoras.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {["", ...incorporadoras].map((nome) => (
                  <button
                    key={nome || "todas"}
                    onClick={() => setOrgFiltro(nome)}
                    aria-pressed={orgFiltro === nome}
                    className={`${chip} ${
                      orgFiltro === nome
                        ? "border-charcoal bg-charcoal text-white"
                        : "border-slate-200 bg-white text-graytext hover:border-slate-300 hover:text-charcoal"
                    }`}
                  >
                    {nome || "Todas"}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {launches === null && <p className="mt-8 text-body-sm text-muted">Carregando…</p>}
        {launches?.length === 0 && (
          <div className="py-16 text-center text-graytext">
            <b className="mb-1.5 block text-body text-charcoal">Nenhum lançamento publicado ainda</b>
            <p className="text-body-sm">{podePublicar ? "Publique o primeiro para os corretores começarem a usar." : "Quando uma incorporadora publicar, ele aparece aqui."}</p>
          </div>
        )}
        {launches?.length > 0 && filtrados.length === 0 && (
          <div className="py-16 text-center text-graytext">
            <b className="mb-1.5 block text-body text-charcoal">Nenhum lançamento encontrado</b>
            <p className="text-body-sm">Tire um filtro ou mude a busca.</p>
          </div>
        )}

        {destaque && <LaunchDestaque launch={destaque} />}
        {demais.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demais.map((l) => (
              <LaunchCard key={l.id} launch={l} />
            ))}
          </div>
        )}
      </div>

      {podePublicar && (
        <NewLaunch
          open={novoAberto}
          onClose={() => setNovoAberto(false)}
          organizationId={org.id}
          onCreated={() => {
            setNovoAberto(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function contagens(launch) {
  return launch.units.reduce((acc, u) => ({ ...acc, [u.status]: (acc[u.status] ?? 0) + 1 }), {});
}

function LaunchDestaque({ launch }) {
  const counts = contagens(launch);
  const menor = menorValor(launch);

  return (
    <Link
      to={`/app/lancamentos/${launch.id}`}
      className="mt-6 grid overflow-hidden rounded-[26px] border border-slate-200/70 bg-white shadow-soft transition-all duration-200 ease-out hover:shadow-float md:grid-cols-[1.15fr_1fr]"
    >
      <div className="relative flex min-h-[170px] items-end p-[18px] md:min-h-[250px]" style={capa(launch)}>
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/50" />
        <span className="relative rounded-full bg-white/25 px-2.5 py-0.5 text-caption font-semibold text-white backdrop-blur-md">Mais recente</span>
      </div>
      <div className="grid content-center gap-2 p-6 md:p-7">
        {launch.organizations?.name && (
          <span className="justify-self-start rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">{launch.organizations.name}</span>
        )}
        <h2 className="text-[26px] leading-[1.1] font-bold tracking-[-0.035em] text-charcoal">{launch.name}</h2>
        {launch.address && <p className="text-body-sm text-graytext">{launch.address}</p>}
        {launch.summary && <p className="text-body-sm text-slate-700">{launch.summary}</p>}
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Contagens counts={counts} vazio={launch.units.length === 0} />
        </div>
        {menor != null && (
          <p className="mt-1 text-[20px] font-bold tracking-tight text-charcoal tabular-nums">
            <small className="mr-1 text-xs font-medium text-muted">a partir de</small>
            {brl(menor)}
          </p>
        )}
      </div>
    </Link>
  );
}

function LaunchCard({ launch }) {
  const counts = contagens(launch);
  const menor = menorValor(launch);

  return (
    <Link
      to={`/app/lancamentos/${launch.id}`}
      className="flex min-w-0 flex-row gap-3 rounded-[20px] border border-slate-200/70 bg-white p-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft sm:flex-col"
    >
      <div className="w-[92px] flex-none rounded-[14px] sm:h-[108px] sm:w-auto" style={capa(launch)} />
      <div className="grid min-w-0 flex-1 content-start gap-0.5 sm:px-2 sm:pb-1.5">
        <h3 className="text-base font-semibold tracking-tight text-charcoal">{launch.name}</h3>
        {launch.organizations?.name && <p className="text-body-sm text-graytext">{launch.organizations.name}</p>}
        {launch.address && <p className="text-body-sm text-graytext">{launch.address}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {menor != null ? <span className="font-bold tracking-tight text-charcoal tabular-nums">{brl(menor)}</span> : <span />}
          {launch.units.length === 0 ? (
            <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">Sem unidades</span>
          ) : (
            counts.disponivel > 0 && (
              <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-caption font-semibold text-success-text">{counts.disponivel} disponíveis</span>
            )
          )}
        </div>
      </div>
    </Link>
  );
}

function Contagens({ counts, vazio }) {
  if (vazio) return <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">sem unidades cadastradas</span>;
  const estilos = {
    disponivel: ["bg-success-bg text-success-text", "disponíveis"],
    reservada: ["bg-warning-bg text-warning-text", "reservadas"],
    vendida: ["bg-danger-bg text-danger-text", "vendidas"],
  };
  return Object.entries(counts).map(([status, n]) => (
    <span key={status} className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${estilos[status]?.[0] ?? "bg-light text-graytext"}`}>
      {n} {estilos[status]?.[1] ?? status}
    </span>
  ));
}

function NewLaunch({ open, onClose, organizationId, onCreated }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [summary, setSummary] = useState("");
  const [criteria, setCriteria] = useState("");
  const [unitCriteria, setUnitCriteria] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const trimmedAddress = address.trim();
    const geo = trimmedAddress ? await geocodeAddress(trimmedAddress) : null;
    await supabase.from("av_launches").insert({
      organization_id: organizationId,
      name: name.trim(),
      address: trimmedAddress || null,
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
      summary: summary.trim() || null,
      criteria: linesToArray(criteria),
      unit_criteria: linesToArray(unitCriteria),
    });
    setSaving(false);
    setName("");
    setAddress("");
    setSummary("");
    setCriteria("");
    setUnitCriteria("");
    onCreated();
  }

  const area = `${classesCampo} min-h-[96px] py-3`;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Publicar novo lançamento"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="novo-lancamento" disabled={saving || !name.trim()}>
            {saving ? "Publicando…" : "Publicar"}
          </Button>
        </>
      }
    >
      <form id="novo-lancamento" onSubmit={submit} className="space-y-3.5">
        <p className="text-body-sm text-graytext">Os corretores da plataforma passam a ver e a montar roteiros com ele.</p>
        <Input label="Nome do empreendimento" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Residencial Vila Verde" autoFocus />
        <Input label="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro" />
        <Input label="Resumo" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Ex.: 2 e 3 quartos" />
        <div>
          <label className="mb-1.5 block text-caption font-medium text-graytext">Critérios de avaliação (um por linha)</label>
          <textarea value={criteria} onChange={(e) => setCriteria(e.target.value)} rows={4} className={area} />
        </div>
        <div>
          <label className="mb-1.5 block text-caption font-medium text-graytext">Critérios das unidades (um por linha)</label>
          <textarea value={unitCriteria} onChange={(e) => setUnitCriteria(e.target.value)} rows={4} className={area} />
        </div>
      </form>
    </Modal>
  );
}

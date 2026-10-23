import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const STATUS_CLASSES = {
  disponivel: "bg-success-bg text-success-text",
  reservada: "bg-warning-bg text-warning-text",
  vendida: "bg-danger-bg text-danger-text",
};

function capa(cor) {
  const c = cor || "#0284C7";
  return { background: `linear-gradient(135deg, ${c}, ${c}bb)` };
}

export default function Showcase() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [properties, setProperties] = useState(null);
  const [launches, setLaunches] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const [{ data: orgData, error: orgError }, { data: props }, { data: launchData }] = await Promise.all([
      supabase.from("organizations").select("id, name, tipo").eq("id", id).single(),
      supabase.from("av_portfolio_properties").select("*, av_portfolio_units(*)").eq("organization_id", id).order("name"),
      supabase.from("av_launches").select("*, av_launch_units(*)").eq("organization_id", id).order("created_at", { ascending: false }),
    ]);
    if (orgError) {
      setError("Erro ao carregar organização: " + orgError.message);
      return;
    }
    setOrg(orgData);
    setProperties((props ?? []).map((p) => ({ ...p, units: p.av_portfolio_units })));
    setLaunches((launchData ?? []).map((l) => ({ ...l, units: l.av_launch_units })));
  }

  if (error) return <div className="p-6 text-sm text-danger-text">{error}</div>;
  if (!org || !properties || !launches) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[900px] px-4 py-6 pb-20 md:px-7">
        <Link to="/app/lancamentos" className="-ml-1 inline-flex min-h-9 items-center gap-0.5 px-1 text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Lançamentos
        </Link>
        <h1 className="mt-2 text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">{org.name}</h1>
        <span className="mt-2 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-sky-800">
          {org.tipo === "incorporadora" ? "Incorporadora" : "Imobiliária"}
        </span>

        {launches.length > 0 && (
          <>
            <h2 className="mt-9 mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">Lançamentos</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {launches.map((l) => (
                <LaunchCard key={l.id} launch={l} />
              ))}
            </div>
          </>
        )}

        {properties.length > 0 && (
          <>
            <h2 className="mt-9 mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">Portfólio</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </>
        )}

        {launches.length === 0 && properties.length === 0 && (
          <div className="py-16 text-center text-graytext">
            <b className="mb-1 block text-body text-charcoal">Nada publicado ainda</b>
            <p className="text-body-sm">Essa organização ainda não publicou nada na plataforma.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LaunchCard({ launch }) {
  const counts = launch.units.reduce((acc, u) => ({ ...acc, [u.status]: (acc[u.status] ?? 0) + 1 }), {});
  return (
    <Link
      to={`/app/lancamentos/${launch.id}`}
      className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-slate-200/70 bg-white p-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="h-[96px] rounded-[14px]" style={capa(launch.color)} />
      <div className="grid gap-1 px-2 pb-1.5">
        <p className="text-base font-semibold tracking-tight text-charcoal">{launch.name}</p>
        {launch.address && <p className="text-body-sm text-graytext">{launch.address}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(counts).map(([status, n]) => (
            <span key={status} className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_CLASSES[status]}`}>
              {n} {STATUS_LABELS[status].toLowerCase()}
            </span>
          ))}
          {launch.units.length === 0 && <span className="text-caption text-muted">sem unidades cadastradas</span>}
        </div>
      </div>
    </Link>
  );
}

function PropertyCard({ property }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-slate-200/70 bg-white p-2.5">
      <div className="h-[96px] rounded-[14px]" style={capa(property.color)} />
      <div className="grid gap-1 px-2 pb-1.5">
        <p className="text-base font-semibold tracking-tight text-charcoal">{property.name}</p>
        {property.address && <p className="text-body-sm text-graytext">{property.address}</p>}
        {property.summary && <p className="text-caption text-graytext">{property.summary}</p>}
        {property.units?.length > 0 && (
          <div className="mt-2 divide-y divide-slate-100">
            {property.units.map((u) => (
              <div key={u.id} className="flex justify-between gap-2 py-1.5 text-body-sm text-graytext">
                <span>{u.name}</span>
                {u.table_value != null && <span className="font-semibold text-slate-700 tabular-nums">{brl(u.table_value)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

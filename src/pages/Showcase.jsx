import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const STATUS_COLORS = {
  disponivel: { bg: "#E3F0E4", color: "#2E7D32" },
  reservada: { bg: "#FFF3E0", color: "#B26A00" },
  vendida: { bg: "#F1E4E0", color: "#B34A2E" },
};

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

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!org || !properties || !launches) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app/lancamentos" className="text-sm text-graytext underline">
          ← Lançamentos
        </Link>
        <h1 className="font-serif mt-3 text-[27px] font-semibold text-charcoal">{org.name}</h1>
        <p className="text-sm text-graytext">{org.tipo === "incorporadora" ? "Incorporadora" : "Imobiliária"}</p>

        {launches.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              Lançamentos
            </h2>
            <div className="space-y-3">
              {launches.map((l) => (
                <LaunchCard key={l.id} launch={l} />
              ))}
            </div>
          </>
        )}

        {properties.length > 0 && (
          <>
            <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              Portfólio
            </h2>
            <div className="space-y-3">
              {properties.map((p) => (
                <PropertyCard key={p.id} property={p} />
              ))}
            </div>
          </>
        )}

        {launches.length === 0 && properties.length === 0 && (
          <p className="mt-6 text-sm text-muted">Essa organização ainda não publicou nada na plataforma.</p>
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
      className="block rounded-[14px] border border-rule bg-white p-4 hover:border-gold"
      style={{ borderLeft: `5px solid ${launch.color || "#A68A5B"}` }}
    >
      <p className="font-serif font-semibold text-charcoal">{launch.name}</p>
      {launch.address && <p className="text-sm text-graytext">{launch.address}</p>}
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

function PropertyCard({ property }) {
  return (
    <div className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${property.color || "#A68A5B"}` }}>
      <p className="font-serif font-semibold text-charcoal">{property.name}</p>
      {property.address && <p className="text-sm text-graytext">{property.address}</p>}
      {property.summary && <p className="text-xs text-graytext">{property.summary}</p>}
      {property.units?.length > 0 && (
        <div className="mt-2 space-y-1">
          {property.units.map((u) => (
            <div key={u.id} className="flex justify-between text-sm text-graytext">
              <span>{u.name}</span>
              {u.table_value != null && <span>{brl(u.table_value)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

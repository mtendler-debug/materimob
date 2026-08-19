import { supabase } from "./supabase";

// Junta portfólio e lançamentos de toda a plataforma num formato comum —
// usado pela busca de imóveis (/app/imoveis) e pela curadoria da imobiliária
// (/app/time), que precisam da mesma lista pra escolher itens.
export async function loadCatalogItems() {
  const [{ data: portfolioData }, { data: launchData }] = await Promise.all([
    supabase.from("av_portfolio_properties").select("*, av_portfolio_units(*), organizations(id,name,tipo)").order("name"),
    supabase
      .from("av_launches")
      .select("*, av_launch_units(*), organizations(id,name,tipo)")
      .order("created_at", { ascending: false }),
  ]);

  const portfolioItems = (portfolioData ?? []).map((p) => ({
    kind: "portfolio",
    id: p.id,
    name: p.name,
    address: p.address,
    summary: p.summary,
    color: p.color,
    orgId: p.organizations?.id,
    orgName: p.organizations?.name,
    units: (p.av_portfolio_units ?? []).map((u) => ({ id: u.id, name: u.name, table_value: u.table_value })),
    raw: { ...p, units: p.av_portfolio_units },
  }));
  const launchItems = (launchData ?? []).map((l) => ({
    kind: "lancamento",
    id: l.id,
    name: l.name,
    address: l.address,
    summary: l.summary,
    color: l.color,
    orgId: l.organizations?.id,
    orgName: l.organizations?.name,
    units: (l.av_launch_units ?? []).map((u) => ({ id: u.id, name: u.name, table_value: u.table_value, status: u.status })),
    raw: { ...l, units: l.av_launch_units },
  }));
  return [...launchItems, ...portfolioItems];
}

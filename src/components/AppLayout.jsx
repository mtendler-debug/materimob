import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../lib/useProfile";
import { useOrganization, canManage } from "../lib/useOrganization";
import { useTenantBranding } from "../lib/tenantBranding";

// Único componente que monta o menu de /app e /admin — a partir do papel
// de quem está logado, não de uma lista fixa repetida em cada página.
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { accountType, isPlatformAdmin, hasCrmAccess, loading: loadingProfile } = useProfile();
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading: loadingOrg } = useOrganization();
  const marcaPortal = useTenantBranding();
  const location = useLocation();
  const [aviso, setAviso] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // AppLayout não remonta quando um RoleRoute interno redireciona (é o
  // mesmo componente de layout, só troca o que aparece no Outlet) — por
  // isso o aviso precisa reagir a mudanças de location, não só ao mount.
  useEffect(() => {
    if (location.state?.aviso) setAviso(location.state.aviso);
    setMobileOpen(false);
  }, [location]);

  // Quem entra por um portal de marca (ex. materimob.com.br/chaincorp) e
  // é membro daquela organização já atua "vestindo" ela, sem precisar
  // trocar manualmente em "Ver como".
  useEffect(() => {
    if (!marcaPortal || loadingOrg) return;
    const souMembro = memberships.some((m) => m.organizations.id === marcaPortal.id);
    if (souMembro && activeOrgId !== marcaPortal.id) setActiveOrgId(marcaPortal.id);
  }, [marcaPortal, loadingOrg, memberships, activeOrgId, setActiveOrgId]);

  // A marca da organização ativa (cores/logo) segue reskinando a sidebar
  // por cima da base pastel — funciona tanto vindo do portal com marca
  // quanto trocando em "Ver como".
  const marca = org?.cor_primaria || org?.cor_secundaria ? org : null;
  const corSidebar = marca?.cor_secundaria || undefined;
  const corDestaque = marca?.cor_primaria || undefined;

  if (loadingProfile || loadingOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  const pertenceOrg = memberships.length > 0;
  const gerenteIncorporadora = pertenceOrg && canManage(role) && org?.tipo === "incorporadora";
  const gerenteImobiliaria = pertenceOrg && canManage(role) && org?.tipo === "imobiliaria";
  const ehOrganizacao = accountType === "imobiliaria" || accountType === "incorporadora";

  const grupoAvaliador = {
    label: "Avaliador",
    itens: [
      { to: "/app", label: "Meus clientes", end: true },
      { to: "/app/desempenho", label: "Meu desempenho" },
      { to: "/app/imoveis", label: "Imóveis" },
      { to: "/app/portfolio", label: "Meu estoque" },
      { to: "/app/selecoes", label: "Meus roteiros" },
      { to: "/app/perfil", label: "Meu perfil" },
    ],
  };
  const grupoCrm = {
    label: "CRM",
    itens: [{ to: "/app/crm", label: hasCrmAccess ? "CRM" : "CRM 🔒" }],
  };
  const grupoParcerias = {
    label: "Parcerias",
    itens: [
      { to: "/app/parcerias/kanban", label: "Kanban" },
      { to: "/app/parcerias/parceiras", label: "Parceiras" },
      { to: "/app/parcerias/registros", label: "Registros" },
    ],
  };
  const itensOrg = [];
  if (pertenceOrg) itensOrg.push({ to: "/app/organizacao", label: "Minha organização" });
  if (gerenteIncorporadora) itensOrg.push({ to: "/app/estoque", label: "Estoque" });
  if (gerenteImobiliaria) itensOrg.push({ to: "/app/time", label: "Seleção do time" });
  const grupoOrg = pertenceOrg ? { label: "Organização", itens: itensOrg } : null;
  const grupoAdmin = isPlatformAdmin
    ? { label: "Administração", itens: [{ to: "/admin", label: "Administração" }] }
    : null;

  // Quando a casa é a organização, ela vem primeiro — mas "Meus clientes"
  // continua no menu, só desce dentro do grupo Avaliador. account_type
  // nunca esconde a carteira.
  const grupos = ehOrganizacao
    ? [grupoOrg, grupoAvaliador, grupoCrm, grupoParcerias, grupoAdmin]
    : [grupoAvaliador, grupoCrm, grupoOrg, grupoParcerias, grupoAdmin];

  const { grupoLabel, itemLabel } = breadcrumbAtual(grupos, location.pathname);

  return (
    <div className="min-h-screen bg-bg md:flex">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="text-[10.5px] font-bold tracking-[.2em] text-slate-800 uppercase">
          {marca?.nome_exibicao || marca?.name || "MaterImob"}
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-500 transition-colors hover:bg-slate-100"
        >
          ☰
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-none flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={corSidebar ? { background: corSidebar } : undefined}
      >
        <div className="space-y-2 px-5 pt-6 pb-4">
          <div className="text-[10.5px] font-bold tracking-[.2em] text-slate-800 uppercase">MaterImob</div>

          {/* Selo do cliente ativo — a organização em que o usuário está
              atuando agora, independente de ela ter cor própria configurada. */}
          {org && (
            <div
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-purple-200 bg-purple-100 px-2.5 py-1 text-[11px] font-semibold text-purple-800"
              style={corDestaque ? { background: "rgba(255,255,255,.16)", borderColor: "rgba(255,255,255,.3)", color: corSidebar ? "#fff" : undefined } : undefined}
              title={org.nome_exibicao || org.name}
            >
              {marca?.logo_url ? (
                <img src={marca.logo_url} alt="" className="h-3.5 max-w-[60px] object-contain" />
              ) : (
                <span className="truncate">{org.nome_exibicao || org.name}</span>
              )}
            </div>
          )}
        </div>

        {memberships.length > 1 && (
          <div className="px-5 pb-4">
            <select
              value={activeOrgId ?? ""}
              onChange={(e) => setActiveOrgId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 transition-colors focus:border-sky-300 focus:outline-none"
            >
              {memberships.map((m) => (
                <option key={m.organizations.id} value={m.organizations.id}>
                  Ver como: {m.organizations.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 px-3">
          {grupos
            .filter(Boolean)
            .filter((g) => g.itens.length > 0)
            .map((g) => (
              <div key={g.label} className="mb-5">
                <p className="mb-1.5 px-2 text-[9.5px] font-bold tracking-[.1em] text-slate-400 uppercase">{g.label}</p>
                {g.itens.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-[9px] py-2 text-[13.5px] font-semibold transition-colors ${
                        isActive
                          ? "bg-sky-100 text-sky-800"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                      }`
                    }
                    style={({ isActive }) =>
                      isActive && corDestaque ? { background: "rgba(255,255,255,.18)", color: corSidebar ? "#fff" : undefined } : undefined
                    }
                  >
                    {i.label}
                  </NavLink>
                ))}
              </div>
            ))}
        </nav>

        <div className="mt-auto border-t border-slate-200 px-5 py-4 text-[11px] text-slate-400">
          <p className="truncate text-slate-500">{user?.email}</p>
          <button onClick={signOut} className="mt-1 font-semibold text-slate-500 underline transition-colors hover:text-slate-800">
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur md:block">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-[12.5px] font-medium text-slate-400">
            <span>MaterImob</span>
            {grupoLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span>{grupoLabel}</span>
              </>
            )}
            {itemLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span className="text-slate-700">{itemLabel}</span>
              </>
            )}
          </nav>
        </header>

        {aviso && (
          <div className="flex items-center justify-center gap-2 border-b border-sky-200 bg-sky-100 px-6 py-2 text-center text-xs text-sky-800">
            {aviso}
            <button onClick={() => setAviso(null)} className="font-semibold underline transition-colors hover:text-sky-900">
              fechar
            </button>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

// Deriva "grupo / item" do menu a partir do caminho atual — sem precisar
// anotar cada rota com o próprio breadcrumb à parte.
function breadcrumbAtual(grupos, pathname) {
  for (const g of grupos.filter(Boolean)) {
    for (const i of g.itens) {
      if (i.end ? pathname === i.to : pathname.startsWith(i.to)) {
        return { grupoLabel: g.label, itemLabel: i.label };
      }
    }
  }
  return { grupoLabel: null, itemLabel: null };
}

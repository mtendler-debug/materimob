import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../lib/useProfile";
import { useOrganization, canManage } from "../lib/useOrganization";

// Único componente que monta o menu de /app e /admin — a partir do papel
// de quem está logado, não de uma lista fixa repetida em cada página.
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { accountType, isPlatformAdmin, hasCrmAccess, loading: loadingProfile } = useProfile();
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading: loadingOrg } = useOrganization();
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
    ? [grupoOrg, grupoAvaliador, grupoCrm, grupoAdmin]
    : [grupoAvaliador, grupoCrm, grupoOrg, grupoAdmin];

  return (
    <div className="min-h-screen bg-bg md:flex">
      <div className="flex items-center justify-between bg-charcoal px-4 py-3 text-white md:hidden">
        <span className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">MaterImob</span>
        <button onClick={() => setMobileOpen(true)} aria-label="Abrir menu" className="px-1 text-2xl leading-none">
          ☰
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-none flex-col overflow-y-auto bg-charcoal text-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 pt-6 pb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">MaterImob</div>
        </div>

        {memberships.length > 1 && (
          <div className="px-5 pb-4">
            <select
              value={activeOrgId ?? ""}
              onChange={(e) => setActiveOrgId(e.target.value)}
              className="w-full rounded-[9px] border border-[#444] bg-charcoal px-2 py-1.5 text-xs text-white"
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
                <p className="mb-1.5 px-2 text-[9.5px] font-bold tracking-[.1em] text-[#8A8477] uppercase">{g.label}</p>
                {g.itens.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.end}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-[8px] border-l-[2.5px] px-[9px] py-2 text-[13.5px] font-semibold ${
                        isActive
                          ? "border-gold bg-[#262220] text-white"
                          : "border-transparent text-[#CFC9BD] hover:text-white"
                      }`
                    }
                  >
                    {i.label}
                  </NavLink>
                ))}
              </div>
            ))}
        </nav>

        <div className="mt-auto border-t border-[#333] px-5 py-4 text-[11px] text-[#8A8477]">
          <p className="truncate text-[#B9B9B9]">{user?.email}</p>
          <button onClick={signOut} className="mt-1 underline hover:text-white">
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {aviso && (
          <div className="border-b border-rule bg-light px-6 py-2 text-center text-xs text-graytext">
            {aviso}{" "}
            <button onClick={() => setAviso(null)} className="ml-2 underline hover:text-charcoal">
              fechar
            </button>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../lib/useProfile";
import { useOrganization, canManage } from "../lib/useOrganization";

// Único componente que monta o menu de /app e /admin — a partir do papel
// de quem está logado, não de uma lista fixa repetida em cada página.
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { accountType, isPlatformAdmin, loading: loadingProfile } = useProfile();
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading: loadingOrg } = useOrganization();
  const location = useLocation();
  const [aviso, setAviso] = useState(null);

  // AppLayout não remonta quando um RoleRoute interno redireciona (é o
  // mesmo componente de layout, só troca o que aparece no Outlet) — por
  // isso o aviso precisa reagir a mudanças de location, não só ao mount.
  useEffect(() => {
    if (location.state?.aviso) setAviso(location.state.aviso);
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

  const itensBase = [
    { to: "/app", label: "Meus clientes", end: true },
    { to: "/app/desempenho", label: "Meu desempenho" },
    { to: "/app/imoveis", label: "Imóveis" },
    { to: "/app/portfolio", label: "Meu estoque" },
    { to: "/app/selecoes", label: "Meus roteiros" },
    { to: "/app/perfil", label: "Meu perfil" },
  ];
  const itensOrg = [];
  if (pertenceOrg) itensOrg.push({ to: "/app/organizacao", label: "Minha organização" });
  if (gerenteIncorporadora) itensOrg.push({ to: "/app/estoque", label: "Estoque" });
  if (gerenteImobiliaria) itensOrg.push({ to: "/app/time", label: "Seleção do time" });
  const itensAdmin = isPlatformAdmin ? [{ to: "/admin", label: "Administração" }] : [];

  // Quando a casa é a organização, ela vem primeiro — mas "Meus clientes"
  // continua no menu, só desce. account_type nunca esconde a carteira.
  const ehOrganizacao = accountType === "imobiliaria" || accountType === "incorporadora";
  const clientes = itensBase.find((i) => i.to === "/app");
  const restoBase = itensBase.filter((i) => i.to !== "/app");
  const itens = ehOrganizacao
    ? [...itensOrg, ...restoBase, clientes, ...itensAdmin]
    : [...itensBase, ...itensOrg, ...itensAdmin];

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-charcoal text-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-4">
          <div className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">
            Avaliador MaterImob
          </div>
          <div className="flex items-center gap-3">
            {memberships.length > 1 && (
              <select
                value={activeOrgId ?? ""}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="rounded-[9px] border border-[#444] bg-charcoal px-2 py-1 text-xs text-white"
              >
                {memberships.map((m) => (
                  <option key={m.organizations.id} value={m.organizations.id}>
                    Ver como: {m.organizations.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-[#B9B9B9]">{user?.email}</span>
            <button onClick={signOut} className="text-sm text-[#B9B9B9] underline hover:text-white">
              Sair
            </button>
          </div>
        </div>
        <nav className="border-t border-[#333]">
          <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-6">
            {itens.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-[2.5px] px-3 py-3 text-[13.5px] font-semibold ${
                    isActive ? "border-gold text-white" : "border-transparent text-[#B9B9B9] hover:text-white"
                  }`
                }
              >
                {i.label}
              </NavLink>
            ))}
          </div>
        </nav>
        {aviso && (
          <div className="border-t border-[#333] bg-[#2A2A2A] px-6 py-2 text-center text-xs text-[#C9C9C9]">
            {aviso}{" "}
            <button onClick={() => setAviso(null)} className="ml-2 underline hover:text-white">
              fechar
            </button>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}

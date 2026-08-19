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
    { to: "/app/imoveis", label: "Imóveis" },
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
      <header className="border-b border-rule bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-bold text-charcoal">Avaliador MaterImob</span>
            <nav className="flex flex-wrap items-center gap-3">
              {itens.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    `text-sm underline ${isActive ? "font-bold text-charcoal" : "text-graytext"}`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {memberships.length > 1 && (
              <select
                value={activeOrgId ?? ""}
                onChange={(e) => setActiveOrgId(e.target.value)}
                className="rounded-[9px] border-[1.5px] border-rule bg-white px-2 py-1 text-xs"
              >
                {memberships.map((m) => (
                  <option key={m.organizations.id} value={m.organizations.id}>
                    Ver como: {m.organizations.name}
                  </option>
                ))}
              </select>
            )}
            <span className="text-xs text-muted">{user?.email}</span>
            <button onClick={signOut} className="text-sm text-graytext underline">
              Sair
            </button>
          </div>
        </div>
        {aviso && (
          <div className="border-t border-rule bg-light px-6 py-2 text-center text-xs text-graytext">
            {aviso}{" "}
            <button onClick={() => setAviso(null)} className="ml-2 underline">
              fechar
            </button>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}

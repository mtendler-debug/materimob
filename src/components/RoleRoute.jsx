import { Navigate } from "react-router-dom";
import { useOrganization, canManage } from "../lib/useOrganization";
import { useProfile, homeForAccountType } from "../lib/useProfile";

// Não basta esconder o item do menu — quem digita a URL na mão também tem
// que ser barrado. Quem não passa vai para a própria casa, não para uma
// tela de erro.
export function RoleRoute({ exige, children }) {
  const { memberships, org, role, loading: loadingOrg } = useOrganization();
  const { accountType, isPlatformAdmin, loading: loadingProfile } = useProfile();

  if (loadingOrg || loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  let permitido = false;
  if (exige === "organizacao") permitido = memberships.length > 0;
  else if (exige === "imobiliaria-gerente") permitido = canManage(role) && org?.tipo === "imobiliaria";
  else if (exige === "admin") permitido = isPlatformAdmin;

  if (!permitido) {
    return (
      <Navigate
        to={homeForAccountType(accountType)}
        replace
        state={{ aviso: "Você não tem acesso a essa área." }}
      />
    );
  }

  return children;
}

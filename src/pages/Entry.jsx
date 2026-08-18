import { Navigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useOrganization, canManage } from "../lib/useOrganization";

function Placeholder({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-muted">Avaliador MaterImob</p>
        <h1 className="mt-2 text-xl font-bold text-charcoal">{label}</h1>
      </div>
    </div>
  );
}

// Ponto único de entrada: decide, a partir do papel do usuário, pra qual
// painel ele vai — sem isso, todo mundo caía direto em "Minhas seleções"
// e gestor de organização só descobria a tela de Organização clicando num
// link no canto.
export default function Entry() {
  const { user, loading: loadingAuth } = useAuth();
  const { org, role, loading: loadingOrg } = useOrganization();

  if (loadingAuth) return <Placeholder label="Carregando…" />;
  if (!user) return <Navigate to="/entrar" replace />;
  if (loadingOrg) return <Placeholder label="Carregando…" />;

  if (!org && !user.user_metadata?.onboarded) {
    return <RoleChooser />;
  }

  if (org && canManage(role)) {
    return <Navigate to="/app/organizacao" replace />;
  }

  return <Navigate to="/app" replace />;
}

function RoleChooser() {
  async function markOnboarded() {
    await supabase.auth.updateUser({ data: { onboarded: true } });
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-wide text-muted">Avaliador MaterImob</p>
        <h1 className="mt-1 text-xl font-medium text-charcoal">Como você atua no mercado imobiliário?</h1>
        <div className="mt-4 space-y-2">
          <button
            onClick={markOnboarded}
            className="block w-full rounded-md border border-rule bg-white p-4 text-left text-sm hover:border-gold"
          >
            <span className="font-medium text-charcoal">Corretor autônomo</span>
            <span className="block text-graytext">
              Vou usar o Avaliador direto com meus clientes, sem organização.
            </span>
          </button>
          <button
            onClick={markOnboarded}
            className="block w-full rounded-md border border-rule bg-white p-4 text-left text-sm hover:border-gold"
          >
            <span className="font-medium text-charcoal">Corretor de uma imobiliária ou construtora</span>
            <span className="block text-graytext">
              Peça pra quem te convidou o link de convite — assim que você abrir esse link, entra
              automaticamente na organização. Enquanto isso, pode usar o Avaliador normalmente.
            </span>
          </button>
          <Link
            to="/app/organizacao"
            className="block w-full rounded-md border border-rule bg-white p-4 text-left text-sm hover:border-gold"
          >
            <span className="font-medium text-charcoal">Sou gestor de uma imobiliária ou incorporadora</span>
            <span className="block text-graytext">Crie a organização e convide o resto do time.</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

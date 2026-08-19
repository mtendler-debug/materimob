import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile, homeForAccountType } from "../lib/useProfile";
import Landing from "./Landing";

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

// Ponto único de entrada: decide, a partir do account_type do usuário, pra
// qual painel ele vai. Ser admin da plataforma não muda a casa de ninguém —
// /admin é uma escolha no menu, não uma casa.
export default function Entry() {
  const { user, loading: loadingAuth } = useAuth();
  const { accountType, loading: loadingProfile } = useProfile();

  if (loadingAuth) return <Placeholder label="Carregando…" />;
  if (!user) return <Landing />;
  if (loadingProfile) return <Placeholder label="Carregando…" />;

  return <Navigate to={homeForAccountType(accountType)} replace />;
}

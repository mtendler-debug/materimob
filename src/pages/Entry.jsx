import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile, homeForAccountType } from "../lib/useProfile";
import { useTenantBranding } from "../lib/tenantBranding";
import { useAcessoCanal } from "../lib/AcessoCanal";
import Landing from "./Landing";

function Placeholder({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-muted">MaterImob</p>
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
  const marca = useTenantBranding();
  const { acesso } = useAcessoCanal();

  if (loadingAuth) return <Placeholder label="Carregando…" />;
  // Num portal com marca (ex. materimob.com.br/chaincorp), quem chega
  // deslogado é time convidado, não lead de marketing — vai direto pro
  // login em vez da página de vendas do MaterImob. marca === undefined
  // enquanto resolve o slug; espera pra não piscar a Landing à toa.
  if (!user) {
    if (marca === undefined) return <Placeholder label="Carregando…" />;
    return marca ? <Navigate to="/entrar" replace /> : <Landing />;
  }
  if (loadingProfile || acesso === undefined) return <Placeholder label="Carregando…" />;

  // Quem pediu acesso à Academia entra por ela; o resto do app continua no menu.
  if (acesso) return <Navigate to="/app/academia" replace />;

  return <Navigate to={homeForAccountType(accountType)} replace />;
}

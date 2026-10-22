import { Navigate, Outlet } from "react-router-dom";
import { useProfile } from "../lib/useProfile";
import { useAcessoCanal } from "../lib/AcessoCanal";

// Trava as telas de um módulo desligado para a conta (Administração > Módulos).
// Só esconde e bloqueia a TELA: os links públicos que o corretor já mandou aos
// clientes (/c, /r, /cliente, /p) não passam por aqui e seguem abrindo.
// Quem cai numa tela desligada vai para o primeiro lugar que ainda tem.
export default function ModuloRoute({ modulo }) {
  const { modulos, hasCrmAccess, loading } = useProfile();
  const { acesso } = useAcessoCanal();

  if (loading || acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (modulos[modulo]) return <Outlet />;

  const destino = acesso ? "/app/academia" : hasCrmAccess ? "/app/crm" : "/app/perfil";
  return <Navigate to={destino} replace />;
}

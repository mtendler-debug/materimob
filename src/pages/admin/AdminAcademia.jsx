import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { usePendentesAcesso } from "../../lib/usePendentesAcesso";

// Academia de Vendas dentro da Administração: pedidos de acesso e sugestões de
// argumentos. As duas listas pedem uma decisão do dono, e cada decisão atualiza
// os números daqui e os da aba "Academia" do AdminLayout.
export default function AdminAcademia() {
  const ctx = useOutletContext();
  const { pendentes, sugestoes, recarregar } = usePendentesAcesso();

  async function contarPendentes() {
    await Promise.all([recarregar(), ctx?.contarPendentes?.()]);
  }

  return (
    <div>
      <nav className="flex flex-wrap gap-1.5" aria-label="Academia">
        <Sub to="/admin/academia" end>
          Visão geral
        </Sub>
        <Sub to="/admin/academia/corretores">Corretores</Sub>
        <Sub to="/admin/academia/acessos" badge={pendentes}>
          Acessos
        </Sub>
        <Sub to="/admin/academia/sugestoes" badge={sugestoes}>
          Sugestões de argumentos
        </Sub>
        <Sub to="/admin/academia/avisos">Avisos</Sub>
      </nav>
      <Outlet context={{ contarPendentes }} />
    </div>
  );
}

function Sub({ to, end, badge, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold ${
          isActive ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-600"
        }`
      }
    >
      {children}
      {badge > 0 && <span className="rounded-full bg-amber-100 px-[7px] text-[11px] font-bold text-amber-800">{badge}</span>}
    </NavLink>
  );
}

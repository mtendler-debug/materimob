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
        <Sub to="/admin/academia/conteudo">Conteúdo</Sub>
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
        `flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 ${
          isActive ? "border-charcoal bg-charcoal text-white" : "border-slate-200 bg-white text-graytext hover:border-slate-300 hover:text-charcoal"
        }`
      }
    >
      {children}
      {badge > 0 && <span className="rounded-full bg-warning-bg px-[7px] text-[11px] font-semibold text-warning-text">{badge}</span>}
    </NavLink>
  );
}

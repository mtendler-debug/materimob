import { NavLink, Outlet } from "react-router-dom";
import { usePendentesAcesso } from "../../lib/usePendentesAcesso";

export default function AdminLayout() {
  const { pendentes, sugestoes, recarregar: contarPendentes } = usePendentesAcesso();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1100px] px-4 py-7 md:px-7">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Administração</h1>
        <p className="mt-1.5 max-w-[66ch] text-base text-graytext">
          Painel do time MaterImob: números agregados e gestão de organizações, contas e da Academia de Vendas. Nunca
          mostra conteúdo de avaliação nem contato de cliente final.
        </p>
        <nav className="-mx-2.5 mt-[18px] flex gap-0.5 overflow-x-auto border-b border-slate-200 px-2.5">
          <Tab to="/admin" end>
            Visão geral
          </Tab>
          <Tab to="/admin/organizacoes">Organizações</Tab>
          <Tab to="/admin/contas">Contas</Tab>
          <Tab to="/admin/modulos">Módulos</Tab>
          <Tab to="/admin/academia" badge={pendentes + sugestoes}>
            Academia
          </Tab>
        </nav>
        <div className="mt-5">
          <Outlet context={{ contarPendentes }} />
        </div>
      </div>
    </div>
  );
}

function Tab({ to, end, badge, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex min-h-[46px] flex-none items-center gap-1.5 px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
          isActive
            ? "text-charcoal after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-brand"
            : "text-graytext hover:text-charcoal"
        }`
      }
    >
      {children}
      {badge > 0 && <span className="rounded-full bg-warning-bg px-[7px] text-[11px] font-semibold text-warning-text">{badge}</span>}
    </NavLink>
  );
}

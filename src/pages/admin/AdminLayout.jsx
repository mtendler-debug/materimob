import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-[26px] font-semibold text-charcoal">Administração</h1>
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-graytext">
          Painel do time MaterImob — números agregados e gestão de organizações e contas. Nunca
          mostra conteúdo de avaliação nem contato de cliente final.
        </p>
        <nav className="mt-4 flex gap-5 border-b border-rule">
          <Tab to="/admin" end>
            Visão geral
          </Tab>
          <Tab to="/admin/organizacoes">Organizações</Tab>
          <Tab to="/admin/contas">Contas</Tab>
        </nav>
        <div className="mt-5">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function Tab({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `border-b-2 pb-2 text-sm font-bold ${
          isActive ? "border-gold text-charcoal" : "border-transparent text-graytext"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

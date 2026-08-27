import { NavLink, Outlet } from "react-router-dom";

export default function CrmLayout() {
  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-[26px] font-semibold text-charcoal">CRM</h1>
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-graytext">
          Seu funil de leads e oportunidades — um lead pode gerar mais de um negócio ao mesmo tempo
          (ex.: comprar um imóvel novo e vender o atual).
        </p>
        <nav className="mt-4 flex gap-5 border-b border-rule">
          <Tab to="/app/crm" end>
            Painel
          </Tab>
          <Tab to="/app/crm/pipeline">Pipeline</Tab>
          <Tab to="/app/crm/leads">Leads</Tab>
          <Tab to="/app/crm/oportunidades">Oportunidades</Tab>
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

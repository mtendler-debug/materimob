import { NavLink, Outlet } from "react-router-dom";
import { usePendentesAcesso } from "../../lib/usePendentesAcesso";

export default function ParceriasLayout() {
  const { pendentes, recarregar: contarPendentes } = usePendentesAcesso();

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-6 pt-6">
        <h1 className="font-serif text-[27px] font-semibold text-charcoal">Parcerias</h1>
        <p className="mt-1 text-sm text-graytext">Canal de imobiliárias parceiras da Chaincorp.</p>
        <nav className="mt-4 flex gap-2 border-b border-rule">
          {[
            { to: "/app/parcerias/kanban", label: "Kanban" },
            { to: "/app/parcerias/parceiras", label: "Parceiras" },
            { to: "/app/parcerias/registros", label: "Registros" },
            { to: "/app/parcerias/acessos", label: "Acessos", badge: pendentes },
          ].map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-bold ${
                  isActive ? "border-gold text-charcoal" : "border-transparent text-graytext hover:text-charcoal"
                }`
              }
            >
              {i.label}
              {i.badge > 0 && (
                <span className="rounded-full bg-amber-100 px-[7px] text-[11px] font-bold text-amber-800">{i.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="px-6 pb-10">
        <Outlet context={{ contarPendentes }} />
      </div>
    </div>
  );
}

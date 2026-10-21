import { NavLink, Outlet, useOutletContext } from "react-router-dom";

// Editor de conteúdo da Academia: o dono altera projetos (kits), trilhas e
// argumentos sem depender de ninguém. Toda gravação passa pela RLS do dono.
export default function ConteudoAcademia() {
  const ctx = useOutletContext();
  return (
    <div className="mt-4">
      <nav className="flex gap-1.5" aria-label="Conteúdo">
        {[
          ["projetos", "Projetos"],
          ["trilhas", "Trilhas"],
          ["argumentos", "Argumentos"],
        ].map(([to, rotulo]) => (
          <NavLink
            key={to}
            to={`/admin/academia/conteudo/${to}`}
            className={({ isActive }) =>
              `rounded-full border px-3 py-1 text-[12.5px] font-semibold ${
                isActive ? "border-slate-700 bg-slate-700 text-white" : "border-rule bg-white text-slate-600"
              }`
            }
          >
            {rotulo}
          </NavLink>
        ))}
      </nav>
      <Outlet context={ctx} />
    </div>
  );
}

import { NavLink } from "react-router-dom";

// Itens da Academia: fonte única do menu lateral e da barra de abas do celular.
// "to" ausente = ainda sem tela (etiqueta "em breve"). As fases A2 a A5 vão
// preenchendo os caminhos.
export const MENU_ACADEMIA = [
  { label: "Início", curto: "Início", to: "/app/academia", end: true, icone: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { label: "Projetos", curto: "Projetos", to: "/app/academia/projetos", icone: "M4 21V8l8-4 8 4v13M9 21v-5h6v5M8 11h2M14 11h2" },
  { label: "Treinamento", curto: "Treino", to: "/app/academia/treinamento", icone: "M3 9l9-4 9 4-9 4zM7 11v5c0 1 2.2 2.5 5 2.5s5-1.5 5-2.5v-5" },
  { label: "Argumentos", curto: "Argumentos", to: "/app/academia/argumentos", icone: "M4 5h16v11H9l-5 4z" },
  { label: "Clientes registrados", curto: "Clientes", to: "/app/academia/clientes", icone: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c1.8.8 3 2.6 3 5M12 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { label: "Minha equipe", to: "/app/academia/equipe", soGestor: true, icone: "" },
];

function Icone({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// Só no celular: as 5 áreas da Academia ao alcance do polegar.
export default function AcademiaTabBar() {
  return (
    <nav
      aria-label="Academia"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-300 bg-white px-1 pt-1.5 pb-2.5 md:hidden"
    >
      {MENU_ACADEMIA.filter((i) => !i.soGestor).map((i) =>
        i.to ? (
          <NavLink
            key={i.label}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              `grid justify-items-center gap-0.5 text-[10.5px] font-semibold ${isActive ? "text-sky-700" : "text-slate-500"}`
            }
          >
            <Icone d={i.icone} />
            {i.curto}
          </NavLink>
        ) : (
          <span
            key={i.label}
            aria-disabled="true"
            title="em breve"
            className="grid justify-items-center gap-0.5 text-[10.5px] font-semibold text-slate-400 opacity-70"
          >
            <Icone d={i.icone} />
            {i.curto}
          </span>
        ),
      )}
    </nav>
  );
}

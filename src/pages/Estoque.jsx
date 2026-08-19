import { useState } from "react";
import Launches from "./Launches";
import Portfolio from "./Portfolio";

// Reúne, em abas, o que já existia como duas páginas soltas — Launches.jsx
// e Portfolio.jsx continuam exatamente como estão, só a entrada muda. É a
// casa da incorporadora.
export default function Estoque() {
  const [aba, setAba] = useState("lancamentos");

  return (
    <div>
      <div className="border-b border-rule bg-white px-6 pt-5">
        <div className="mx-auto flex max-w-3xl gap-4">
          <Tab active={aba === "lancamentos"} onClick={() => setAba("lancamentos")}>
            Lançamentos
          </Tab>
          <Tab active={aba === "portfolio"} onClick={() => setAba("portfolio")}>
            Portfólio
          </Tab>
        </div>
      </div>
      {aba === "lancamentos" ? <Launches /> : <Portfolio />}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 pb-3 text-sm font-bold ${active ? "border-gold text-charcoal" : "border-transparent text-graytext"}`}
    >
      {children}
    </button>
  );
}

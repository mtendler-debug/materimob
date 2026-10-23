// Peças visuais comuns aos editores de conteúdo da Academia.
export const campoCls =
  "mt-1 w-full rounded-control border border-slate-200/70 bg-white px-[10px] py-[8px] text-sm text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none";

export const btnEscuro = "rounded-control bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
export const btnVerde = "rounded-control bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";
export const btnLinha = "rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700 disabled:opacity-50";
export const btnPerigo = "rounded-[10px] border border-rose-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-danger-text disabled:opacity-50";

export function Campo({ id, rotulo, dica, children }) {
  return (
    <div className="mt-2.5">
      <label htmlFor={id} className="block text-xs font-medium text-graytext">
        {rotulo}
      </label>
      {children}
      {dica && <p className="mt-1 text-[11.5px] text-muted">{dica}</p>}
    </div>
  );
}

export function Cartao({ titulo, children }) {
  return (
    <section className="mt-3 rounded-card border border-slate-200/70 bg-white p-3.5">
      {titulo && <h3 className="text-sm font-bold text-charcoal">{titulo}</h3>}
      {children}
    </section>
  );
}

export function Interruptor({ marcado, onChange, rotulo }) {
  return (
    <label className="relative inline-block h-[22px] w-[38px] flex-none cursor-pointer" title={marcado ? "Ligado" : "Desligado"}>
      <input type="checkbox" checked={marcado} onChange={(e) => onChange(e.target.checked)} aria-label={rotulo} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-800 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-sky-700" />
      <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
    </label>
  );
}

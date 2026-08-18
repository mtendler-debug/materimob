function d2n(s) {
  const [y, m, d] = String(s).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Cronograma: marcos gerais (faixa de cima) + fases por imóvel (faixa de baixo).
// Usado tanto no painel público (leitura) quanto na tela do corretor —
// mesmo componente, para garantir que os dois sempre mostram os mesmos dados.
export function Gantt({ milestones, properties }) {
  const marcos = (milestones ?? []).filter((m) => m.inicio && m.fim);
  const all = [];
  marcos.forEach((m) => all.push(d2n(m.inicio), d2n(m.fim)));
  properties.forEach((p) => (p.phases ?? []).forEach((f) => f.inicio && f.fim && all.push(d2n(f.inicio), d2n(f.fim))));

  if (!all.length) {
    return (
      <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
        <div className="rounded-[14px] bg-white p-6 text-center text-[13.5px] text-muted">
          Cronograma ainda não definido.
        </div>
      </div>
    );
  }

  let min = Math.min(...all);
  let max = Math.max(...all);
  const pad = (max - min) * 0.06 + 172800000;
  min -= pad;
  max += pad;
  const span = max - min;
  const pct = (t) => ((t - min) / span) * 100;

  const months = [];
  const cursor = new Date(min);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= max) {
    if (cursor.getTime() >= min) {
      months.push({ left: pct(cursor.getTime()), label: cursor.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }) });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const hoje = Date.now();
  const todayPct = hoje > min && hoje < max ? pct(hoje) : null;

  function Bar({ inicio, fim, cor, label }) {
    const a = pct(d2n(inicio));
    const b = pct(d2n(fim) + 86400000);
    return (
      <div
        className="absolute top-[2px] h-4 overflow-hidden rounded-[5px] px-[6px] text-[10px] leading-4 font-semibold whitespace-nowrap text-white"
        style={{ left: `${a}%`, width: `${Math.max(b - a, 1.2)}%`, background: cor }}
        title={label}
      >
        {label}
      </div>
    );
  }

  function Lane({ label, children }) {
    return (
      <div className="flex min-h-8 items-center">
        <div className="w-[190px] flex-none pr-3 text-xs font-semibold">{label}</div>
        <div className="relative h-5 flex-1">
          {todayPct != null && (
            <div className="absolute -top-[6px] -bottom-[6px] z-[3] w-[2px] bg-[#B34A2E]" style={{ left: `${todayPct}%` }} />
          )}
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="min-w-[660px] overflow-x-auto">
        <div className="flex items-center">
          <div className="w-[190px] flex-none" />
          <div className="relative h-4 flex-1 text-[10px] text-muted">
            {months.map((m, i) => (
              <span key={i} className="absolute border-l border-rule pl-1" style={{ left: `${m.left}%` }}>
                {m.label}
              </span>
            ))}
          </div>
        </div>
        {marcos.length > 0 && (
          <>
            <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted">Etapas do processo</div>
            {marcos.map((m) => (
              <Lane key={m.nome} label={m.nome}>
                <Bar inicio={m.inicio} fim={m.fim} cor="#A68A5B" label="" />
              </Lane>
            ))}
          </>
        )}
        <div className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted">Imóveis</div>
        {properties.map((p) => (
          <Lane key={p.id} label={p.name}>
            {(p.phases ?? [])
              .filter((f) => f.inicio && f.fim)
              .map((f, i) => (
                <Bar key={i} inicio={f.inicio} fim={f.fim} cor={p.color || "#5C5C5C"} label={f.nome} />
              ))}
          </Lane>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-[14px] text-[11.5px] text-graytext">
        {marcos.length > 0 && (
          <span>
            <i className="mr-[5px] inline-block h-[10px] w-[10px] rounded-[3px] align-[-1px]" style={{ background: "#A68A5B" }} />
            etapas do processo
          </span>
        )}
        {properties.map((p) => (
          <span key={p.id}>
            <i className="mr-[5px] inline-block h-[10px] w-[10px] rounded-[3px] align-[-1px]" style={{ background: p.color || "#5C5C5C" }} />
            {p.name}
          </span>
        ))}
        <span>
          <i className="mr-[5px] inline-block h-[10px] w-[3px] align-[-1px]" style={{ background: "#B34A2E" }} />
          hoje
        </span>
      </div>
    </div>
  );
}

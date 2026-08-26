import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import { loadDraft, saveDraft, evalKey } from "../lib/draftStore";
import { PropertyMedia } from "../components/PropertyMedia";

const STAGES = [
  { key: "a-visitar", label: "A visitar", chipBg: "#FFF3E0", chipColor: "#B26A00" },
  { key: "visitado", label: "Visitado", chipBg: "#E3F0E4", chipColor: "#2E7D32" },
  { key: "negociacao", label: "Em negociação", chipBg: "#E3EDF8", chipColor: "#1565C0" },
  { key: "descartado", label: "Descartado", chipBg: "#F1E4E0", chipColor: "#B34A2E" },
];

function Chip({ children, bg, color }) {
  return (
    <span
      className="rounded-full px-[11px] py-[5px] text-[11px] font-bold"
      style={{ background: bg ?? "#EDEAE4", color: color ?? "#5C5C5C" }}
    >
      {children}
    </span>
  );
}

function share(token) {
  const url = `${window.location.origin}${token ? "/c/" + token : "/"}`;
  const text = "Avaliação dos imóveis que estamos vendo. Dá uma olhada e deixa sua nota: ";
  if (navigator.share) {
    navigator.share({ title: "Avaliação de imóveis", text, url }).catch(() => {});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(text + url), "_blank");
  }
}

export default function PublicForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState("funnel"); // funnel | form | choose-unit | done
  const [current, setCurrent] = useState(null); // { property, unitId }
  const [doneMsg, setDoneMsg] = useState("");
  const [draft, setDraft] = useState(() => loadDraft(token));

  useEffect(() => {
    setLoading(true);
    callFunction("aval-form", { params: { token } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        const cached = loadDraft(token).cfgCache;
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }
        setError(err);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (data) {
      const d = { ...draft, cfgCache: data };
      setDraft(d);
      saveDraft(token, d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  function persist(next) {
    setDraft(next);
    saveDraft(token, next);
  }

  if (loading) return <Centered>Carregando…</Centered>;

  if (error) {
    const msg =
      error.status === 403
        ? "Esta avaliação foi encerrada. O formulário não está mais recebendo respostas."
        : "Este link não é válido ou foi substituído. Peça um link novo à consultoria.";
    return (
      <Shell title="Avaliador Materimob" subtitle="">
        <div className="mt-5 rounded-xl bg-light p-[14px] text-[12.5px] text-graytext">{msg}</div>
      </Shell>
    );
  }

  if (view === "done") {
    return (
      <Shell title={data.title} subtitle={data.subtitle}>
        <div className="mt-6 text-center">
          <div className="mx-auto my-6 flex h-[66px] w-[66px] items-center justify-center rounded-full bg-light text-[28px] text-gold">✓</div>
          <h2 className="font-serif text-[21px] font-semibold text-charcoal">Avaliação enviada</h2>
          <p className="mx-auto mt-2 mb-6 max-w-xs text-[14.5px] text-graytext">{doneMsg}</p>
          <button
            onClick={() => setView("funnel")}
            className="w-full rounded-[11px] bg-charcoal px-[18px] py-[13px] text-[15px] font-bold text-white"
          >
            Avaliar outro imóvel
          </button>
          <div className="h-[10px]" />
          <button
            onClick={() => share(token)}
            className="w-full rounded-[11px] border-[1.5px] border-rule bg-white px-[18px] py-[13px] text-[15px] font-bold text-charcoal"
          >
            Compartilhar com outra pessoa
          </button>
          <p className="mt-6 text-[11px] text-muted">
            Obrigado! Suas impressões ajudam a afinar a busca.
          </p>
        </div>
      </Shell>
    );
  }

  if (view === "choose-unit" && current) {
    return (
      <Shell title={data.title} subtitle={data.subtitle}>
        <ChooseUnit
          property={current.property}
          draft={draft}
          onBack={() => setView("funnel")}
          onChoose={(unitId) => {
            setCurrent({ property: current.property, unitId });
            setView("form");
          }}
        />
      </Shell>
    );
  }

  if (view === "form" && current) {
    return (
      <Shell title={data.title} subtitle={data.subtitle}>
        <EvaluationForm
          token={token}
          property={current.property}
          unitId={current.unitId}
          criteria={data.criteria}
          unitCriteria={data.unit_criteria}
          draft={draft}
          onPersist={persist}
          onBack={() => setView(current.unitId ? "choose-unit" : "funnel")}
          onDone={(msg) => {
            setDoneMsg(msg);
            setView("done");
          }}
        />
      </Shell>
    );
  }

  return (
    <Shell title={data.title} subtitle={data.subtitle}>
      <div className="mt-5 rounded-xl bg-light p-[14px] text-[12.5px] text-graytext">
        <b className="text-charcoal">Como funciona.</b> Primeiro você avalia o empreendimento em
        geral, depois cada unidade que visitou — são notas diferentes, porque gostar do prédio e
        gostar de uma unidade específica não é a mesma coisa. Leva poucos minutos por imóvel e o
        que escrever fica salvo neste celular, mesmo sem internet.
      </div>

      <Funnel
        properties={data.properties}
        draft={draft}
        onOpen={(property) => {
          const geralDone = draft.ans?.[evalKey(property.id, "")]?.sent;
          if (!geralDone) {
            setCurrent({ property, unitId: "" });
            setView("form");
          } else if (property.units?.length > 0) {
            setCurrent({ property, unitId: null });
            setView("choose-unit");
          } else {
            setCurrent({ property, unitId: "" });
            setView("form");
          }
        }}
      />

      <button
        onClick={() => share(token)}
        className="mt-3 w-full rounded-[11px] border-[1.5px] border-rule bg-white px-[18px] py-[13px] text-[15px] font-bold text-charcoal"
      >
        Compartilhar este link
      </button>
      <p className="py-[22px] text-center text-[11px] text-muted">
        Suas respostas vão direto para a consultoria. Nada é publicado.
      </p>
    </Shell>
  );
}

function Funnel({ properties, draft, onOpen }) {
  const groups = STAGES.map((st) => ({
    ...st,
    items: properties.filter((p) => (p.stage || "a-visitar") === st.key),
  })).filter((g) => g.items.length);

  if (!groups.length) {
    return (
      <div className="mt-5 rounded-xl bg-light p-[14px] text-[12.5px] text-graytext">
        Nenhum imóvel cadastrado ainda.
      </div>
    );
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.key}>
          <h2 className="mt-[26px] mb-[10px] flex items-center gap-[7px] text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
            <span className="inline-block h-[7px] w-[7px] rounded-full" style={{ background: g.chipColor }} />
            {g.label} · {g.items.length}
          </h2>
          {g.items.map((p) => {
            const feitas = [];
            const geral = draft.ans?.[evalKey(p.id, "")];
            if (geral?.sent) feitas.push({ nome: "empreendimento", nota: geral.nota });
            let unidadesFeitas = 0;
            (p.units ?? []).forEach((u) => {
              const a = draft.ans?.[evalKey(p.id, u.id)];
              if (a?.sent) {
                feitas.push({ nome: u.name, nota: a.nota });
                unidadesFeitas++;
              }
            });

            let botaoLabel = "Avaliar o empreendimento";
            if (geral?.sent) {
              if (p.units?.length > 0) {
                botaoLabel = unidadesFeitas > 0 ? "Avaliar outra unidade" : "Avaliar uma unidade";
              } else {
                botaoLabel = "Avaliar de novo";
              }
            }

            return (
              <div
                key={p.id}
                className="mb-3 rounded-[14px] border border-rule border-l-4 bg-white p-4"
                style={{ borderLeftColor: p.color || "#A68A5B" }}
              >
                <h3 className="font-serif m-0 mb-[3px] text-[17px] font-semibold text-charcoal">{p.name}</h3>
                {p.address && <p className="m-0 mb-2 text-[12.5px] text-graytext">{p.address}</p>}
                {p.summary && <p className="m-0 mb-3 text-xs text-graytext">{p.summary}</p>}
                <PropertyMedia property={p} />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Chip bg={g.chipBg} color={g.chipColor}>
                    {g.label}
                  </Chip>
                  {p.units?.length > 0 && <Chip>{p.units.length} unidade(s)</Chip>}
                  <button
                    onClick={() => onOpen(p)}
                    className="flex-1 rounded-[11px] border-[1.5px] border-rule bg-white px-[14px] py-[9px] text-[13.5px] font-bold text-charcoal"
                  >
                    {botaoLabel}
                  </button>
                </div>
                {feitas.length > 0 && (
                  <span className="mt-[10px] block text-xs font-bold text-[#2E7D32]">
                    ✓ {feitas.map((f) => `${f.nome} · ${f.nota}/10`).join("  ·  ")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

// Segunda etapa, só depois de avaliar o empreendimento: escolher qual
// unidade avaliar. Gostar do prédio e gostar de uma unidade específica
// são notas diferentes — por isso isso é uma tela própria, não uma opção
// dentro do mesmo formulário.
function ChooseUnit({ property, draft, onBack, onChoose }) {
  return (
    <div className="mt-5 pb-10">
      <button onClick={onBack} className="p-0 py-[6px] text-sm text-graytext">
        ← voltar
      </button>

      <div
        className="mt-[10px] rounded-[14px] border border-rule border-l-4 bg-white p-4"
        style={{ borderLeftColor: property.color || "#1C1C1C" }}
      >
        <h3 className="font-serif m-0 mb-[3px] text-[17px] font-semibold text-charcoal">{property.name}</h3>
        <p className="m-0 text-[12.5px] text-graytext">
          Você já avaliou o empreendimento. Agora escolha qual unidade quer avaliar.
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {(property.units ?? []).map((u) => {
          const done = draft.ans?.[evalKey(property.id, u.id)]?.sent;
          return (
            <button
              key={u.id}
              onClick={() => onChoose(u.id)}
              className="flex w-full items-center justify-between rounded-[12px] border-[1.5px] border-rule bg-white p-3 text-left hover:border-gold"
            >
              <span>
                <span className="block text-[14.5px] font-bold text-charcoal">{u.name}</span>
                {u.table_value != null && (
                  <span className="block text-[12.5px] text-graytext">
                    R$ {Math.round(u.table_value).toLocaleString("pt-BR")}
                  </span>
                )}
              </span>
              {done && <span className="shrink-0 text-xs font-bold text-[#2E7D32]">✓ avaliada</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EvaluationForm({ token, property, unitId, criteria, unitCriteria, draft, onPersist, onBack, onDone }) {
  const key = evalKey(property.id, unitId);
  const existing = draft.ans?.[key] ?? {};
  const isGeral = !unitId;
  const allCriteria = useMemo(
    () =>
      isGeral
        ? [...criteria, ...(property.extra_criteria ?? [])]
        : [...(unitCriteria ?? []), ...(property.extra_unit_criteria ?? [])],
    [isGeral, criteria, unitCriteria, property],
  );

  const [nome, setNome] = useState(existing.nome ?? draft.nome ?? "");
  const [relacao, setRelacao] = useState(existing.relacao ?? draft.relacao ?? "");
  const [notas, setNotas] = useState(existing.criterios ?? {});
  const [nota, setNota] = useState(existing.nota ?? null);
  const [bom, setBom] = useState(existing.bom ?? "");
  const [ruim, setRuim] = useState(existing.ruim ?? "");
  const [perguntasMarcadas, setPerguntasMarcadas] = useState(existing.perguntas ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const unit = (property.units ?? []).find((u) => u.id === unitId) || null;
  const accent = property.color || "#1C1C1C";

  useEffect(() => {
    const d = {
      projeto: property.name,
      projetoId: property.id,
      nome,
      relacao,
      criterios: notas,
      nota,
      bom,
      ruim,
      perguntas: perguntasMarcadas,
      unidadeId: unit ? unit.id : "",
      unidadeNome: unit ? unit.name : "",
      valorTabela: unit ? (unit.table_value ?? null) : null,
      sent: existing.sent || false,
    };
    const next = {
      ...draft,
      ans: { ...(draft.ans ?? {}), [key]: d },
      nome: nome || draft.nome,
      relacao: relacao || draft.relacao,
    };
    onPersist(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome, relacao, notas, nota, bom, ruim, perguntasMarcadas]);

  function toggleQuestion(q) {
    setPerguntasMarcadas((qs) => (qs.includes(q) ? qs.filter((x) => x !== q) : [...qs, q]));
  }

  const base = isGeral ? criteria.length : (unitCriteria ?? []).length;
  const progressTotal = allCriteria.length + 2;
  const progressDone = Object.keys(notas).length + (nome ? 1 : 0) + (nota ? 1 : 0);
  const progressPct = Math.round((progressDone / progressTotal) * 100);

  async function handleSubmit() {
    setError("");
    if (!nome.trim()) return setError("Escreva seu nome para identificarmos a avaliação.");
    if (!nota) return setError("Falta a nota geral.");

    if (existing.sent) {
      const ok = window.confirm(
        `Você já enviou uma avaliação para ${unit ? unit.name : "este empreendimento"}. Enviar de novo cria uma segunda avaliação. Continuar?`,
      );
      if (!ok) return;
    }

    setBusy(true);
    try {
      await callFunction("aval-submit", {
        method: "POST",
        body: {
          token,
          property_id: property.id,
          unit_id: unit ? unit.id : null,
          evaluator_name: nome.trim(),
          evaluator_role: relacao.trim() || null,
          scores: notas,
          overall_score: nota,
          strengths: bom.trim() || null,
          concerns: ruim.trim() || null,
          flagged: perguntasMarcadas,
        },
      });
      onPersist({
        ...draft,
        ans: { ...(draft.ans ?? {}), [key]: { ...draft.ans[key], sent: true } },
      });
      onDone(
        `${nome.trim().split(" ")[0]}, sua avaliação ${unit ? "da unidade " + unit.name : "do " + property.name} foi registrada.`,
      );
    } catch {
      setError("Não consegui enviar agora. Suas respostas estão salvas — tente de novo com sinal melhor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 pb-10">
      <button onClick={onBack} className="p-0 py-[6px] text-sm text-graytext">
        ← voltar
      </button>

      <div
        className="mt-[10px] rounded-[14px] border border-rule border-l-4 bg-white p-4"
        style={{ borderLeftColor: accent }}
      >
        <h3 className="font-serif m-0 mb-[3px] text-[17px] font-semibold text-charcoal">{property.name}</h3>
        {property.address && <p className="m-0 mb-2 text-[12.5px] text-graytext">{property.address}</p>}
        {property.summary && <p className="m-0 text-xs text-graytext">{property.summary}</p>}
        <PropertyMedia property={property} />
      </div>

      {isGeral ? (
        <div className="mt-3 rounded-[11px] bg-light p-3 text-[13px] text-graytext">
          Você está avaliando <b className="text-charcoal">o empreendimento em geral</b> — o
          projeto, a localização, o lazer. As unidades específicas têm sua própria avaliação depois.
        </div>
      ) : (
        <div className="mt-3 rounded-[14px] border-[1.5px] border-rule bg-white p-4">
          <p className="m-0 text-[10.5px] font-bold tracking-[.14em] text-gold uppercase">
            Avaliando a unidade
          </p>
          <h4 className="font-serif mt-1 mb-0 text-[15px] font-semibold text-charcoal">{unit?.name}</h4>
          {unit?.table_value != null && (
            <div className="mt-[10px] rounded-[11px] bg-light p-3 text-[13px] text-graytext">
              Valor de tabela desta unidade:{" "}
              <b className="text-charcoal">R$ {Math.round(unit.table_value).toLocaleString("pt-BR")}</b>
            </div>
          )}
          {unit && <PropertyMedia property={unit} />}
        </div>
      )}

      <SectionLabel>Quem está avaliando</SectionLabel>
      <Field label="Seu nome" value={nome} onChange={setNome} placeholder="Ex.: Pedro Machado" />
      <Field
        label="Relação com a decisão (opcional)"
        value={relacao}
        onChange={setRelacao}
        placeholder="Ex.: esposa, filho, arquiteta, consultor"
      />

      <SectionLabel>Dê sua nota de 1 a 5</SectionLabel>
      <div>
        {allCriteria.map((c, i) => (
          <div key={c} className="border-b border-rule py-[13px] last:border-0">
            {i === base && (
              <span className="mb-[6px] inline-block text-[10.5px] font-bold uppercase tracking-[.08em] text-gold">
                Específico deste imóvel
              </span>
            )}
            <label className="mb-[9px] block text-sm text-charcoal">{c}</label>
            <div className="flex gap-[6px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNotas((s) => ({ ...s, [c]: n }))}
                  className="h-[46px] flex-1 rounded-[10px] border-[1.5px] text-[15px] font-bold"
                  style={
                    notas[c] === n
                      ? { background: accent, borderColor: accent, color: "#fff" }
                      : { background: "#fff", borderColor: "#E2DED6", color: "#5C5C5C" }
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            {i === 0 && (
              <div className="mt-[7px] flex justify-between text-[11px] text-muted">
                <span>1 · não atendeu</span>
                <span>5 · superou</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <SectionLabel>O que mais me agradou</SectionLabel>
      <TextArea value={bom} onChange={setBom} placeholder="O que te marcou positivamente?" />

      <SectionLabel>Ressalvas e pontos de atenção</SectionLabel>
      <TextArea value={ruim} onChange={setRuim} placeholder="O que te incomodou ou ficou em dúvida?" />

      {property.questions?.length > 0 && (
        <div>
          <SectionLabel>Perguntas para o corretor</SectionLabel>
          {property.questions.map((q) => (
            <label
              key={q}
              className="flex items-start gap-[10px] border-b border-rule py-[10px] text-[13.5px] text-graytext last:border-0"
            >
              <input
                type="checkbox"
                checked={perguntasMarcadas.includes(q)}
                onChange={() => toggleQuestion(q)}
                className="mt-[1px] h-5 w-5 flex-none accent-gold"
              />
              <span>{q}</span>
            </label>
          ))}
        </div>
      )}

      <SectionLabel>Nota geral deste imóvel</SectionLabel>
      <div className="flex flex-wrap gap-[6px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            className="h-10 flex-1 basis-[calc(20%-5px)] rounded-lg border-[1.5px] text-[13.5px] font-bold"
            style={
              nota === n
                ? { background: accent, borderColor: accent, color: "#fff" }
                : { background: "#fff", borderColor: "#E2DED6", color: "#5C5C5C" }
            }
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-[7px] flex justify-between text-[11px] text-muted">
        <span>1 · não me serve</span>
        <span>10 · é este</span>
      </div>

      <div className="sticky bottom-0 mt-2 bg-gradient-to-t from-bg from-[26%] to-transparent pt-4 pb-[calc(14px+env(safe-area-inset-bottom))]">
        <div className="mb-[11px] h-[5px] overflow-hidden rounded-full bg-rule">
          <div
            className="h-full bg-gold transition-[width]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full rounded-[11px] bg-charcoal px-[18px] py-[13px] text-[15px] font-bold text-white disabled:opacity-45"
        >
          {busy ? "Enviando…" : "Enviar avaliação"}
        </button>
        {error && <p className="mt-2 text-[13px] text-[#B34A2E]">{error}</p>}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h2 className="mt-[26px] mb-[10px] text-[11px] font-bold uppercase tracking-[.14em] text-graytext first:mt-[6px]">
      {children}
    </h2>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <>
      <label className="mt-[14px] mb-[6px] block text-[13px] font-semibold text-charcoal">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
      />
    </>
  );
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-[86px] w-full resize-y rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
    />
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-charcoal px-4 pt-[22px] pb-5 text-white">
        <div className="mx-auto max-w-[640px]">
          <div className="text-[11px] font-bold uppercase tracking-[.18em] text-gold">
            Avaliador Materimob
          </div>
          <h1 className="font-serif mt-2 mb-1 text-[23px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="m-0 text-[13px] text-[#C9C9C9]">{subtitle}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-[640px] px-4 pb-10">{children}</div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
      {children}
    </div>
  );
}

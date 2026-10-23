import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import { loadDraft, saveDraft, evalKey } from "../lib/draftStore";
import { PropertyMedia } from "../components/PropertyMedia";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";

const STAGES = [
  { key: "a-visitar", label: "A visitar" },
  { key: "visitado", label: "Visitado" },
  { key: "negociacao", label: "Em negociação" },
  { key: "descartado", label: "Descartado" },
];

const NOTAS_1A5 = [
  [1, "Não atendeu"],
  [2, "Abaixo do esperado"],
  [3, "Dentro do esperado"],
  [4, "Muito bom"],
  [5, "Superou"],
];

function capa(color) {
  const cor = color || "#0284C7";
  return { background: `linear-gradient(135deg, ${cor}, ${cor}bb)` };
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
        : "Este link não é válido ou foi substituído. Peça um link novo ao seu corretor.";
    return (
      <Pagina titulo="MaterImob">
        <div className="mt-5 rounded-card bg-light p-4 text-body-sm text-graytext">{msg}</div>
      </Pagina>
    );
  }

  if (view === "done") {
    return (
      <Pagina titulo={data.title} subtitulo={data.subtitle}>
        <div className="mt-8 text-center">
          <div className="mx-auto mb-6 grid h-[72px] w-[72px] place-items-center rounded-full bg-brand text-white">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <h2 className="text-headline font-bold tracking-[-0.035em] text-charcoal">Pronto!</h2>
          <p className="mx-auto mt-2.5 mb-7 max-w-[30ch] text-base text-graytext">{doneMsg}</p>
          <Button size="lg" block onClick={() => setView("funnel")}>
            Avaliar outro imóvel
          </Button>
          <div className="h-2.5" />
          <Button size="lg" block variant="secondary" onClick={() => share(token)}>
            Compartilhar com outra pessoa
          </Button>
          <p className="mt-6 text-caption text-muted">Obrigado! Suas impressões ajudam a afinar a busca.</p>
        </div>
      </Pagina>
    );
  }

  if (view === "choose-unit" && current) {
    return (
      <ChooseUnit
        property={current.property}
        draft={draft}
        onBack={() => setView("funnel")}
        onChoose={(unitId) => {
          setCurrent({ property: current.property, unitId });
          setView("form");
        }}
      />
    );
  }

  if (view === "form" && current) {
    return (
      <EvaluationForm
        key={`${current.property.id}-${current.unitId ?? ""}`}
        token={token}
        property={current.property}
        unitId={current.unitId}
        criteria={data.criteria}
        unitCriteria={data.unit_criteria}
        draft={draft}
        onPersist={persist}
        onBack={() => setView(current.property.units?.length > 0 ? "choose-unit" : "funnel")}
        onDone={(msg) => {
          setDoneMsg(msg);
          setView("done");
        }}
      />
    );
  }

  return (
    <Funnel
      title={data.title}
      subtitle={data.subtitle}
      properties={data.properties}
      draft={draft}
      onShare={() => share(token)}
      onOpen={(property) => {
        if (property.units?.length > 0) {
          setCurrent({ property, unitId: null });
          setView("choose-unit");
        } else {
          setCurrent({ property, unitId: "" });
          setView("form");
        }
      }}
    />
  );
}

function Funnel({ title, subtitle, properties, draft, onOpen, onShare }) {
  const groups = STAGES.map((st) => ({
    ...st,
    items: properties.filter((p) => (p.stage || "a-visitar") === st.key),
  })).filter((g) => g.items.length);
  const [aba, setAba] = useState(groups.find((g) => g.key === "visitado")?.key ?? groups[0]?.key);
  const atual = groups.find((g) => g.key === aba) ?? groups[0];

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto max-w-[640px] px-5 pt-[calc(0.875rem+env(safe-area-inset-top))]">
          <div className="text-caption font-semibold tracking-[.06em] text-brand uppercase">MaterImob</div>
          <h1 className="text-title font-bold tracking-tight text-charcoal">{title}</h1>
          {subtitle && <p className="text-body-sm text-graytext">{subtitle}</p>}
          {groups.length > 0 && (
            <div role="tablist" className="-mx-3 mt-2.5 flex gap-0.5 overflow-x-auto px-3">
              {groups.map((g) => (
                <button
                  key={g.key}
                  role="tab"
                  aria-selected={atual?.key === g.key}
                  onClick={() => setAba(g.key)}
                  className={`relative min-h-[46px] flex-none px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                    atual?.key === g.key ? "text-charcoal" : "text-graytext"
                  }`}
                >
                  {g.label}
                  <em className="ml-1.5 rounded-full bg-light px-1.5 text-[11px] text-graytext not-italic">{g.items.length}</em>
                  {atual?.key === g.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-5 pt-[18px] pb-10">
        <div className="mb-4 rounded-card bg-brand-soft p-4 text-body-sm text-sky-900">
          <b>Como funciona.</b> Você escolhe o que avaliar: o empreendimento em geral, uma unidade específica, ou os dois.
          São notas diferentes, porque gostar do prédio e gostar de uma unidade específica não é a mesma coisa. Leva poucos
          minutos por imóvel e o que escrever fica salvo neste celular, mesmo sem internet.
        </div>

        {!atual && <div className="rounded-card bg-light p-4 text-body-sm text-graytext">Nenhum imóvel cadastrado ainda.</div>}

        {atual?.items.map((p) => {
          const feitas = [];
          const geral = draft.ans?.[evalKey(p.id, "")];
          if (geral?.sent) feitas.push({ nome: "empreendimento", nota: geral.nota });
          (p.units ?? []).forEach((u) => {
            const a = draft.ans?.[evalKey(p.id, u.id)];
            if (a?.sent) feitas.push({ nome: u.name, nota: a.nota });
          });
          const rotulo = feitas.length > 0 ? (p.units?.length > 0 ? "Avaliar mais" : "Avaliar de novo") : "Avaliar";

          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="mb-2.5 flex min-h-[76px] w-full items-center gap-3.5 rounded-[22px] border border-slate-200/70 bg-white p-3.5 text-left transition-all duration-200 hover:shadow-soft"
            >
              <span className="h-[52px] w-[52px] flex-none rounded-2xl" style={capa(p.color)} />
              <span className="min-w-0 flex-1">
                <b className="block text-base tracking-tight text-charcoal">{p.name}</b>
                {p.address && <small className="block text-body-sm text-graytext">{p.address}</small>}
                {p.units?.length > 0 && <small className="block text-caption text-muted">{p.units.length} unidade(s)</small>}
                {feitas.length > 0 && (
                  <small className="mt-0.5 block text-caption font-semibold text-success-text">
                    ✓ {feitas.map((f) => `${f.nome} · ${f.nota}/10`).join("  ·  ")}
                  </small>
                )}
              </span>
              <span className="flex-none rounded-full bg-brand-soft px-3 py-1 text-caption font-semibold text-sky-800">{rotulo}</span>
            </button>
          );
        })}

        <Button block variant="secondary" size="lg" className="mt-5" onClick={onShare}>
          Compartilhar este link
        </Button>
        <p className="py-6 text-center text-caption text-muted">Suas respostas vão direto para o seu corretor. Nada é publicado.</p>
      </div>
    </div>
  );
}

function Voltar({ onClick, rotulo = "Voltar" }) {
  return (
    <button onClick={onClick} className="-ml-1 inline-flex min-h-11 items-center gap-1 px-1 text-body-sm font-semibold text-graytext">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {rotulo}
    </button>
  );
}

// Tela de escolha: o cliente decide o que quer avaliar — o
// empreendimento em geral, uma unidade específica, ou os dois, em
// qualquer ordem. Gostar do prédio e gostar de uma unidade específica
// são notas diferentes, por isso continuam sendo avaliações separadas,
// mas nenhuma é pré-requisito da outra.
function ChooseUnit({ property, draft, onBack, onChoose }) {
  const geralDone = draft.ans?.[evalKey(property.id, "")]?.sent;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[640px] px-5 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-10">
        <Voltar onClick={onBack} />
        <p className="mt-7 mb-1 text-body-sm font-semibold text-brand">{property.name}</p>
        <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">
          O que você quer avaliar agora?
        </h2>
        <PropertyMedia property={property} />

        <div className="mt-7 grid gap-2.5">
          <Opcao marca="★" titulo="O empreendimento em geral" detalhe="Projeto, localização e lazer" feito={geralDone} onClick={() => onChoose("")} />
          {(property.units ?? []).map((u) => (
            <Opcao
              key={u.id}
              marca={u.name.split(" ").slice(-1)[0].slice(0, 3)}
              titulo={u.name}
              detalhe={u.table_value != null ? `R$ ${Math.round(u.table_value).toLocaleString("pt-BR")}` : null}
              feito={draft.ans?.[evalKey(property.id, u.id)]?.sent}
              onClick={() => onChoose(u.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Opcao({ marca, titulo, detalhe, feito, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3.5 rounded-[18px] border border-slate-200 bg-white px-[18px] py-2.5 text-left transition-all duration-200 hover:border-slate-300"
    >
      <span className={`grid h-9 min-w-9 flex-none place-items-center rounded-full px-1 text-[14px] font-bold ${feito ? "bg-success-bg text-success-text" : "bg-light text-graytext"}`}>
        {feito ? "✓" : marca}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-base leading-tight text-charcoal">{titulo}</b>
        {detalhe && <small className="text-body-sm text-graytext">{detalhe}</small>}
      </span>
      {feito && <span className="shrink-0 text-caption font-semibold text-success-text">avaliado</span>}
    </button>
  );
}

function EvaluationForm({ token, property, unitId, criteria, unitCriteria, draft, onPersist, onBack, onDone }) {
  const { confirm } = useFeedback();
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
  const [passo, setPasso] = useState(0);

  const unit = (property.units ?? []).find((u) => u.id === unitId) || null;
  const nCrit = allCriteria.length;
  // passos: um por critério, depois comentários, nota geral (com perguntas) e, por último, quem avalia
  const total = nCrit + 3;
  const iComentarios = nCrit;
  const iGeral = nCrit + 1;
  const iQuem = nCrit + 2;

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

  function anterior() {
    setError("");
    if (passo === 0) onBack();
    else setPasso((p) => p - 1);
  }

  function escolher(crit, n) {
    setNotas((s) => ({ ...s, [crit]: n }));
    const daqui = passo;
    setTimeout(() => setPasso((p) => (p === daqui ? p + 1 : p)), 220);
  }

  async function handleSubmit() {
    setError("");
    if (!nome.trim()) return setError("Escreva seu nome para identificarmos a avaliação.");
    if (!nota) {
      setPasso(iGeral);
      return setError("Falta a nota geral.");
    }

    if (existing.sent) {
      const ok = await confirm(
        `Você já enviou uma avaliação para ${unit ? unit.name : "este empreendimento"}. Enviar de novo cria uma segunda avaliação. Continuar?`,
        { tone: "warning", confirmLabel: "Enviar mesmo assim" },
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

  const ultimo = passo === total - 1;
  const rotuloPasso = ultimo ? "Última etapa" : `Passo ${passo + 1} de ${total}`;
  const crit = passo < nCrit ? allCriteria[passo] : null;
  const base = isGeral ? criteria.length : (unitCriteria ?? []).length;
  const especifico = crit && base > 0 && passo >= base;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto flex min-h-screen max-w-[640px] flex-col px-5 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <Voltar onClick={anterior} rotulo={passo === 0 ? "Sair" : "Anterior"} />
          <span className="truncate text-body-sm font-semibold text-graytext">{unit ? `${property.name} · ${unit.name}` : property.name}</span>
        </div>
        <div className="mt-1.5 flex gap-[5px]" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <i key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= passo ? "bg-brand" : "bg-rule"}`} />
          ))}
        </div>

        <div className="flex-1">
          <p className="mt-9 mb-1 text-body-sm font-semibold text-brand">
            {rotuloPasso}
            {especifico && " · específico deste imóvel"}
          </p>

          {crit && (
            <>
              <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">{crit}</h2>
              <div className="mt-7 grid gap-2.5">
                {NOTAS_1A5.map(([n, rotulo]) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => escolher(crit, n)}
                    aria-pressed={notas[crit] === n}
                    className={`flex min-h-16 items-center gap-3.5 rounded-[18px] border px-[18px] text-left text-base font-semibold transition-all duration-200 ${
                      notas[crit] === n ? "border-brand bg-[#f5fbff] text-charcoal" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <span
                      className={`grid h-9 w-9 flex-none place-items-center rounded-full text-[15px] transition-all duration-200 ${
                        notas[crit] === n ? "bg-brand text-white" : "bg-light text-graytext"
                      }`}
                    >
                      {n}
                    </span>
                    {rotulo}
                  </button>
                ))}
              </div>
              {passo === 0 && (
                <>
                  {!isGeral && unit?.table_value != null && (
                    <div className="mt-5 rounded-xl bg-light p-3 text-[13px] text-graytext">
                      Valor de tabela desta unidade:{" "}
                      <b className="text-charcoal">R$ {Math.round(unit.table_value).toLocaleString("pt-BR")}</b>
                    </div>
                  )}
                  <PropertyMedia property={unit ?? property} />
                </>
              )}
            </>
          )}

          {passo === iComentarios && (
            <>
              <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">
                O que você achou, em poucas palavras?
              </h2>
              <div className="mt-7 space-y-3.5">
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-graytext">O que mais me agradou</label>
                  <textarea
                    value={bom}
                    onChange={(e) => setBom(e.target.value)}
                    placeholder="O que te marcou positivamente?"
                    className={`${classesCampo} min-h-[92px] py-3 text-base`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-caption font-medium text-graytext">Ressalvas e pontos de atenção</label>
                  <textarea
                    value={ruim}
                    onChange={(e) => setRuim(e.target.value)}
                    placeholder="O que te incomodou ou ficou em dúvida?"
                    className={`${classesCampo} min-h-[92px] py-3 text-base`}
                  />
                </div>
              </div>
            </>
          )}

          {passo === iGeral && (
            <>
              <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">
                Qual a sua nota geral para este imóvel?
              </h2>
              <div className="mt-7">
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setNota(n)}
                      aria-pressed={nota === n}
                      className={`h-[52px] rounded-xl border text-base font-bold transition-all duration-200 ${
                        nota === n ? "border-charcoal bg-charcoal text-white" : "border-slate-200 bg-white text-graytext"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-[11.5px] text-muted">
                  <span>1 · não me serve</span>
                  <span>10 · é este</span>
                </div>
              </div>
              {property.questions?.length > 0 && (
                <div className="mt-6">
                  <span className="mb-1 block text-caption font-semibold tracking-[.08em] text-muted uppercase">Perguntas para o corretor</span>
                  {property.questions.map((q) => (
                    <label key={q} className="flex min-h-12 cursor-pointer items-start gap-3 border-t border-slate-100 py-2.5 text-body-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={perguntasMarcadas.includes(q)}
                        onChange={() => toggleQuestion(q)}
                        className="mt-0.5 h-[22px] w-[22px] flex-none accent-brand"
                      />
                      <span>{q}</span>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {passo === iQuem && (
            <>
              <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">Quem está avaliando?</h2>
              <div className="mt-7 space-y-3.5">
                <Input label="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pedro Machado" />
                <Input
                  label="Relação com a decisão (opcional)"
                  value={relacao}
                  onChange={(e) => setRelacao(e.target.value)}
                  placeholder="Ex.: esposa, filho, arquiteta, consultor"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid gap-2.5">
          {ultimo ? (
            <Button size="lg" block onClick={handleSubmit} disabled={busy}>
              {busy ? "Enviando…" : "Enviar avaliação"}
            </Button>
          ) : (
            <Button size="lg" block variant={crit && !notas[crit] ? "secondary" : "primary"} onClick={() => setPasso((p) => p + 1)}>
              {crit && !notas[crit] ? "Pular" : "Continuar"}
            </Button>
          )}
          {error && <p className="text-center text-[13px] text-danger-text">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function Pagina({ titulo, subtitulo, children }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto max-w-[640px] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="text-caption font-semibold tracking-[.06em] text-brand uppercase">MaterImob</div>
        <h1 className="mt-1 text-headline leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">{titulo}</h1>
        {subtitulo && <p className="mt-2 text-base text-graytext">{subtitulo}</p>}
      </header>
      <div className="mx-auto max-w-[640px] px-5 pb-10">{children}</div>
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

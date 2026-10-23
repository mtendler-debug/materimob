import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import { Gantt } from "../components/Gantt";
import { PropertyMedia } from "../components/PropertyMedia";
import { Map } from "../components/MapaSobDemanda";
import { useFeedback } from "../lib/feedback";

function n1(v) {
  return v == null ? "—" : (Math.round(v * 10) / 10).toFixed(1).replace(".", ",");
}
function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}
function shade(hex, v) {
  const a = Math.max(0, Math.min(1, (v - 1) / 4)) * 0.85 + 0.08;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a.toFixed(2)})`;
}
function Centered({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
      {children}
    </div>
  );
}


const ABAS = [
  ["resumo", "Resumo"],
  ["ranking", "Ranking"],
  ["comparar", "Comparar"],
  ["propostas", "Propostas"],
  ["opinioes", "Opiniões"],
];

export default function PublicPanel() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [aba, setAba] = useState("resumo");

  function load() {
    setLoading(true);
    callFunction("aval-panel", { params: { token } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }

  useEffect(load, [token]);

  function irParaAba(id) {
    setAba(id);
    window.scrollTo({ top: 0 });
  }

  if (loading && !data) return <Centered>Buscando os resultados…</Centered>;
  if (error) {
    return (
      <Centered>
        <h1 className="text-lg font-bold text-charcoal">Painel indisponível</h1>
        <p className="mt-2 max-w-xs text-sm text-graytext">
          {error.status === 404
            ? "Este link não é válido ou foi substituído. Peça um link novo ao seu corretor."
            : "Não consegui carregar os resultados agora. Tente recarregar a página."}
        </p>
      </Centered>
    );
  }

  const { title, subtitle, archived, properties, ranking, unrated, comparativo, porUnidade, comentarios, proposals, criteria } = data;

  const notasValidas = ranking.map((r) => r.notaMedia).filter((v) => v != null);
  const mediaGeral = notasValidas.length ? notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length : null;
  const lider = ranking[0];
  const temExtras = properties.some((p) => (p.extra_criteria ?? []).length > 0);
  const comMapa = properties.filter((p) => p.latitude != null && p.longitude != null);
  const sobreImoveis = properties.filter(
    (p) =>
      p.floor_plan_url ||
      p.photo_urls?.length > 0 ||
      p.payment_terms ||
      (p.units ?? []).some((u) => u.photo_urls?.length > 0 || u.payment_terms),
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[760px] px-5 pt-3.5">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold tracking-[.14em] text-brand uppercase">MaterImob</div>
              <h1 className="truncate text-title font-bold tracking-tight text-charcoal">{title}</h1>
              {subtitle && <p className="truncate text-caption text-graytext">{subtitle}</p>}
            </div>
            <span className="flex-none rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap text-sky-800">
              {data.totalAvaliacoes} avaliaç{data.totalAvaliacoes === 1 ? "ão" : "ões"}
            </span>
          </div>
          <div role="tablist" className="-mx-2 mt-2.5 flex gap-0.5 overflow-x-auto px-2">
            {ABAS.map(([id, rotulo]) => (
              <button
                key={id}
                role="tab"
                aria-selected={aba === id}
                onClick={() => irParaAba(id)}
                className={`relative min-h-[46px] flex-none px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
                  aba === id ? "text-charcoal" : "text-graytext hover:text-charcoal"
                }`}
              >
                {rotulo}
                {aba === id && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-brand" />}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] space-y-3.5 px-5 pt-5 pb-32">
        {archived && (
          <Card className="mb-0 border-sky-200 bg-brand-soft">
            <b>Atendimento encerrado.</b> Este painel segue disponível para consulta, mas o formulário
            de avaliação não recebe mais respostas.
          </Card>
        )}

        {aba === "resumo" && (
          <>
            {lider && (
              <div className="rounded-card bg-gradient-to-br from-sky-600 to-sky-800 p-5 text-white shadow-soft">
                <small className="text-caption text-sky-100">Na liderança</small>
                <b className="block text-headline leading-tight font-bold tracking-[-0.03em]">{lider.name}</b>
                <small className="text-caption text-sky-100">score {n1(lider.score)} · escala de 1 a 10</small>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Kpi label="Imóveis no funil" value={properties.length} foot={`${unrated.length} sem avaliação`} />
              <Kpi label="Avaliações" value={data.totalAvaliacoes} foot={`${data.totalAvaliadores} pessoa(s)`} />
              <Kpi label="Nota média" value={n1(mediaGeral)} foot="escala de 1 a 10" />
              <Kpi label="Propostas" value={proposals.length} foot={proposals.length ? "registrada(s)" : "nenhuma ainda"} />
            </div>

            {comMapa.length > 0 && (
              <Card>
                <SectionTitle first>Mapa dos imóveis</SectionTitle>
                <div className="overflow-hidden rounded-xl">
                  <Map
                    pins={comMapa.map((p) => ({ lat: p.latitude, lng: p.longitude, label: p.name, color: p.color || "#0284C7" }))}
                    height={260}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-caption text-graytext">
                  {comMapa.map((p) => (
                    <span key={p.id}>
                      <i className="mr-1.5 inline-block h-2 w-2 rounded-full align-[-1px]" style={{ background: p.color || "#0284C7" }} />
                      {p.name}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {sobreImoveis.length > 0 && (
              <div>
                <SectionTitle>Sobre os imóveis</SectionTitle>
                {sobreImoveis.map((p) => (
                  <PropertyAboutCard key={p.id} property={p} />
                ))}
              </div>
            )}

            <div>
              <SectionTitle>Cronograma até a compra</SectionTitle>
              <Gantt milestones={data.milestones} properties={properties} />
            </div>
          </>
        )}

        {aba === "ranking" && (
          <>
            {ranking.length === 0 ? (
              <Empty>O ranking aparece assim que a primeira avaliação for enviada.</Empty>
            ) : (
              ranking.map((r, i) => (
                <div
                  key={r.property_id}
                  className={`flex items-center gap-4 rounded-card border border-slate-200/70 bg-white p-4 ${i === 0 ? "shadow-soft" : ""}`}
                >
                  <div
                    className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-title font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${r.color || "#0284C7"}, ${r.color || "#0284C7"}bb)` }}
                  >
                    {r.posicao}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-body leading-tight font-semibold text-charcoal">{r.name}</div>
                    <div className="mt-0.5 text-caption text-graytext">
                      nota {n1(r.notaMedia)}/10 · critérios {n1(r.mediaCriterios)}/5 · {r.avaliacoes} avaliação(ões)
                    </div>
                    <div className="mt-2 h-[5px] max-w-[320px] overflow-hidden rounded-full bg-light">
                      <div className="h-full rounded-full" style={{ width: `${r.score * 10}%`, background: r.color || "#0284C7" }} />
                    </div>
                  </div>
                  <div className="pl-2 text-right">
                    <b className="block text-headline leading-[1.05] font-bold tracking-[-0.03em] tabular-nums">{n1(r.score)}</b>
                    <span className="text-[10px] tracking-[.06em] text-muted uppercase">score</span>
                  </div>
                </div>
              ))
            )}
            {unrated.length > 0 && (
              <Card>
                <b className="text-charcoal">Ainda sem avaliação:</b>
                <br />
                {unrated.map((u) => (
                  <span key={u.property_id} className="mt-1.5 mr-1.5 inline-block rounded-full bg-light px-2.5 py-1 text-caption font-semibold text-graytext">
                    {u.name}
                  </span>
                ))}
              </Card>
            )}

            {porUnidade.length > 0 && (
              <div>
                <SectionTitle>Notas por unidade</SectionTitle>
                {porUnidade.map((p) => (
                  <Card key={p.property_id}>
                    <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                      <b className="text-body font-semibold" style={{ color: p.color || "#0284C7" }}>{p.name}</b>
                      <span className="text-caption text-muted">{p.units.length} unidades avaliadas</span>
                    </div>
                    {p.units
                      .filter((u) => u.evaluations_count > 0)
                      .map((u) => (
                        <div key={u.unit_id ?? "geral"} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 text-[13px] last:border-0">
                          <div className="min-w-0 flex-1 text-graytext">
                            <span className="font-semibold text-charcoal">{u.name}</span>
                            {u.table_value ? ` · ${brl(u.table_value)}` : ""} · {u.evaluations_count} avaliação(ões)
                          </div>
                          <UnitStatusBadge status={u.status} />
                          <div className="font-bold tabular-nums" style={{ color: p.color || "#0284C7" }}>{n1(u.overall_avg)}/10</div>
                        </div>
                      ))}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {aba === "comparar" && (
          <>
            {criteria.length === 0 ? (
              <Empty>O comparativo aparece assim que a primeira avaliação for enviada.</Empty>
            ) : (
              <Card>
                <SectionTitle first note="média de 1 a 5">Comparativo por critério</SectionTitle>
                <div className="overflow-x-auto rounded-xl border border-slate-200/70">
                  <table className="w-full min-w-[460px] border-collapse text-[13px]">
                    <thead>
                      <tr>
                        <th className="bg-bg p-[11px] text-left text-[11px] font-semibold tracking-[.05em] text-graytext uppercase">Critério</th>
                        {comparativo.map((c) => (
                          <th key={c.property_id} className="bg-bg p-[11px] text-center text-[11px] font-semibold tracking-[.05em] text-graytext uppercase">
                            {c.name.split(" ")[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {criteria.map((crit) => (
                        <tr key={crit}>
                          <td className="border-t border-slate-100 bg-white p-[10px] font-semibold text-charcoal">{crit}</td>
                          {comparativo.map((c) => {
                            const m = (c.medias ?? []).find((x) => x.criterio === crit);
                            const v = m ? m.media : null;
                            return (
                              <td
                                key={c.property_id}
                                className="border-t border-slate-100 p-[10px] text-center tabular-nums text-graytext"
                                style={v == null ? {} : { background: shade(c.color || "#0284C7", v), color: v >= 4 ? "#fff" : "#5C5C5C" }}
                              >
                                {n1(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="border-t border-slate-200 bg-white p-[10px] font-semibold text-charcoal">Média geral</td>
                        {comparativo.map((c) => (
                          <td key={c.property_id} className="border-t border-slate-200 bg-white p-[10px] text-center tabular-nums">
                            <b>{n1(c.mediaCriterios)}</b>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {temExtras && (
                  <p className="mt-3 text-caption text-graytext">
                    A tabela acima traz os critérios avaliados em todos os imóveis. Alguns imóveis têm
                    critérios próprios, listados abaixo, e eles também entram na média geral.
                  </p>
                )}
              </Card>
            )}

            {temExtras && (
              <div>
                <SectionTitle>Critérios específicos de cada imóvel</SectionTitle>
                {comparativo
                  .filter((c) => properties.find((p) => p.id === c.property_id)?.extra_criteria?.length)
                  .map((c) => {
                    const property = properties.find((p) => p.id === c.property_id);
                    const rankEntry = ranking.find((r) => r.property_id === c.property_id);
                    return (
                      <Card key={c.property_id}>
                        <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                          <b className="text-body font-semibold" style={{ color: c.color || "#0284C7" }}>{c.name}</b>
                          <span className="text-caption text-muted">
                            {property.extra_criteria.length} critério(s) exclusivo(s) · {rankEntry?.avaliacoes ?? 0} avaliação(ões)
                          </span>
                        </div>
                        {property.extra_criteria.map((crit) => {
                          const m = (c.medias ?? []).find((x) => x.criterio === crit);
                          const v = m ? m.media : null;
                          return (
                            <div key={crit} className="flex items-center gap-3 border-b border-slate-100 py-[11px] last:border-0">
                              <div className="min-w-0 flex-1 text-[13.5px] text-graytext">{crit}</div>
                              <div className="h-[7px] w-[110px] flex-none overflow-hidden rounded-full bg-light">
                                <div className="h-full rounded-full" style={{ width: `${v ? (v / 5) * 100 : 0}%`, background: c.color || "#0284C7" }} />
                              </div>
                              <div className="w-14 flex-none text-right text-sm font-bold tabular-nums" style={{ color: v ? c.color || "#0284C7" : "#9A9A9A" }}>
                                {v == null ? "—" : `${n1(v)}/5`}
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {aba === "propostas" &&
          (archived ? (
            <Proposals token={token} proposals={proposals} properties={properties} archived={archived} onChange={load} />
          ) : (
            <div className="grid gap-5 lg:items-start">
              <Proposals token={token} proposals={proposals} properties={properties} archived={archived} onChange={load} />
              <ProposalForm token={token} properties={properties} onCreated={load} />
            </div>
          ))}

        {aba === "opinioes" &&
          (comentarios.length === 0 ? (
            <Empty>Ainda não há comentários escritos.</Empty>
          ) : (
            comentarios.map((c) => (
              <div key={c.property_id} className="mb-2">
                <div className="mb-2 text-body-sm font-semibold" style={{ color: c.color || "#0284C7" }}>{c.name}</div>
                {c.comentarios.map((cm, i) => (
                  <div key={i} className="mb-2.5 rounded-card border border-slate-200/70 bg-white p-4">
                    <div className="mb-2 flex items-center gap-2.5">
                      <span
                        className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: c.color || "#0284C7" }}
                      >
                        {cm.evaluator_name?.[0]?.toUpperCase() ?? "?"}
                      </span>
                      <div className="text-[12.5px] font-semibold">
                        {cm.evaluator_name}{" "}
                        <span className="font-normal text-muted">
                          {cm.evaluator_role ? `· ${cm.evaluator_role} ` : ""}
                          · nota {cm.overall_score}/10{cm.unit_name ? ` · ${cm.unit_name}` : ""}
                        </span>
                      </div>
                    </div>
                    {cm.strengths && <p className="my-1 pl-[38px] text-[13.5px] text-graytext"><b>+</b> {cm.strengths}</p>}
                    {cm.concerns && <p className="my-1 pl-[38px] text-[13.5px] text-graytext"><b>−</b> {cm.concerns}</p>}
                  </div>
                ))}
              </div>
            ))
          ))}

        <p className="py-6 text-center text-caption leading-relaxed text-muted">
          Painel gerado automaticamente a partir das avaliações enviadas.
        </p>
      </div>

      {!archived && aba !== "propostas" && properties.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={() => irParaAba("propostas")}
            className="pointer-events-auto mx-auto flex min-h-[54px] w-full max-w-[420px] items-center justify-center rounded-[18px] bg-brand text-[15px] font-semibold text-white shadow-[0_12px_32px_-8px_rgba(2,132,199,.55)] transition-all duration-200 hover:bg-brand-hover active:scale-[0.98]"
          >
            Fazer uma proposta
          </button>
        </div>
      )}
    </div>
  );
}

// Card fechado por padrão — mostra só o nome do imóvel; o cliente abre pra
// ver planta, fotos e condições de pagamento (do imóvel e de cada unidade
// que tiver mídia própria). Evita empurrar o resto do painel pra baixo com
// conteúdo que nem todo cliente quer ver.
function PropertyAboutCard({ property }) {
  const [open, setOpen] = useState(false);
  const unidadesComMidia = (property.units ?? []).filter((u) => u.photo_urls?.length > 0 || u.payment_terms);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <b className="text-[16px] font-semibold" style={{ color: property.color || "#0284C7" }}>{property.name}</b>
        <span className={`shrink-0 text-graytext transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="mt-3 border-t border-rule pt-3">
          <PropertyMedia property={property} />
          {unidadesComMidia.map((u) => (
            <div key={u.id} className="mt-3 border-t border-rule pt-3">
              <p className="text-[13px] font-bold text-charcoal">{u.name}</p>
              <PropertyMedia property={u} />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Proposals({ token, proposals, properties, archived, onChange }) {
  const { confirm, toast } = useFeedback();
  if (proposals.length === 0) {
    return (
      <Empty>
        Nenhuma proposta registrada ainda. Use o formulário abaixo quando quiser fazer uma oferta por
        algum dos imóveis.
      </Empty>
    );
  }

  async function remove(id) {
    if (!(await confirm("Remover esta proposta?"))) return;
    await callFunction("aval-proposal", { method: "DELETE", params: { token, id } });
    onChange();
    toast("Proposta removida.");
  }

  return (
    <>
      {proposals.map((x) => {
        const property = properties.find((p) => p.id === x.property_id);
        const unit = property?.units?.find((u) => u.id === x.unit_id);
        const desagio = x.table_value ? (1 - x.value / x.table_value) * 100 : null;
        return (
          <Card key={x.id} style={{ borderLeft: `4px solid ${property?.color || "#0284C7"}` }}>
            <div className="flex flex-wrap items-baseline gap-[10px]">
              <b className="text-[17px] font-semibold">{brl(x.value)}</b>
              {desagio != null && (
                <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
                  {n1(desagio)}% abaixo da tabela
                </span>
              )}
              {x.buy_intent && (
                <span className="rounded-full px-[10px] py-1 text-[10.5px] font-bold" style={{ background: "#E3F0E4", color: "#2E7D32" }}>
                  interesse confirmado
                </span>
              )}
              <span className="ml-auto text-[11.5px] text-muted">
                {new Date(x.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="mt-1 text-[13px] text-graytext">
              <span className="font-bold" style={{ color: property?.color || "#0284C7" }}>
                {property?.name}
              </span>
              {unit ? ` · ${unit.name}` : ""}
              {x.table_value ? ` · tabela ${brl(x.table_value)}` : ""} · por {x.proposer_name}
            </div>
            {x.note && (
              <div className="mt-2 border-l-[3px] border-rule pl-[10px] text-[13px] text-graytext">{x.note}</div>
            )}
            {!archived && (
              <div className="mt-[10px]">
                <button
                  onClick={() => remove(x.id)}
                  className="min-h-9 rounded-[10px] border border-slate-200 px-3 text-xs font-semibold text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal"
                >
                  remover
                </button>
              </div>
            )}
          </Card>
        );
      })}
    </>
  );
}

function ProposalForm({ token, properties, onCreated }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [proposerName, setProposerName] = useState("");
  const [note, setNote] = useState("");
  const [buyIntent, setBuyIntent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const property = properties.find((p) => p.id === propertyId);
  const unit = property?.units?.find((u) => u.id === unitId);
  const value = rawValue ? Number(rawValue) : null;
  const desagio = value && unit?.table_value ? (1 - value / unit.table_value) * 100 : null;

  if (!properties.length) return null;

  async function handleSubmit() {
    if (!proposerName.trim()) return setMsg({ type: "err", text: "Escreva seu nome." });
    if (!value) return setMsg({ type: "err", text: "Informe o valor da proposta." });
    setBusy(true);
    setMsg(null);
    try {
      const res = await callFunction("aval-proposal", {
        method: "POST",
        body: {
          token,
          property_id: propertyId,
          unit_id: unitId || null,
          proposer_name: proposerName.trim(),
          value,
          note: note.trim() || null,
          buy_intent: buyIntent,
        },
      });
      const reservation = res.launch_reservation || res.portfolio_reservation;
      const reservationText = reservation
        ? reservation.ok
          ? " Unidade reservada com sucesso."
          : ` Atenção: ${reservation.message}`
        : "";
      setMsg({
        type: reservation && !reservation.ok ? "err" : "ok",
        text: `Proposta registrada.${res.desagio != null ? ` Deságio: ${n1(res.desagio)}%` : ""}${reservationText}`,
      });
      setProposerName("");
      setRawValue("");
      setNote("");
      setBuyIntent(false);
      onCreated();
    } catch (err) {
      setMsg({ type: "err", text: "Não consegui registrar: " + err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-5 shadow-soft">
      <b className="text-[18px] font-semibold">Registrar uma proposta</b>
      <p className="mt-[6px] text-[13px] text-graytext">
        Indique quanto você pagaria por um dos imóveis. O seu corretor recebe e conduz a negociação a
        partir daí.
      </p>

      {msg && (
        <div
          className="my-3 rounded-[10px] px-[14px] py-[11px] text-[13.5px]"
          style={msg.type === "ok" ? { background: "#E3F0E4", color: "#2E7D32" } : { background: "#F7E4E0", color: "#B34A2E" }}
        >
          {msg.text}
        </div>
      )}

      <Label>Imóvel</Label>
      <select
        value={propertyId}
        onChange={(e) => {
          setPropertyId(e.target.value);
          setUnitId("");
        }}
        className="w-full min-h-12 rounded-control border border-slate-200 bg-white px-3.5 text-base text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {property?.units?.length > 0 && (
        <>
          <Label>Unidade</Label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="w-full min-h-12 rounded-control border border-slate-200 bg-white px-3.5 text-base text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
          >
            <option value="">—</option>
            {property.units.map((u) => {
              const sold = u.launch_unit?.status === "vendida" || u.portfolio_unit?.status === "vendida";
              return (
                <option key={u.id} value={u.id} disabled={sold}>
                  {u.name}
                  {u.table_value ? ` — ${brl(u.table_value)}` : ""}
                  {sold ? " (vendida)" : ""}
                </option>
              );
            })}
          </select>
        </>
      )}

      {(unit?.launch_unit?.status === "vendida" || unit?.portfolio_unit?.status === "vendida") && (
        <div className="mt-[10px] rounded-[11px] p-3 text-[13px]" style={{ background: "#F1E4E0", color: "#B34A2E" }}>
          Essa unidade já foi vendida — escolha outra, ou fale com o seu corretor.
        </div>
      )}

      {unit?.table_value != null && (
        <div className="mt-[10px] rounded-[11px] bg-light p-3 text-[13px] text-graytext">
          Valor de tabela: <b className="text-charcoal">{brl(unit.table_value)}</b>
        </div>
      )}

      <Label>Sua proposta</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-[13px] -translate-y-1/2 text-[15px] font-semibold text-muted">
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={rawValue ? Number(rawValue).toLocaleString("pt-BR") : ""}
          onChange={(e) => setRawValue(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          className="w-full min-h-12 rounded-control border border-slate-200 bg-white px-3.5 pl-[38px] text-base font-semibold text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
      </div>
      {desagio != null && (
        <div className="mt-[7px] flex justify-between text-[11.5px] text-muted">
          <span />
          <span>
            {desagio > 0
              ? `${n1(desagio)}% abaixo da tabela`
              : desagio < 0
                ? `${n1(Math.abs(desagio))}% acima da tabela`
                : "igual à tabela"}
          </span>
        </div>
      )}

      <Label>Quem está propondo</Label>
      <input
        type="text"
        value={proposerName}
        onChange={(e) => setProposerName(e.target.value)}
        placeholder="Seu nome"
        className="w-full min-h-12 rounded-control border border-slate-200 bg-white px-3.5 text-base text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
      />

      <Label>Observações (opcional)</Label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Condições de pagamento, prazo, o que for relevante"
        className="min-h-[84px] w-full resize-y rounded-control border border-slate-200 bg-white p-3.5 text-base text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
      />

      <div
        className="mt-[14px] rounded-xl border-[1.5px] p-[14px]"
        style={buyIntent ? { borderColor: "#2E7D32", background: "#F2F8F2" } : { borderColor: "#E2DED6" }}
      >
        <label className="flex cursor-pointer items-start gap-[11px] text-sm">
          <input
            type="checkbox"
            checked={buyIntent}
            onChange={(e) => setBuyIntent(e.target.checked)}
            className="mt-[1px] h-[22px] w-[22px] flex-none accent-[#2E7D32]"
          />
          <span>Se esta proposta for aceita, tenho interesse em seguir com a compra.</span>
        </label>
        <div className="mt-2 ml-[33px] text-[11.5px] leading-relaxed text-muted">
          Registra sua intenção para o seu corretor conduzir a negociação. Não é uma proposta formal
          nem um compromisso de compra — nada é assinado por aqui.
        </div>
      </div>

      <div className="h-[14px]" />
      <button
        onClick={handleSubmit}
        disabled={busy}
        className="min-h-12 w-full rounded-control bg-brand px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-brand-hover disabled:opacity-45"
      >
        {busy ? "Enviando…" : "Enviar proposta"}
      </button>
    </div>
  );
}

function SectionTitle({ children, note, first = false }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-3 ${first ? "" : "mt-2"}`}>
      <h2 className="text-caption font-semibold tracking-[.08em] text-muted uppercase">{children}</h2>
      {note && <span className="text-caption text-muted">{note}</span>}
    </div>
  );
}

function Card({ children, className = "", style }) {
  return (
    <div className={`mb-3 rounded-card border border-slate-200/70 bg-white p-[18px] ${className}`} style={style}>
      {children}
    </div>
  );
}

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-card border border-slate-200/70 bg-white p-4">
      <div className="text-[11px] font-semibold tracking-[.06em] text-muted uppercase">{label}</div>
      <div className="mt-1 text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{value}</div>
      <div className="mt-0.5 text-caption text-graytext">{foot}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="rounded-card border border-slate-200/70 bg-white p-6 text-center text-[13.5px] text-muted">{children}</div>;
}

const UNIT_STATUS_LABELS = { reservada: "Reservada", vendida: "Vendida" };
const UNIT_STATUS_COLORS = {
  reservada: { bg: "#FEF3C7", color: "#92400E" },
  vendida: { bg: "#FFE4E6", color: "#9F1239" },
};

function UnitStatusBadge({ status }) {
  if (!status || status === "disponivel") return null;
  return (
    <span
      className="rounded-full px-[10px] py-1 text-[10.5px] font-bold"
      style={{ background: UNIT_STATUS_COLORS[status].bg, color: UNIT_STATUS_COLORS[status].color }}
    >
      {UNIT_STATUS_LABELS[status]}
    </span>
  );
}

function Label({ children }) {
  return (
    <label className="mt-[14px] mb-[6px] block text-xs font-bold tracking-[.04em] text-graytext uppercase">
      {children}
    </label>
  );
}

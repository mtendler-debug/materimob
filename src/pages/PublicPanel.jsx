import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import { Gantt } from "../components/Gantt";
import { PropertyMedia } from "../components/PropertyMedia";

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

export default function PublicPanel() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

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

  if (loading) return <Centered>Buscando os resultados…</Centered>;
  if (error) {
    return (
      <Centered>
        <h1 className="text-lg font-bold text-charcoal">Painel indisponível</h1>
        <p className="mt-2 max-w-xs text-sm text-graytext">
          {error.status === 404
            ? "Este link não é válido ou foi substituído. Peça um link novo à consultoria."
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

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-charcoal px-[18px] pt-[26px] pb-6 text-white">
        <div className="mx-auto max-w-[900px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">
            Avaliador Materimob
          </div>
          <h1 className="mt-[9px] mb-1 text-[25px] leading-tight font-bold">{title}</h1>
          {subtitle && <p className="m-0 text-[13.5px] text-[#C9C9C9]">{subtitle}</p>}
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-[18px] pb-10">
        {archived && (
          <Card className="mt-4" style={{ background: "#F4EFE6", borderLeft: "5px solid #A68A5B" }}>
            <b>Atendimento encerrado.</b> Este painel segue disponível para consulta, mas o formulário
            de avaliação não recebe mais respostas.
          </Card>
        )}

        <SectionTitle>Panorama</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Imóveis no funil" value={properties.length} foot={`${unrated.length} sem avaliação`} />
          <Kpi label="Avaliações" value={data.totalAvaliacoes} foot={`${data.totalAvaliadores} pessoa(s)`} />
          <Kpi label="Preferido" value={lider ? lider.name : "—"} foot={lider ? `score ${n1(lider.score)}` : "aguardando respostas"} />
          <Kpi label="Nota média" value={n1(mediaGeral)} foot="escala de 1 a 10" />
        </div>

        <SectionTitle>Ranking dos imóveis</SectionTitle>
        {ranking.length === 0 ? (
          <Empty>O ranking aparece assim que a primeira avaliação for enviada.</Empty>
        ) : (
          ranking.map((r) => (
            <div
              key={r.property_id}
              className="mb-[10px] flex items-center gap-[13px] rounded-[13px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]"
              style={{ borderLeft: `6px solid ${r.color || "#A68A5B"}` }}
            >
              <div
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-[15px] font-bold text-white"
                style={{ background: r.color || "#A68A5B" }}
              >
                {r.posicao}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-bold leading-tight text-charcoal">{r.name}</div>
                <div className="mt-[1px] text-xs text-graytext">
                  nota {n1(r.notaMedia)}/10 · critérios {n1(r.mediaCriterios)}/5 · {r.avaliacoes} avaliação(ões)
                </div>
                <div className="mt-[7px] h-[6px] max-w-[300px] overflow-hidden rounded-full bg-light">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${r.score * 10}%`, background: r.color || "#A68A5B" }}
                  />
                </div>
              </div>
              <div className="pl-2 text-right">
                <b className="block text-[21px] leading-[1.1]">{n1(r.score)}</b>
                <span className="text-[10.5px] text-muted">score</span>
              </div>
            </div>
          ))
        )}
        {unrated.length > 0 && (
          <Card>
            <b className="text-charcoal">Ainda sem avaliação:</b>
            <br />
            {unrated.map((u) => (
              <span key={u.property_id} className="mr-[6px] mb-[6px] inline-block rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
                {u.name}
              </span>
            ))}
          </Card>
        )}

        {properties.some(
          (p) =>
            p.floor_plan_url ||
            p.photo_urls?.length > 0 ||
            p.payment_terms ||
            (p.units ?? []).some((u) => u.photo_urls?.length > 0 || u.payment_terms),
        ) && (
          <>
            <SectionTitle>Sobre os imóveis</SectionTitle>
            {properties.map((p) => {
              const unidadesComMidia = (p.units ?? []).filter((u) => u.photo_urls?.length > 0 || u.payment_terms);
              return (
                <Card key={p.id}>
                  <b style={{ color: p.color || "#A68A5B" }}>{p.name}</b>
                  <PropertyMedia property={p} />
                  {unidadesComMidia.map((u) => (
                    <div key={u.id} className="mt-3 border-t border-rule pt-3">
                      <p className="text-[13px] font-bold text-charcoal">{u.name}</p>
                      <PropertyMedia property={u} />
                    </div>
                  ))}
                </Card>
              );
            })}
          </>
        )}

        {criteria.length > 0 && (
          <>
            <SectionTitle>Comparativo por critério</SectionTitle>
            <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <table className="w-full min-w-[460px] border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="bg-charcoal p-[9px] text-left text-[11px] font-bold text-white">Critério</th>
                    {comparativo.map((c) => (
                      <th key={c.property_id} className="bg-charcoal p-[9px] text-center text-[11px] font-bold text-white">
                        {c.name.split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((crit) => (
                    <tr key={crit}>
                      <td className="border-b border-rule p-[9px] font-semibold text-charcoal">{crit}</td>
                      {comparativo.map((c) => {
                        const m = (c.medias ?? []).find((x) => x.criterio === crit);
                        const v = m ? m.media : null;
                        return (
                          <td
                            key={c.property_id}
                            className="border-b border-rule p-[9px] text-center text-graytext"
                            style={v == null ? {} : { background: shade(c.color || "#A68A5B", v), color: v >= 4 ? "#fff" : "#5C5C5C" }}
                          >
                            {n1(v)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="p-[9px] font-semibold text-charcoal">Média geral</td>
                    {comparativo.map((c) => (
                      <td key={c.property_id} className="p-[9px] text-center">
                        <b>{n1(c.mediaCriterios)}</b>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {temExtras && (
              <p className="mt-[-4px] text-[12.5px] text-graytext">
                A tabela acima traz os critérios avaliados em todos os imóveis. Alguns imóveis têm
                critérios próprios, listados na seção seguinte — eles também entram na média geral.
              </p>
            )}
          </>
        )}

        {temExtras && (
          <>
            <SectionTitle>Critérios específicos de cada imóvel</SectionTitle>
            {comparativo
              .filter((c) => properties.find((p) => p.id === c.property_id)?.extra_criteria?.length)
              .map((c) => {
                const property = properties.find((p) => p.id === c.property_id);
                const rankEntry = ranking.find((r) => r.property_id === c.property_id);
                return (
                  <Card key={c.property_id}>
                    <div className="mb-[6px] flex flex-wrap items-baseline gap-[9px]">
                      <b className="text-[15.5px]" style={{ color: c.color || "#A68A5B" }}>{c.name}</b>
                      <span className="text-[11.5px] text-muted">
                        {property.extra_criteria.length} critério(s) exclusivo(s) · {rankEntry?.avaliacoes ?? 0} avaliação(ões)
                      </span>
                    </div>
                    {property.extra_criteria.map((crit) => {
                      const m = (c.medias ?? []).find((x) => x.criterio === crit);
                      const v = m ? m.media : null;
                      return (
                        <div key={crit} className="flex items-center gap-3 border-b border-rule py-[11px] last:border-0">
                          <div className="min-w-0 flex-1 text-[13.5px] text-graytext">{crit}</div>
                          <div className="h-[7px] w-[110px] flex-none overflow-hidden rounded-full bg-light">
                            <div className="h-full rounded-full" style={{ width: `${v ? (v / 5) * 100 : 0}%`, background: c.color || "#A68A5B" }} />
                          </div>
                          <div className="w-14 flex-none text-right text-sm font-bold" style={{ color: v ? c.color || "#A68A5B" : "#9A9A9A" }}>
                            {v == null ? "—" : `${n1(v)}/5`}
                          </div>
                        </div>
                      );
                    })}
                  </Card>
                );
              })}
          </>
        )}

        <SectionTitle>Cronograma até a compra</SectionTitle>
        <Gantt milestones={data.milestones} properties={properties} />

        {porUnidade.length > 0 && (
          <>
            <SectionTitle>Notas por unidade</SectionTitle>
            {porUnidade.map((p) => (
              <Card key={p.property_id}>
                <div className="mb-[6px] flex flex-wrap items-baseline gap-[9px]">
                  <b className="text-[15.5px]" style={{ color: p.color || "#A68A5B" }}>{p.name}</b>
                  <span className="text-[11.5px] text-muted">{p.units.length} unidades avaliadas</span>
                </div>
                {p.units
                  .filter((u) => u.evaluations_count > 0)
                  .map((u) => (
                    <div key={u.unit_id ?? "geral"} className="flex items-center gap-[10px] border-b border-rule py-[9px] text-[13px] last:border-0">
                      <div className="min-w-0 flex-1 text-graytext">
                        <span className="font-bold text-charcoal">{u.name}</span>
                        {u.table_value ? ` · ${brl(u.table_value)}` : ""} · {u.evaluations_count} avaliação(ões)
                      </div>
                      <UnitStatusBadge status={u.status} />
                      <div className="font-bold" style={{ color: p.color || "#A68A5B" }}>{n1(u.overall_avg)}/10</div>
                    </div>
                  ))}
              </Card>
            ))}
          </>
        )}

        <SectionTitle>Propostas</SectionTitle>
        <Proposals token={token} proposals={proposals} properties={properties} archived={archived} onChange={load} />

        {!archived && <ProposalForm token={token} properties={properties} onCreated={load} />}

        <SectionTitle>O que cada um achou</SectionTitle>
        {comentarios.length === 0 ? (
          <Empty>Ainda não há comentários escritos.</Empty>
        ) : (
          comentarios.map((c) => (
            <Card key={c.property_id}>
              <b style={{ color: c.color || "#A68A5B" }}>{c.name}</b>
              {c.comentarios.map((cm, i) => (
                <div key={i} className="my-[14px] border-l-[3px] py-[2px] pl-3 text-[13.5px]" style={{ borderColor: c.color || "#E2DED6" }}>
                  <div className="text-[12.5px] font-bold">
                    {cm.evaluator_name}{" "}
                    <span className="font-normal text-muted">
                      {cm.evaluator_role ? `· ${cm.evaluator_role} ` : ""}
                      · nota {cm.overall_score}/10{cm.unit_name ? ` · ${cm.unit_name}` : ""}
                    </span>
                  </div>
                  {cm.strengths && <p className="my-1 text-graytext"><b>+</b> {cm.strengths}</p>}
                  {cm.concerns && <p className="my-1 text-graytext"><b>−</b> {cm.concerns}</p>}
                </div>
              ))}
            </Card>
          ))
        )}

        <p className="py-[30px] text-center text-[11.5px] leading-relaxed text-muted">
          Painel gerado automaticamente a partir das avaliações enviadas.
        </p>
      </div>
    </div>
  );
}

function Proposals({ token, proposals, properties, archived, onChange }) {
  if (proposals.length === 0) {
    return (
      <Empty>
        Nenhuma proposta registrada ainda. Use o formulário abaixo quando quiser fazer uma oferta por
        algum dos imóveis.
      </Empty>
    );
  }

  async function remove(id) {
    if (!window.confirm("Remover esta proposta?")) return;
    await callFunction("aval-proposal", { method: "DELETE", params: { token, id } });
    onChange();
  }

  return (
    <>
      {proposals.map((x) => {
        const property = properties.find((p) => p.id === x.property_id);
        const unit = property?.units?.find((u) => u.id === x.unit_id);
        const desagio = x.table_value ? (1 - x.value / x.table_value) * 100 : null;
        return (
          <Card key={x.id} style={{ borderLeft: `5px solid ${property?.color || "#A68A5B"}` }}>
            <div className="flex flex-wrap items-baseline gap-[10px]">
              <b className="text-[15px]">{brl(x.value)}</b>
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
              <span className="font-bold" style={{ color: property?.color || "#A68A5B" }}>
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
                  className="rounded-lg border-[1.5px] border-rule px-[11px] py-[6px] text-xs font-bold text-graytext"
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
      const reservation = res.launch_reservation;
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
    <Card>
      <b className="text-[15.5px]">Registrar uma proposta</b>
      <p className="mt-[6px] text-[13px] text-graytext">
        Indique quanto você pagaria por um dos imóveis. A consultoria recebe e conduz a negociação a
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
        className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
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
            className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
          >
            <option value="">—</option>
            {property.units.map((u) => {
              const sold = u.launch_unit?.status === "vendida";
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

      {unit?.launch_unit?.status === "vendida" && (
        <div className="mt-[10px] rounded-[11px] p-3 text-[13px]" style={{ background: "#F1E4E0", color: "#B34A2E" }}>
          Essa unidade já foi vendida — escolha outra, ou fale com a consultoria.
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
          className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 pl-[38px] text-base font-semibold text-charcoal"
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
        className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
      />

      <Label>Observações (opcional)</Label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Condições de pagamento, prazo, o que for relevante"
        className="min-h-[70px] w-full resize-y rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
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
          Registra sua intenção para a consultoria conduzir a negociação. Não é uma proposta formal
          nem um compromisso de compra — nada é assinado por aqui.
        </div>
      </div>

      <div className="h-[14px]" />
      <button
        onClick={handleSubmit}
        disabled={busy}
        className="w-full rounded-[11px] bg-charcoal px-[18px] py-[13px] text-[15px] font-bold text-white disabled:opacity-45"
      >
        {busy ? "Enviando…" : "Enviar proposta"}
      </button>
    </Card>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-[34px] mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
}

function Card({ children, className = "", style }) {
  return (
    <div className={`mb-3 rounded-[14px] bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,.06)] ${className}`} style={style}>
      {children}
    </div>
  );
}

function Kpi({ label, value, foot }) {
  return (
    <div className="rounded-[14px] bg-white p-[15px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className="text-[9.5px] font-bold uppercase tracking-[.1em] text-muted">{label}</div>
      <div className="mt-[5px] text-2xl leading-[1.15] font-bold">{value}</div>
      <div className="mt-[3px] text-[11.5px] text-graytext">{foot}</div>
    </div>
  );
}

function Empty({ children }) {
  return <div className="rounded-[14px] bg-white p-6 text-center text-[13.5px] text-muted">{children}</div>;
}

const UNIT_STATUS_LABELS = { reservada: "Reservada", vendida: "Vendida" };
const UNIT_STATUS_COLORS = {
  reservada: { bg: "#FFF3E0", color: "#B26A00" },
  vendida: { bg: "#F1E4E0", color: "#B34A2E" },
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

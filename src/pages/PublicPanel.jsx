import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";

function Centered({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center">
      {children}
    </div>
  );
}

function currency(v) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function averageFor(evaluations, propertyId, criterion) {
  const values = evaluations
    .filter((e) => e.property_id === propertyId)
    .map((e) => e.scores?.[criterion])
    .filter((v) => typeof v === "number");
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
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

  if (loading) return <Centered>Carregando…</Centered>;
  if (error) {
    return (
      <Centered>
        <h1 className="text-lg font-medium text-neutral-800">Link inválido</h1>
      </Centered>
    );
  }

  const { title, subtitle, criteria, archived, properties, evaluations, proposals, ranking, unrated } = data;
  const propertyById = Object.fromEntries(properties.map((p) => [p.id, p]));

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm uppercase tracking-wide text-neutral-400">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        {archived && (
          <span className="mt-2 inline-block rounded bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            atendimento encerrado
          </span>
        )}

        <h2 className="mt-8 text-lg font-medium text-neutral-800">Ranking</h2>
        {ranking.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">Nenhuma avaliação ainda.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {ranking.map((r, i) => (
              <div
                key={r.property_id}
                className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-3"
              >
                <span className="text-sm text-neutral-700">
                  {i + 1}. {r.name}
                </span>
                <span className="font-medium text-neutral-800">{r.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        )}

        {unrated.length > 0 && (
          <p className="mt-2 text-xs text-neutral-400">
            Sem avaliação ainda: {unrated.map((u) => u.name).join(", ")}
          </p>
        )}

        {criteria.length > 0 && ranking.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-medium text-neutral-800">Comparativo</h2>
            <div className="mt-3 overflow-x-auto rounded-md border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="p-2 text-left text-xs font-medium text-neutral-500">Critério</th>
                    {ranking.map((r) => (
                      <th key={r.property_id} className="p-2 text-left text-xs font-medium text-neutral-500">
                        {r.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c} className="border-b border-neutral-100 last:border-0">
                      <td className="p-2 text-neutral-700">{c}</td>
                      {ranking.map((r) => {
                        const avg = averageFor(evaluations, r.property_id, c);
                        return (
                          <td key={r.property_id} className="p-2 text-neutral-600">
                            {avg == null ? "—" : avg.toFixed(1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="mt-8 text-lg font-medium text-neutral-800">Propostas</h2>
        <div className="mt-3 space-y-2">
          {proposals.length === 0 && <p className="text-sm text-neutral-400">Nenhuma proposta ainda.</p>}
          {proposals.map((p) => {
            const desagio = p.table_value ? (1 - p.value / p.table_value) * 100 : null;
            return (
              <div key={p.id} className="rounded-md border border-neutral-200 bg-white p-3 text-sm">
                <p className="font-medium text-neutral-800">
                  {propertyById[p.property_id]?.name} — {currency(p.value)}
                </p>
                {desagio != null && (
                  <p className="text-neutral-500">Deságio: {desagio.toFixed(1)}%</p>
                )}
                <p className="text-neutral-500">
                  {p.proposer_name}
                  {p.buy_intent ? " · interesse em comprar" : ""}
                </p>
                {p.note && <p className="mt-1 text-neutral-500">{p.note}</p>}
              </div>
            );
          })}
        </div>

        {!archived && (
          <ProposalForm token={token} properties={properties} onCreated={load} />
        )}
      </div>
    </div>
  );
}

function ProposalForm({ token, properties, onCreated }) {
  const [show, setShow] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [proposerName, setProposerName] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [buyIntent, setBuyIntent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const property = properties.find((p) => p.id === propertyId);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!propertyId || !proposerName.trim() || !value) {
      setError("Preencha imóvel, nome e valor.");
      return;
    }
    setBusy(true);
    try {
      const res = await callFunction("aval-proposal", {
        method: "POST",
        body: {
          token,
          property_id: propertyId,
          unit_id: unitId || null,
          proposer_name: proposerName.trim(),
          value: Number(value),
          note: note.trim() || null,
          buy_intent: buyIntent,
        },
      });
      setResult(res);
      setProposerName("");
      setValue("");
      setNote("");
      setBuyIntent(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-4 rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        + Registrar proposta
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500">Imóvel</label>
        <select
          value={propertyId}
          onChange={(e) => {
            setPropertyId(e.target.value);
            setUnitId("");
          }}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Selecione…</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {property?.units?.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500">Unidade</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {property.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-neutral-500">Seu nome</label>
        <input
          value={proposerName}
          onChange={(e) => setProposerName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500">Valor da proposta</label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500">Observação</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input type="checkbox" checked={buyIntent} onChange={(e) => setBuyIntent(e.target.checked)} className="mt-0.5" />
        <span>
          Tenho interesse em comprar — isso registra sua intenção para a consultoria negociar,
          não é uma proposta formal nem compromisso de compra.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <p className="text-sm text-neutral-600">
          Proposta registrada.{" "}
          {result.desagio != null && `Deságio: ${result.desagio.toFixed(1)}%`}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Registrar proposta"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="text-sm text-neutral-500 underline">
          Fechar
        </button>
      </div>
    </form>
  );
}

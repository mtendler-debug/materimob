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

export default function PublicForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [propertyId, setPropertyId] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    callFunction("aval-form", { params: { token } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <Centered>Carregando…</Centered>;

  if (error) {
    if (error.status === 403) {
      return (
        <Centered>
          <h1 className="text-lg font-medium text-neutral-800">Atendimento encerrado</h1>
        </Centered>
      );
    }
    return (
      <Centered>
        <h1 className="text-lg font-medium text-neutral-800">Link inválido</h1>
      </Centered>
    );
  }

  if (submitted) {
    return (
      <Centered>
        <h1 className="text-lg font-medium text-neutral-800">Obrigado!</h1>
        <p className="mt-2 text-sm text-neutral-500">Sua avaliação foi registrada.</p>
        <button
          onClick={() => {
            setSubmitted(false);
            setPropertyId(null);
          }}
          className="mt-4 text-sm text-neutral-500 underline"
        >
          Avaliar outro imóvel
        </button>
      </Centered>
    );
  }

  const property = data.properties.find((p) => p.id === propertyId);

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-lg">
        <p className="text-sm uppercase tracking-wide text-neutral-400">{data.title}</p>
        {data.subtitle && <p className="mt-1 text-sm text-neutral-500">{data.subtitle}</p>}

        {!property ? (
          <div className="mt-6 space-y-2">
            <p className="text-sm font-medium text-neutral-600">
              Qual imóvel você quer avaliar?
            </p>
            {data.properties.map((p) => (
              <button
                key={p.id}
                onClick={() => setPropertyId(p.id)}
                className="block w-full rounded-md border border-neutral-200 bg-white p-4 text-left hover:border-neutral-400"
              >
                <span className="font-medium text-neutral-800">{p.name}</span>
                {p.address && <span className="block text-sm text-neutral-500">{p.address}</span>}
              </button>
            ))}
          </div>
        ) : (
          <EvaluationForm
            token={token}
            property={property}
            criteria={data.criteria}
            onBack={() => setPropertyId(null)}
            onDone={() => setSubmitted(true)}
          />
        )}
      </div>
    </div>
  );
}

function EvaluationForm({ token, property, criteria, onBack, onDone }) {
  const [unitId, setUnitId] = useState("");
  const [evaluatorName, setEvaluatorName] = useState("");
  const [evaluatorRole, setEvaluatorRole] = useState("");
  const [overallScore, setOverallScore] = useState("");
  const [scores, setScores] = useState({});
  const [strengths, setStrengths] = useState("");
  const [concerns, setConcerns] = useState("");
  const [flagged, setFlagged] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allCriteria = [...criteria, ...(property.extra_criteria ?? [])];

  function setScore(criterion, value) {
    setScores((s) => ({ ...s, [criterion]: value }));
  }

  function toggleFlagged(question) {
    setFlagged((f) => (f.includes(question) ? f.filter((q) => q !== question) : [...f, question]));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!evaluatorName.trim()) {
      setError("Informe seu nome.");
      return;
    }
    setBusy(true);
    try {
      await callFunction("aval-submit", {
        method: "POST",
        body: {
          token,
          property_id: property.id,
          unit_id: unitId || null,
          evaluator_name: evaluatorName.trim(),
          evaluator_role: evaluatorRole.trim() || null,
          scores,
          overall_score: overallScore ? Number(overallScore) : null,
          strengths: strengths.trim() || null,
          concerns: concerns.trim() || null,
          flagged,
        },
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-neutral-500 underline">
        ← escolher outro imóvel
      </button>

      <div className="rounded-md border border-neutral-200 bg-white p-4">
        <p className="font-medium text-neutral-800">{property.name}</p>
        {property.summary && <p className="mt-1 text-sm text-neutral-500">{property.summary}</p>}
      </div>

      {property.units?.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-neutral-500">Unidade (opcional)</label>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Avaliação geral do empreendimento</option>
            {property.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <TextField label="Seu nome" value={evaluatorName} onChange={setEvaluatorName} required />
      <TextField
        label="Sua relação (ex.: comprador, esposa, arquiteta)"
        value={evaluatorRole}
        onChange={setEvaluatorRole}
      />

      <div>
        <label className="block text-xs font-medium text-neutral-500">Nota geral (0 a 10)</label>
        <input
          type="number"
          min={0}
          max={10}
          value={overallScore}
          onChange={(e) => setOverallScore(e.target.value)}
          className="mt-1 w-24 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {allCriteria.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-500">Critérios (1 a 5)</p>
          {allCriteria.map((c) => (
            <div key={c} className="flex items-center justify-between">
              <span className="text-sm text-neutral-700">{c}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setScore(c, n)}
                    className={`h-7 w-7 rounded text-xs ${
                      scores[c] === n
                        ? "bg-neutral-800 text-white"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {property.questions?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-neutral-500">Marcar perguntas para o corretor</p>
          {property.questions.map((q) => (
            <label key={q} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={flagged.includes(q)}
                onChange={() => toggleFlagged(q)}
              />
              {q}
            </label>
          ))}
        </div>
      )}

      <TextArea label="Pontos fortes" value={strengths} onChange={setStrengths} />
      <TextArea label="Ressalvas" value={concerns} onChange={setConcerns} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Enviar avaliação"}
      </button>
    </form>
  );
}

function TextField({ label, value, onChange, required }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

function TextArea({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
    </div>
  );
}

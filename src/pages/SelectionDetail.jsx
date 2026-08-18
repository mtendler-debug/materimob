import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Gantt } from "../components/Gantt";
import { CriteriaPresets } from "../components/CriteriaPresets";

const STAGES = [
  { value: "a-visitar", label: "A visitar" },
  { value: "visitado", label: "Visitado" },
  { value: "negociacao", label: "Negociação" },
  { value: "descartado", label: "Descartado" },
];

const PALETTE = ["#8E24AA", "#1565C0", "#2E7D32", "#00838F", "#D84315", "#6D4C41", "#AD1457", "#5D4037"];

function hoje() {
  return new Date().toISOString().slice(0, 10);
}
function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

export default function SelectionDetail() {
  const { id } = useParams();
  const [selection, setSelection] = useState(null);
  const [properties, setProperties] = useState(null);
  const [evaluations, setEvaluations] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const [
      { data: sel, error: selError },
      { data: props, error: propError },
      { data: evals },
      { data: props2 },
    ] = await Promise.all([
      supabase.from("av_selections").select("*").eq("id", id).single(),
      supabase.from("av_properties").select("*, av_units(*)").eq("selection_id", id).order("position"),
      supabase.from("av_evaluations").select("*").eq("selection_id", id).order("created_at", { ascending: false }),
      supabase.from("av_proposals").select("*").eq("selection_id", id).order("created_at", { ascending: false }),
    ]);
    if (selError) setError("Erro ao carregar seleção: " + selError.message);
    else setSelection(sel);
    if (propError) setError("Erro ao carregar imóveis: " + propError.message);
    else setProperties((props ?? []).map((p) => ({ ...p, units: p.av_units })));
    setEvaluations(evals ?? []);
    setProposals(props2 ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleArchived() {
    const { error: updateError } = await supabase
      .from("av_selections")
      .update({ archived: !selection.archived })
      .eq("id", id);
    if (updateError) setError("Erro ao atualizar: " + updateError.message);
    else load();
  }

  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;
  if (!selection || !properties || !evaluations || !proposals) {
    return <div className="p-6 text-sm text-muted">Carregando…</div>;
  }

  const formLink = `${window.location.origin}/c/${selection.token_form}`;
  const panelLink = `${window.location.origin}/r/${selection.token_panel}`;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app" className="text-sm text-graytext underline">
          ← Minhas seleções
        </Link>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-charcoal">{selection.title}</h1>
            <p className="text-sm text-graytext">{selection.client_name}</p>
          </div>
          <button
            onClick={toggleArchived}
            className="rounded-[10px] border-[1.5px] border-rule px-3 py-1.5 text-sm text-graytext hover:bg-light"
          >
            {selection.archived ? "Reativar" : "Arquivar"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LinkBox label="Link do formulário (cliente avalia)" url={formLink} />
          <LinkBox label="Link do painel (resultados)" url={panelLink} />
        </div>

        <SectionTitle>Questionário</SectionTitle>
        <Questionnaire selection={selection} onSaved={load} />

        <SectionTitle>Etapas do processo (faixa de cima do cronograma)</SectionTitle>
        <MilestonesEditor selection={selection} onSaved={load} />

        <SectionTitle>Imóveis</SectionTitle>
        <div className="space-y-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} onChange={load} />
          ))}
        </div>
        <NewPropertyForm selectionId={id} existingCount={properties.length} onCreated={load} />

        <SectionTitle>Cronograma</SectionTitle>
        <Gantt milestones={selection.milestones} properties={properties} />

        <SectionTitle>Respostas ({evaluations.length})</SectionTitle>
        <EvaluationsTable evaluations={evaluations} properties={properties} onChange={load} />

        <SectionTitle>Propostas ({proposals.length})</SectionTitle>
        <ProposalsTable proposals={proposals} properties={properties} />
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-8 mb-3 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
}

function LinkBox({ label, url }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[11px] border border-rule bg-white p-3">
      <p className="text-xs font-medium text-graytext">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="w-full truncate rounded border border-rule bg-bg px-2 py-1 text-xs text-graytext"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-[9px] bg-charcoal px-2 py-1 text-xs font-bold text-white hover:opacity-90"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function Questionnaire({ selection, onSaved }) {
  const [title, setTitle] = useState(selection.title);
  const [subtitle, setSubtitle] = useState(selection.subtitle ?? "");
  const [criteria, setCriteria] = useState((selection.criteria ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("av_selections")
      .update({ title: title.trim(), subtitle: subtitle.trim() || null, criteria: linesToArray(criteria) })
      .eq("id", selection.id);
    setSaving(false);
    if (error) setMsg("Erro: " + error.message);
    else {
      setMsg("Salvo.");
      onSaved();
    }
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-bold tracking-[.04em] text-graytext uppercase">
            Título do formulário
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold tracking-[.04em] text-graytext uppercase">Subtítulo</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
      </div>
      <label className="mt-3 block text-xs font-bold tracking-[.04em] text-graytext uppercase">
        Critérios aplicados a todos os imóveis (um por linha)
      </label>
      <textarea
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        rows={5}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />
      <CriteriaPresets criteriaText={criteria} onApply={setCriteria} />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar questionário"}
        </button>
        {msg && <span className="text-sm text-graytext">{msg}</span>}
      </div>
    </div>
  );
}

function MilestonesEditor({ selection, onSaved }) {
  const [rows, setRows] = useState(selection.milestones ?? []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function update(i, key, value) {
    setRows((r) => r.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
  }
  function remove(i) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }
  function add() {
    setRows((r) => [...r, { nome: "Nova etapa", inicio: hoje(), fim: hoje() }]);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase.from("av_selections").update({ milestones: rows }).eq("id", selection.id);
    setSaving(false);
    if (error) setMsg("Erro: " + error.message);
    else {
      setMsg("Salvo.");
      onSaved();
    }
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      {rows.map((m, i) => (
        <div key={i} className="mb-[10px] flex flex-wrap items-end gap-[10px]">
          <div className="min-w-[130px] flex-[2]">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Etapa</label>
            <input
              value={m.nome}
              onChange={(e) => update(i, "nome", e.target.value)}
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Início</label>
            <input
              type="date"
              value={m.inicio}
              onChange={(e) => update(i, "inicio", e.target.value)}
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[130px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Fim</label>
            <input
              type="date"
              value={m.fim}
              onChange={(e) => update(i, "fim", e.target.value)}
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={() => remove(i)}
            className="rounded-lg border-[1.5px] border-[#E8D3CD] px-3 py-2 text-xs font-bold text-[#B34A2E]"
          >
            remover
          </button>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={add} className="rounded-[9px] border-[1.5px] border-rule px-3 py-1.5 text-sm font-bold text-charcoal">
          + Adicionar etapa
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar etapas"}
        </button>
        {msg && <span className="text-sm text-graytext">{msg}</span>}
      </div>
    </div>
  );
}

function PropertyCard({ property, onChange }) {
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitValue, setUnitValue] = useState("");

  const [name, setName] = useState(property.name);
  const [color, setColor] = useState(property.color || "#5C5C5C");
  const [address, setAddress] = useState(property.address ?? "");
  const [summary, setSummary] = useState(property.summary ?? "");
  const [extraCriteria, setExtraCriteria] = useState((property.extra_criteria ?? []).join("\n"));
  const [questions, setQuestions] = useState((property.questions ?? []).join("\n"));
  const [phases, setPhases] = useState(property.phases ?? []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function updateStage(stage) {
    await supabase.from("av_properties").update({ stage }).eq("id", property.id);
    onChange();
  }

  function updatePhase(i, key, value) {
    setPhases((r) => r.map((f, idx) => (idx === i ? { ...f, [key]: value } : f)));
  }
  function removePhase(i) {
    setPhases((r) => r.filter((_, idx) => idx !== i));
  }
  function addPhase() {
    setPhases((r) => [...r, { nome: "Nova fase", inicio: hoje(), fim: hoje() }]);
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("av_properties")
      .update({
        name: name.trim(),
        color,
        address: address.trim() || null,
        summary: summary.trim() || null,
        extra_criteria: linesToArray(extraCriteria),
        questions: linesToArray(questions),
        phases,
      })
      .eq("id", property.id);
    setSaving(false);
    if (error) setMsg("Erro: " + error.message);
    else {
      setMsg("Salvo.");
      onChange();
    }
  }

  async function removeProperty() {
    if (!window.confirm(`Remover "${property.name}" do funil? Avaliações e propostas deste imóvel também somem.`)) return;
    await supabase.from("av_properties").delete().eq("id", property.id);
    onChange();
  }

  async function addUnit(e) {
    e.preventDefault();
    if (!unitName.trim()) return;
    await supabase.from("av_units").insert({
      property_id: property.id,
      name: unitName.trim(),
      table_value: unitValue ? Number(unitValue) : null,
    });
    setUnitName("");
    setUnitValue("");
    setShowUnitForm(false);
    onChange();
  }

  async function removeUnit(unitId) {
    await supabase.from("av_units").delete().eq("id", unitId);
    onChange();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <div className="flex flex-wrap items-end gap-[10px]">
        <div className="min-w-[160px] flex-[2]">
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome do imóvel</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Cor</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-[38px] w-[52px] rounded-[9px] border-[1.5px] border-rule p-1"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Etapa no funil</label>
          <select
            value={property.stage}
            onChange={(e) => updateStage(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          >
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Endereço</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">
        Resumo (construtora, arquitetura, metragem, vagas)
      </label>
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">
        Critérios extras só deste imóvel (um por linha)
      </label>
      <textarea
        value={extraCriteria}
        onChange={(e) => setExtraCriteria(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">
        Perguntas para o corretor (uma por linha)
      </label>
      <textarea
        value={questions}
        onChange={(e) => setQuestions(e.target.value)}
        rows={2}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Fases no cronograma</label>
      {phases.map((f, i) => (
        <div key={i} className="mt-2 flex flex-wrap items-end gap-[8px]">
          <div className="min-w-[120px] flex-[2]">
            <input
              value={f.nome}
              onChange={(e) => updatePhase(i, "nome", e.target.value)}
              placeholder="Fase"
              className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <input
            type="date"
            value={f.inicio}
            onChange={(e) => updatePhase(i, "inicio", e.target.value)}
            className="rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={f.fim}
            onChange={(e) => updatePhase(i, "fim", e.target.value)}
            className="rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <button
            onClick={() => removePhase(i)}
            className="rounded-lg border-[1.5px] border-[#E8D3CD] px-3 py-2 text-xs font-bold text-[#B34A2E]"
          >
            ×
          </button>
        </div>
      ))}
      <button onClick={addPhase} className="mt-2 text-xs font-bold text-graytext underline">
        + fase
      </button>

      <label className="mt-4 block text-[11.5px] font-bold text-graytext uppercase">
        Unidades visitadas e valor de tabela
      </label>
      <div className="mt-1 space-y-1">
        {(property.units ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between text-sm text-graytext">
            <span>{u.name}</span>
            <span className="flex items-center gap-2">
              {u.table_value != null && <span>{brl(u.table_value)}</span>}
              <button onClick={() => removeUnit(u.id)} className="text-xs font-bold text-[#B34A2E]">
                ×
              </button>
            </span>
          </div>
        ))}
      </div>

      {showUnitForm ? (
        <form onSubmit={addUnit} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <label className="block text-xs text-graytext">Unidade</label>
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="mt-1 w-full rounded border border-rule px-2 py-1 text-sm"
              placeholder="403 · Sereine · 216 m²"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs text-graytext">Valor tabela</label>
            <input
              type="number"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              className="mt-1 w-full rounded border border-rule px-2 py-1 text-sm"
            />
          </div>
          <button type="submit" className="rounded bg-charcoal px-2 py-1 text-sm font-bold text-white hover:opacity-90">
            Adicionar
          </button>
        </form>
      ) : (
        <button onClick={() => setShowUnitForm(true)} className="mt-3 text-xs font-bold text-graytext underline">
          + unidade
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar imóvel"}
        </button>
        {msg && <span className="text-sm text-graytext">{msg}</span>}
        <button onClick={removeProperty} className="ml-auto text-xs font-bold text-[#B34A2E]">
          remover imóvel
        </button>
      </div>
    </div>
  );
}

function NewPropertyForm({ selectionId, existingCount, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("av_properties").insert({
      selection_id: selectionId,
      name: name.trim(),
      color: PALETTE[existingCount % PALETTE.length],
      phases: [{ nome: "Visita", inicio: hoje(), fim: hoje() }],
      position: existingCount,
    });
    setSaving(false);
    setName("");
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do novo imóvel"
        className="flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        + Novo imóvel
      </button>
    </form>
  );
}

function EvaluationsTable({ evaluations, properties, onChange }) {
  const propertyById = Object.fromEntries(properties.map((p) => [p.id, p]));

  async function remove(id) {
    if (!window.confirm("Excluir esta resposta?")) return;
    await supabase.from("av_evaluations").delete().eq("id", id);
    onChange();
  }

  if (!evaluations.length) {
    return <div className="rounded-[14px] bg-white p-6 text-center text-[13.5px] text-muted">Nenhuma resposta ainda.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <table className="w-full min-w-[600px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {["Quando", "Quem", "Imóvel", "Nota", "Comentários", ""].map((h) => (
              <th key={h} className="bg-charcoal p-[10px] text-left text-[11.5px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evaluations.map((e) => (
            <tr key={e.id}>
              <td className="border-b border-rule p-[10px] text-graytext">
                {new Date(e.created_at).toLocaleString("pt-BR")}
              </td>
              <td className="border-b border-rule p-[10px] font-bold text-charcoal">
                {e.evaluator_name}
                {e.evaluator_role && (
                  <>
                    <br />
                    <span className="text-xs font-normal text-muted">{e.evaluator_role}</span>
                  </>
                )}
              </td>
              <td className="border-b border-rule p-[10px] text-graytext">{propertyById[e.property_id]?.name}</td>
              <td className="border-b border-rule p-[10px] text-center">
                <b>{e.overall_score ?? "—"}</b>
              </td>
              <td className="border-b border-rule p-[10px] text-graytext">
                {e.strengths && (
                  <>
                    <b>+</b> {e.strengths}
                    <br />
                  </>
                )}
                {e.concerns && (
                  <>
                    <b>−</b> {e.concerns}
                  </>
                )}
              </td>
              <td className="border-b border-rule p-[10px] text-right">
                <button
                  onClick={() => remove(e.id)}
                  className="rounded-lg border-[1.5px] border-[#E8D3CD] px-[11px] py-[6px] text-xs font-bold text-[#B34A2E]"
                >
                  excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProposalsTable({ proposals, properties }) {
  const propertyById = Object.fromEntries(properties.map((p) => [p.id, p]));

  if (!proposals.length) {
    return <div className="rounded-[14px] bg-white p-6 text-center text-[13.5px] text-muted">Nenhuma proposta ainda.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <table className="w-full min-w-[600px] border-collapse text-[13.5px]">
        <thead>
          <tr>
            {["Quando", "Quem", "Imóvel", "Tabela", "Proposta", "Deságio", "Interesse"].map((h) => (
              <th key={h} className="bg-charcoal p-[10px] text-left text-[11.5px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {proposals.map((x) => {
            const property = propertyById[x.property_id];
            const desagio = x.table_value ? (1 - x.value / x.table_value) * 100 : null;
            return (
              <tr key={x.id}>
                <td className="border-b border-rule p-[10px] text-graytext">
                  {new Date(x.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="border-b border-rule p-[10px] font-bold text-charcoal">{x.proposer_name}</td>
                <td className="border-b border-rule p-[10px]">
                  <span className="font-bold" style={{ color: property?.color || "#A68A5B" }}>
                    {property?.name}
                  </span>
                </td>
                <td className="border-b border-rule p-[10px] text-right text-graytext">{brl(x.table_value)}</td>
                <td className="border-b border-rule p-[10px] text-right font-bold text-charcoal">{brl(x.value)}</td>
                <td className="border-b border-rule p-[10px] text-center text-graytext">
                  {desagio == null ? "—" : `${(Math.round(desagio * 10) / 10).toFixed(1).replace(".", ",")}%`}
                </td>
                <td className="border-b border-rule p-[10px] text-center">
                  {x.buy_intent ? (
                    <span className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold" style={{ background: "#E3F0E4", color: "#2E7D32" }}>
                      confirmado
                    </span>
                  ) : (
                    <span className="rounded-full bg-light px-[9px] py-[3px] text-[10.5px] font-bold text-graytext">não</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

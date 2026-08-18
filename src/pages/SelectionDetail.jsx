import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

const STAGES = [
  { value: "a-visitar", label: "A visitar" },
  { value: "visitado", label: "Visitado" },
  { value: "negociacao", label: "Negociação" },
  { value: "descartado", label: "Descartado" },
];

export default function SelectionDetail() {
  const { id } = useParams();
  const [selection, setSelection] = useState(null);
  const [properties, setProperties] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const [{ data: sel, error: selError }, { data: props, error: propError }] = await Promise.all([
      supabase.from("av_selections").select("*").eq("id", id).single(),
      supabase
        .from("av_properties")
        .select("*, av_units(*)")
        .eq("selection_id", id)
        .order("position"),
    ]);
    if (selError) setError("Erro ao carregar seleção: " + selError.message);
    else setSelection(sel);
    if (propError) setError("Erro ao carregar imóveis: " + propError.message);
    else setProperties(props);
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
  if (!selection || !properties) return <div className="p-6 text-sm text-neutral-400">Carregando…</div>;

  const formLink = `${window.location.origin}/c/${selection.token_form}`;
  const panelLink = `${window.location.origin}/r/${selection.token_panel}`;

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app" className="text-sm text-neutral-500 underline">
          ← Minhas seleções
        </Link>

        <div className="mt-3 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-medium text-neutral-800">{selection.title}</h1>
            <p className="text-sm text-neutral-500">{selection.client_name}</p>
          </div>
          <button
            onClick={toggleArchived}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            {selection.archived ? "Reativar" : "Arquivar"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <LinkBox label="Link do formulário (cliente avalia)" url={formLink} />
          <LinkBox label="Link do painel (resultados)" url={panelLink} />
        </div>

        <h2 className="mt-8 text-lg font-medium text-neutral-800">Imóveis</h2>
        <div className="mt-3 space-y-3">
          {properties.map((p) => (
            <PropertyCard key={p.id} property={p} onChange={load} />
          ))}
        </div>

        <NewPropertyForm selectionId={id} onCreated={load} />
      </div>
    </div>
  );
}

function LinkBox({ label, url }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="w-full truncate rounded border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-600"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded bg-neutral-800 px-2 py-1 text-xs text-white hover:bg-neutral-700"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function PropertyCard({ property, onChange }) {
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [savingUnit, setSavingUnit] = useState(false);

  async function updateStage(stage) {
    await supabase.from("av_properties").update({ stage }).eq("id", property.id);
    onChange();
  }

  async function addUnit(e) {
    e.preventDefault();
    if (!unitName.trim()) return;
    setSavingUnit(true);
    await supabase.from("av_units").insert({
      property_id: property.id,
      name: unitName.trim(),
      table_value: unitValue ? Number(unitValue) : null,
    });
    setSavingUnit(false);
    setUnitName("");
    setUnitValue("");
    setShowUnitForm(false);
    onChange();
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-neutral-800">{property.name}</p>
        <select
          value={property.stage}
          onChange={(e) => updateStage(e.target.value)}
          className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-600"
        >
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {property.address && <p className="mt-1 text-sm text-neutral-500">{property.address}</p>}

      <div className="mt-3 space-y-1">
        {(property.av_units ?? []).map((u) => (
          <div key={u.id} className="flex justify-between text-sm text-neutral-600">
            <span>{u.name}</span>
            {u.table_value != null && (
              <span>
                {Number(u.table_value).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            )}
          </div>
        ))}
      </div>

      {showUnitForm ? (
        <form onSubmit={addUnit} className="mt-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs text-neutral-500">Unidade</label>
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
              placeholder="403 · Sereine · 216 m²"
            />
          </div>
          <div className="w-32">
            <label className="block text-xs text-neutral-500">Valor tabela</label>
            <input
              type="number"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={savingUnit}
            className="rounded bg-neutral-800 px-2 py-1 text-sm text-white hover:bg-neutral-700"
          >
            Adicionar
          </button>
        </form>
      ) : (
        <button
          onClick={() => setShowUnitForm(true)}
          className="mt-3 text-xs text-neutral-500 underline"
        >
          + unidade
        </button>
      )}
    </div>
  );
}

function NewPropertyForm({ selectionId, onCreated }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("av_properties").insert({
      selection_id: selectionId,
      name: name.trim(),
      address: address.trim() || null,
      summary: summary.trim() || null,
    });
    setSaving(false);
    setName("");
    setAddress("");
    setSummary("");
    setShow(false);
    onCreated();
  }

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-4 rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
      >
        + Novo imóvel
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-md border border-neutral-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-neutral-500">Nome</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Endereço</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-500">Resumo</label>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Adicionar imóvel"}
        </button>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="text-sm text-neutral-500 underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

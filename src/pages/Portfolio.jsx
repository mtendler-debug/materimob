import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";

function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

export default function Portfolio() {
  const { org, role, loading: loadingOrg } = useOrganization();
  const [properties, setProperties] = useState(null);
  const manage = canManage(role);

  async function load() {
    const { data } = await supabase
      .from("av_portfolio_properties")
      .select("*, av_portfolio_units(*)")
      .order("name");
    setProperties((data ?? []).map((p) => ({ ...p, units: p.av_portfolio_units })));
  }

  useEffect(() => {
    if (org) load();
  }, [org]);

  if (loadingOrg) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  if (!org) {
    return (
      <div className="min-h-screen bg-bg p-6">
        <div className="mx-auto max-w-2xl">
          <Link to="/app" className="text-sm text-graytext underline">
            ← Minhas seleções
          </Link>
          <p className="mt-4 text-sm text-graytext">
            O portfólio é um catálogo compartilhado dentro de uma organização. Você ainda não faz
            parte de uma —{" "}
            <Link to="/app/organizacao" className="underline">
              crie ou entre em uma
            </Link>{" "}
            para usar isso.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/app" className="text-sm text-graytext underline">
          ← Minhas seleções
        </Link>
        <h1 className="mt-3 text-xl font-bold text-charcoal">Portfólio · {org.name}</h1>
        <p className="text-sm text-graytext">
          {manage
            ? "Imóveis cadastrados aqui ficam disponíveis para todo o time importar nas seleções dos clientes."
            : "Imóveis que o time pode importar direto nas seleções dos clientes."}
        </p>

        <div className="mt-4 space-y-3">
          {properties === null && <p className="text-sm text-muted">Carregando…</p>}
          {properties?.length === 0 && <p className="text-sm text-muted">Nenhum imóvel no portfólio ainda.</p>}
          {properties?.map((p) =>
            manage ? (
              <PortfolioPropertyEditor key={p.id} property={p} onChange={load} />
            ) : (
              <PortfolioPropertyView key={p.id} property={p} />
            ),
          )}
        </div>

        {manage && <NewPortfolioProperty organizationId={org.id} onCreated={load} />}
      </div>
    </div>
  );
}

function PortfolioPropertyView({ property }) {
  return (
    <div className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${property.color || "#A68A5B"}` }}>
      <p className="font-bold text-charcoal">{property.name}</p>
      {property.address && <p className="text-sm text-graytext">{property.address}</p>}
      {property.summary && <p className="text-xs text-graytext">{property.summary}</p>}
      {property.units?.length > 0 && (
        <div className="mt-2 space-y-1">
          {property.units.map((u) => (
            <div key={u.id} className="flex justify-between text-sm text-graytext">
              <span>{u.name}</span>
              {u.table_value != null && <span>{brl(u.table_value)}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PortfolioPropertyEditor({ property, onChange }) {
  const [name, setName] = useState(property.name);
  const [color, setColor] = useState(property.color || "#5C5C5C");
  const [address, setAddress] = useState(property.address ?? "");
  const [summary, setSummary] = useState(property.summary ?? "");
  const [extraCriteria, setExtraCriteria] = useState((property.extra_criteria ?? []).join("\n"));
  const [questions, setQuestions] = useState((property.questions ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [showUnitForm, setShowUnitForm] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("av_portfolio_properties")
      .update({
        name: name.trim(),
        color,
        address: address.trim() || null,
        summary: summary.trim() || null,
        extra_criteria: linesToArray(extraCriteria),
        questions: linesToArray(questions),
      })
      .eq("id", property.id);
    setSaving(false);
    if (error) setMsg("Erro: " + error.message);
    else {
      setMsg("Salvo.");
      onChange();
    }
  }

  async function remove() {
    if (!window.confirm(`Remover "${property.name}" do portfólio?`)) return;
    await supabase.from("av_portfolio_properties").delete().eq("id", property.id);
    onChange();
  }

  async function addUnit(e) {
    e.preventDefault();
    if (!unitName.trim()) return;
    await supabase.from("av_portfolio_units").insert({
      portfolio_property_id: property.id,
      name: unitName.trim(),
      table_value: unitValue ? Number(unitValue) : null,
    });
    setUnitName("");
    setUnitValue("");
    setShowUnitForm(false);
    onChange();
  }

  async function removeUnit(unitId) {
    await supabase.from("av_portfolio_units").delete().eq("id", unitId);
    onChange();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <div className="flex flex-wrap items-end gap-[10px]">
        <div className="min-w-[160px] flex-[2]">
          <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome</label>
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
      </div>

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Endereço</label>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Resumo</label>
      <input
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />

      <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">
        Critérios extras (um por linha)
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

      <label className="mt-4 block text-[11.5px] font-bold text-graytext uppercase">Unidades</label>
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
        <form onSubmit={addUnit} className="mt-2 flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <input
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              placeholder="403 · Sereine · 216 m²"
              className="w-full rounded border border-rule px-2 py-1 text-sm"
            />
          </div>
          <input
            type="number"
            value={unitValue}
            onChange={(e) => setUnitValue(e.target.value)}
            placeholder="Valor de tabela"
            className="w-32 rounded border border-rule px-2 py-1 text-sm"
          />
          <button type="submit" className="rounded bg-charcoal px-2 py-1 text-sm font-bold text-white">
            Adicionar
          </button>
        </form>
      ) : (
        <button onClick={() => setShowUnitForm(true)} className="mt-2 text-xs font-bold text-graytext underline">
          + unidade
        </button>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {msg && <span className="text-sm text-graytext">{msg}</span>}
        <button onClick={remove} className="ml-auto text-xs font-bold text-[#B34A2E]">
          remover do portfólio
        </button>
      </div>
    </div>
  );
}

function NewPortfolioProperty({ organizationId, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await supabase.from("av_portfolio_properties").insert({ organization_id: organizationId, name: name.trim() });
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
        + Novo imóvel no portfólio
      </button>
    </form>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { loadCatalogItems } from "../../lib/catalogo";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  SOURCES,
  SOURCE_LABELS,
  OPP_TYPES,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
  OPP_STAGES,
  OPP_STAGE_LABELS,
  OPP_STAGE_ATIVA,
  brl,
} from "../../lib/crm";

function SectionTitle({ children }) {
  return <p className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</p>;
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [selections, setSelections] = useState(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("av_leads")
      .select("*, av_clients(id, name, phone, email), av_opportunities(*)")
      .eq("id", id)
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setLead(data);
    setStage(data.stage);
    setSource(data.source ?? "");
    setNotes(data.notes ?? "");

    const { data: sels } = await supabase
      .from("av_selections")
      .select("id, title, created_at")
      .eq("client_id", data.av_clients.id)
      .order("created_at", { ascending: false });
    setSelections(sels ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function salvar() {
    setSaving(true);
    await supabase
      .from("av_leads")
      .update({ stage, source: source || null, notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(false);
    load();
  }

  async function removerLead() {
    if (!window.confirm("Remover este lead? As oportunidades vinculadas também somem.")) return;
    await supabase.from("av_leads").delete().eq("id", id);
    navigate("/app/crm/leads");
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!lead) return <p className="text-sm text-muted">Carregando…</p>;

  const oportunidadesAtivas = (lead.av_opportunities ?? []).filter((o) => OPP_STAGE_ATIVA(o.stage));
  const temCompra = oportunidadesAtivas.some((o) => o.type === "compra");
  const temVenda = oportunidadesAtivas.some((o) => o.type === "venda");
  const oportunidadeCruzada = temCompra && temVenda;
  const volumeTotal = oportunidadesAtivas.reduce((s, o) => s + (o.value ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link to="/app/crm/leads" className="text-xs text-graytext underline">
        ← Leads
      </Link>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-[14px] border border-rule bg-white p-4">
            <p className="font-serif text-lg font-semibold text-charcoal">{lead.av_clients?.name}</p>
            <p className="text-sm text-graytext">
              {lead.av_clients?.phone || "sem telefone"} · {lead.av_clients?.email || "sem e-mail"}
            </p>
            <p className="mt-1 text-xs text-muted">
              Lead desde {new Date(lead.created_at).toLocaleDateString("pt-BR")} · volume ativo {brl(volumeTotal)}
            </p>

            {oportunidadeCruzada && (
              <div className="mt-3 rounded-[10px] bg-[#FFF3E0] px-3 py-2 text-[13px] font-bold text-[#B26A00]">
                🔗 Oportunidade cruzada — este lead tem Compra e Venda ao mesmo tempo.
              </div>
            )}

            <div className="mt-3">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Etapa</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              >
                {LEAD_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Origem</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Notas</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={salvar}
                disabled={saving}
                className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={removerLead} className="text-sm font-bold text-[#B34A2E] underline">
                excluir lead
              </button>
            </div>
          </div>

          {selections?.length > 0 && (
            <div>
              <SectionTitle>Roteiros deste cliente no Avaliador</SectionTitle>
              <div className="space-y-2">
                {selections.map((s) => (
                  <Link
                    key={s.id}
                    to={`/app/selections/${s.id}`}
                    className="flex items-center justify-between rounded-[11px] border border-rule bg-white px-3 py-2 text-sm hover:border-gold"
                  >
                    <span className="text-charcoal">{s.title}</span>
                    <span className="text-graytext">{new Date(s.created_at).toLocaleDateString("pt-BR")}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <SectionTitle>Oportunidades</SectionTitle>
          <div className="space-y-2">
            {(lead.av_opportunities ?? []).map((o) => (
              <OpportunityRow key={o.id} opportunity={o} onChange={load} />
            ))}
            {(lead.av_opportunities ?? []).length === 0 && (
              <p className="text-sm text-muted">Nenhuma oportunidade ainda.</p>
            )}
          </div>
          <NewOpportunityForm leadId={lead.id} onCreated={load} />
        </div>
      </div>
    </div>
  );
}

// Oportunidade pode apontar pra um imóvel de verdade do Avaliador —
// estoque de portfólio ou lançamento, mesma lista unificada de
// src/lib/catalogo.js já usada em /app/imoveis — ou ficar só no texto
// livre (ex.: a casa do próprio cliente, que não está no estoque de
// ninguém). Escolher um item preenche "property" com o nome dele, pra
// telas que só leem esse campo (kanban, listagens) continuarem
// funcionando sem mudança.
function PropertyPicker({ portfolioPropertyId, launchId, propertyText, onChange }) {
  const [items, setItems] = useState(null);

  useEffect(() => {
    loadCatalogItems().then(setItems);
  }, []);

  const selectedValue = launchId ? `lancamento:${launchId}` : portfolioPropertyId ? `portfolio:${portfolioPropertyId}` : "";
  const lancamentos = (items ?? []).filter((i) => i.kind === "lancamento");
  const portfolio = (items ?? []).filter((i) => i.kind === "portfolio");

  function handleSelect(e) {
    const v = e.target.value;
    if (!v) {
      onChange({ portfolio_property_id: null, launch_id: null, property: propertyText });
      return;
    }
    const [kind, id] = v.split(":");
    const item = items?.find((i) => i.kind === kind && i.id === id);
    onChange({
      portfolio_property_id: kind === "portfolio" ? id : null,
      launch_id: kind === "lancamento" ? id : null,
      property: item?.name ?? propertyText,
    });
  }

  return (
    <div>
      <select value={selectedValue} onChange={handleSelect} className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm">
        <option value="">Digitar manualmente…</option>
        {lancamentos.length > 0 && (
          <optgroup label="Lançamentos">
            {lancamentos.map((i) => (
              <option key={i.id} value={`lancamento:${i.id}`}>
                {i.name}
                {i.orgName ? ` · ${i.orgName}` : ""}
              </option>
            ))}
          </optgroup>
        )}
        {portfolio.length > 0 && (
          <optgroup label="Estoque (portfólio)">
            {portfolio.map((i) => (
              <option key={i.id} value={`portfolio:${i.id}`}>
                {i.name}
                {i.orgName ? ` · ${i.orgName}` : ""}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {!launchId && !portfolioPropertyId && (
        <input
          value={propertyText}
          onChange={(e) => onChange({ portfolio_property_id: null, launch_id: null, property: e.target.value })}
          placeholder="Descrição do imóvel (ex.: casa do cliente)"
          className="mt-2 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}

function OpportunityRow({ opportunity, onChange }) {
  const [editing, setEditing] = useState(false);
  const [property, setProperty] = useState(opportunity.property ?? "");
  const [portfolioPropertyId, setPortfolioPropertyId] = useState(opportunity.portfolio_property_id ?? null);
  const [launchId, setLaunchId] = useState(opportunity.launch_id ?? null);
  const [value, setValue] = useState(opportunity.value ?? "");
  const [stage, setStage] = useState(opportunity.stage);
  const [notes, setNotes] = useState(opportunity.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    setSaving(true);
    await supabase
      .from("av_opportunities")
      .update({
        property: property.trim() || null,
        portfolio_property_id: portfolioPropertyId,
        launch_id: launchId,
        value: value === "" ? null : Number(value),
        stage,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", opportunity.id);
    setSaving(false);
    setEditing(false);
    onChange();
  }

  async function remover() {
    if (!window.confirm("Remover esta oportunidade?")) return;
    await supabase.from("av_opportunities").delete().eq("id", opportunity.id);
    onChange();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold"
          style={{ background: OPP_TYPE_COLORS[opportunity.type].bg, color: OPP_TYPE_COLORS[opportunity.type].color }}
        >
          {OPP_TYPE_LABELS[opportunity.type]}
        </span>
        <span className="text-xs font-bold text-graytext">{OPP_STAGE_LABELS[opportunity.stage]}</span>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <PropertyPicker
            portfolioPropertyId={portfolioPropertyId}
            launchId={launchId}
            propertyText={property}
            onChange={({ portfolio_property_id, launch_id, property: p }) => {
              setPortfolioPropertyId(portfolio_property_id);
              setLaunchId(launch_id);
              setProperty(p);
            }}
          />
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Valor estimado"
            className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          >
            {OPP_STAGES.map((s) => (
              <option key={s} value={s}>
                {OPP_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Notas"
            className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={salvar}
              disabled={saving}
              className="rounded bg-charcoal px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              {saving ? "Salvando…" : "salvar"}
            </button>
            <button onClick={() => setEditing(false)} className="text-xs font-bold text-graytext underline">
              cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm">
          <p className="text-charcoal">
            {opportunity.property || "—"}
            {opportunity.launch_id && <span className="ml-1 text-xs text-muted">(lançamento)</span>}
            {opportunity.portfolio_property_id && <span className="ml-1 text-xs text-muted">(estoque)</span>}
          </p>
          <p className="text-graytext">{brl(opportunity.value)}</p>
          {opportunity.notes && <p className="mt-1 text-xs text-graytext">{opportunity.notes}</p>}
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => setEditing(true)} className="text-xs font-bold text-graytext underline">
              editar
            </button>
            <button onClick={remover} className="text-xs font-bold text-[#B34A2E] underline">
              excluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewOpportunityForm({ leadId, onCreated }) {
  const [show, setShow] = useState(false);
  const [type, setType] = useState("compra");
  const [property, setProperty] = useState("");
  const [portfolioPropertyId, setPortfolioPropertyId] = useState(null);
  const [launchId, setLaunchId] = useState(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("av_opportunities").insert({
      lead_id: leadId,
      type,
      property: property.trim() || null,
      portfolio_property_id: portfolioPropertyId,
      launch_id: launchId,
      value: value === "" ? null : Number(value),
    });
    setSaving(false);
    setProperty("");
    setPortfolioPropertyId(null);
    setLaunchId(null);
    setValue("");
    setShow(false);
    onCreated();
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="mt-3 text-sm font-bold text-graytext underline">
        + Nova oportunidade
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-[14px] border border-rule bg-white p-3">
      <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm">
        {OPP_TYPES.map((t) => (
          <option key={t} value={t}>
            {OPP_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <PropertyPicker
        portfolioPropertyId={portfolioPropertyId}
        launchId={launchId}
        propertyText={property}
        onChange={({ portfolio_property_id, launch_id, property: p }) => {
          setPortfolioPropertyId(portfolio_property_id);
          setLaunchId(launch_id);
          setProperty(p);
        }}
      />
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor estimado"
        className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-charcoal px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? "Criando…" : "criar"}
        </button>
        <button type="button" onClick={() => setShow(false)} className="text-xs font-bold text-graytext underline">
          cancelar
        </button>
      </div>
    </form>
  );
}

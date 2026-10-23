import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useOrganization, canManage } from "../lib/useOrganization";
import { parseCsv, downloadCsv } from "../lib/csv";
import { ImageUploader } from "../components/ImageUploader";
import { UnitEditRow } from "../components/UnitEditRow";
import { BookImporter } from "../components/BookImporter";
import { geocodeAddress } from "../lib/geocode";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

function linesToArray(text) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function Portfolio() {
  const { user } = useAuth();
  const { org, role, loading: loadingOrg } = useOrganization();
  const [properties, setProperties] = useState(null);
  const [selId, setSelId] = useState(null);
  const [novoAberto, setNovoAberto] = useState(false);

  // Quem é gerente+ de uma organização gerencia o estoque dela (uso via
  // /app/estoque); todo mundo mais — inclusive corretor sozinho, sem
  // organização nenhuma — gerencia o próprio estoque pessoal. Nunca os
  // dois ao mesmo tempo, e sempre funciona: não existe mais tela de
  // "você precisa de uma organização".
  const dono =
    org && canManage(role)
      ? { coluna: "organization_id", id: org.id }
      : { coluna: "user_id", id: user?.id };

  async function load() {
    if (!dono.id) return;
    const { data } = await supabase
      .from("av_portfolio_properties")
      .select("*, av_portfolio_units(*)")
      .eq(dono.coluna, dono.id)
      .order("name");
    setProperties((data ?? []).map((p) => ({ ...p, units: p.av_portfolio_units })));
  }

  useEffect(() => {
    if (!loadingOrg) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOrg, dono.coluna, dono.id]);

  if (loadingOrg) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  const selecionado = properties?.find((p) => p.id === selId) ?? null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1000px] px-4 py-8 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">
              {dono.coluna === "organization_id" ? `Portfólio · ${org.name}` : "Meu estoque"}
            </h1>
            <p className="mt-1.5 max-w-[60ch] text-base text-graytext">
              {dono.coluna === "organization_id"
                ? "Imóveis cadastrados aqui ficam disponíveis para todo o time importar nos roteiros dos clientes."
                : "Os imóveis que você mesmo representa. Só você vê, e pode escolher quais mostrar em cada roteiro."}
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-2">
            <Button onClick={() => setNovoAberto(true)}>+ Novo imóvel</Button>
            <ImportSpreadsheet dono={dono} onImported={load} />
            <BookImporter kind="portfolio" ownerFields={{ [dono.coluna]: dono.id }} onImported={load} />
          </div>
        </div>

        {properties === null && <p className="mt-8 text-body-sm text-muted">Carregando…</p>}
        {properties?.length === 0 && (
          <div className="mt-10 rounded-card border border-dashed border-slate-300 py-14 text-center">
            <b className="block text-body text-charcoal">Nenhum imóvel cadastrado ainda</b>
            <p className="mt-1 text-body-sm text-graytext">Cadastre o primeiro, importe uma planilha ou envie um book.</p>
            <Button className="mt-5" onClick={() => setNovoAberto(true)}>
              + Novo imóvel
            </Button>
          </div>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {properties?.map((p) => (
            <CartaoImovel key={p.id} property={p} onOpen={() => setSelId(p.id)} />
          ))}
        </div>
      </div>

      {selecionado && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelId(null)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Editar ${selecionado.name}`}
            className="absolute inset-x-0 top-[8%] bottom-0 flex flex-col rounded-t-sheet bg-white shadow-float md:inset-y-0 md:right-0 md:left-auto md:w-[520px] md:rounded-none"
          >
            <div className="flex items-center gap-3 border-b border-slate-200/70 px-6 py-4">
              <span
                className="h-9 w-9 flex-none rounded-[11px]"
                style={{ background: `linear-gradient(135deg, ${selecionado.color || "#5C5C5C"}, ${selecionado.color || "#5C5C5C"}bb)` }}
              />
              <h2 className="min-w-0 flex-1 truncate text-title font-semibold tracking-tight text-charcoal">{selecionado.name}</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelId(null)} aria-label="Fechar">
                ✕
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pt-5">
              <PortfolioPropertyEditor key={selecionado.id} property={selecionado} onChange={load} />
            </div>
          </aside>
        </div>
      )}

      <NovoImovelModal
        open={novoAberto}
        onClose={() => setNovoAberto(false)}
        dono={dono}
        onCreated={async (novoId) => {
          await load();
          setNovoAberto(false);
          if (novoId) setSelId(novoId);
        }}
      />
    </div>
  );
}

const STATUS_VAZIO = "disponivel";

function CartaoImovel({ property: p, onOpen }) {
  const unidades = p.units ?? [];
  const disp = unidades.filter((u) => (u.status ?? STATUS_VAZIO) === "disponivel").length;
  const res = unidades.filter((u) => u.status === "reservada").length;
  const vend = unidades.filter((u) => u.status === "vendida").length;
  const valores = unidades.filter((u) => u.status !== "vendida" && u.table_value != null).map((u) => u.table_value);
  const menor = valores.length ? Math.min(...valores) : null;
  const cor = p.color || "#5C5C5C";

  return (
    <button
      onClick={onOpen}
      className="flex min-w-0 flex-col gap-3 rounded-[22px] border border-slate-200/70 bg-white p-3 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="h-[104px] rounded-[14px]" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}bb)` }} />
      <div className="grid gap-1 px-2 pb-1.5">
        <h3 className="text-[17px] font-semibold tracking-tight text-charcoal">{p.name}</h3>
        {p.address && <p className="text-body-sm text-graytext">{p.address}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {unidades.length === 0 && <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">Sem unidades</span>}
            {disp > 0 && <span className="rounded-full bg-success-bg px-2.5 py-0.5 text-caption font-semibold text-success-text">{disp} disponíve{disp > 1 ? "is" : "l"}</span>}
            {res > 0 && <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-caption font-semibold text-warning-text">{res} reservada{res > 1 ? "s" : ""}</span>}
            {vend > 0 && <span className="rounded-full bg-danger-bg px-2.5 py-0.5 text-caption font-semibold text-danger-text">{vend} vendida{vend > 1 ? "s" : ""}</span>}
          </div>
          {menor != null && <span className="font-bold tracking-tight text-charcoal tabular-nums">R$ {Math.round(menor).toLocaleString("pt-BR")}</span>}
        </div>
      </div>
    </button>
  );
}

function PortfolioPropertyEditor({ property, onChange }) {
  const { confirm, toast } = useFeedback();
  const [name, setName] = useState(property.name);
  const [color, setColor] = useState(property.color || "#5C5C5C");
  const [address, setAddress] = useState(property.address ?? "");
  const [summary, setSummary] = useState(property.summary ?? "");
  const [extraCriteria, setExtraCriteria] = useState((property.extra_criteria ?? []).join("\n"));
  const [extraUnitCriteria, setExtraUnitCriteria] = useState((property.extra_unit_criteria ?? []).join("\n"));
  const [questions, setQuestions] = useState((property.questions ?? []).join("\n"));
  const [floorPlanUrl, setFloorPlanUrl] = useState(property.floor_plan_url ?? null);
  const [photoUrls, setPhotoUrls] = useState(property.photo_urls ?? []);
  const [paymentTerms, setPaymentTerms] = useState(property.payment_terms ?? "");
  const [condoValue, setCondoValue] = useState(property.condo_value ?? "");
  const [iptuValue, setIptuValue] = useState(property.iptu_value ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [unitName, setUnitName] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [showUnitForm, setShowUnitForm] = useState(false);

  async function save() {
    setSaving(true);
    setMsg("");
    const trimmedAddress = address.trim();
    let coords = { latitude: property.latitude ?? null, longitude: property.longitude ?? null };
    if (trimmedAddress !== (property.address ?? "")) {
      const geo = trimmedAddress ? await geocodeAddress(trimmedAddress) : null;
      coords = { latitude: geo?.lat ?? null, longitude: geo?.lng ?? null };
    }
    const { error } = await supabase
      .from("av_portfolio_properties")
      .update({
        name: name.trim(),
        color,
        address: trimmedAddress || null,
        ...coords,
        summary: summary.trim() || null,
        extra_criteria: linesToArray(extraCriteria),
        extra_unit_criteria: linesToArray(extraUnitCriteria),
        questions: linesToArray(questions),
        floor_plan_url: floorPlanUrl,
        photo_urls: photoUrls,
        payment_terms: paymentTerms.trim() || null,
        condo_value: condoValue === "" ? null : Number(condoValue),
        iptu_value: iptuValue === "" ? null : Number(iptuValue),
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
    if (!(await confirm(`Remover "${property.name}" do portfólio?`))) return;
    await supabase.from("av_portfolio_properties").delete().eq("id", property.id);
    onChange();
    toast(`"${property.name}" removido do portfólio.`);
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

  async function saveUnit(unitId, dados) {
    await supabase.from("av_portfolio_units").update(dados).eq("id", unitId);
    onChange();
  }

  async function markSold(unitId) {
    if (!(await confirm("Marcar esta unidade como vendida?", { tone: "warning", confirmLabel: "Marcar como vendida" }))) return;
    await supabase.from("av_portfolio_units").update({ status: "vendida" }).eq("id", unitId);
    onChange();
    toast("Unidade marcada como vendida.");
  }

  async function releaseUnit(unitId) {
    if (!(await confirm("Desfazer a reserva desta unidade?", { tone: "warning", confirmLabel: "Desfazer reserva" }))) return;
    await supabase
      .from("av_portfolio_units")
      .update({ status: "disponivel", reserved_by: null, reserved_for: null })
      .eq("id", unitId);
    onChange();
    toast("Reserva desfeita.");
  }

  const area = `${classesCampo} min-h-[84px] py-3`;
  return (
    <div className="space-y-7 pb-2">
      <Bloco titulo="Dados">
        <div className="grid grid-cols-[1fr_auto] items-end gap-3.5">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <span className="mb-1.5 block text-caption font-medium text-graytext">Cor</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Cor do imóvel"
              className="h-11 w-14 cursor-pointer rounded-control border border-slate-200 bg-white p-1"
            />
          </div>
        </div>
        <Input label="Endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input label="Resumo" value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Bloco>

      <Bloco titulo="Planta e fotos">
        <div className="flex flex-wrap gap-4">
          <ImageUploader label="Planta do imóvel" value={floorPlanUrl} onChange={setFloorPlanUrl} multiple={false} />
          <ImageUploader label="Fotos" value={photoUrls} onChange={setPhotoUrls} multiple={true} />
        </div>
      </Bloco>

      <Bloco titulo="Condições e critérios">
        <Campo label="Condições de pagamento">
          <textarea
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            rows={2}
            placeholder="Ex.: 10% entrada + 30% obra + 60% financiamento"
            className={area}
          />
        </Campo>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label="Condomínio" type="number" value={condoValue} onChange={(e) => setCondoValue(e.target.value)} placeholder="Valor mensal" />
          <Input label="IPTU" type="number" value={iptuValue} onChange={(e) => setIptuValue(e.target.value)} placeholder="Valor mensal" />
        </div>
        <Campo label="Critérios extras (um por linha)">
          <textarea value={extraCriteria} onChange={(e) => setExtraCriteria(e.target.value)} rows={2} className={area} />
        </Campo>
        <Campo label="Critérios extras das unidades (um por linha)">
          <textarea value={extraUnitCriteria} onChange={(e) => setExtraUnitCriteria(e.target.value)} rows={2} className={area} />
        </Campo>
        <Campo label="Perguntas para o corretor (uma por linha)">
          <textarea value={questions} onChange={(e) => setQuestions(e.target.value)} rows={2} className={area} />
        </Campo>
      </Bloco>

      <Bloco titulo="Unidades">
        <div className="space-y-1">
          {(property.units ?? []).map((u) => (
            <UnitEditRow key={u.id} unit={u} onSave={saveUnit} onRemove={removeUnit} onMarkSold={markSold} onRelease={releaseUnit} />
          ))}
        </div>
        {showUnitForm ? (
          <form onSubmit={addUnit} className="flex flex-wrap items-end gap-2">
            <div className="min-w-[160px] flex-1">
              <Input value={unitName} onChange={(e) => setUnitName(e.target.value)} placeholder="403 · Sereine · 216 m²" aria-label="Nome da unidade" />
            </div>
            <div className="w-36">
              <Input type="number" value={unitValue} onChange={(e) => setUnitValue(e.target.value)} placeholder="Valor de tabela" aria-label="Valor de tabela" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        ) : (
          <div>
            <Button variant="secondary" size="sm" onClick={() => setShowUnitForm(true)}>
              + Unidade
            </Button>
          </div>
        )}
      </Bloco>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-3 border-t border-slate-200/70 bg-white/90 px-6 py-3.5 backdrop-blur-xl">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        {msg && <span className="text-body-sm text-graytext">{msg}</span>}
        <button
          onClick={remove}
          className="ml-auto min-h-9 rounded-[10px] px-3 text-caption font-medium text-graytext transition-all duration-200 hover:bg-danger-bg hover:text-danger-text"
        >
          Remover do portfólio
        </button>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <section className="space-y-3.5">
      <h3 className="text-caption font-semibold tracking-[.08em] text-muted uppercase">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-caption font-medium text-graytext">{label}</label>
      {children}
    </div>
  );
}

const TEMPLATE_HEADER = [
  "Nome do imóvel",
  "Endereço",
  "Resumo",
  "Critérios extras (separe com |)",
  "Nome da unidade",
  "Valor de tabela",
];
const TEMPLATE_EXAMPLE = [
  ["Residencial Jardins", "Rua das Flores, 100", "Construtora Alfa · 3 quartos · 2 vagas", "Vista para o parque|Piscina aquecida", "101 · 80 m²", "650000"],
  ["Residencial Jardins", "Rua das Flores, 100", "Construtora Alfa · 3 quartos · 2 vagas", "Vista para o parque|Piscina aquecida", "102 · 95 m²", "720000"],
  ["Cobertura Vista Mar", "Av. Beira Mar, 500", "", "", "", ""],
];

function ImportSpreadsheet({ dono, onImported }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  function baixarModelo() {
    downloadCsv("modelo-portfolio.csv", [TEMPLATE_HEADER, ...TEMPLATE_EXAMPLE]);
  }

  function parseValor(raw) {
    const digits = String(raw ?? "").replace(/\D/g, "");
    return digits ? Number(digits) : null;
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const dataRows = rows.slice(1).filter((r) => (r[0] ?? "").trim());

      const groups = new Map();
      for (const r of dataRows) {
        const nome = (r[0] ?? "").trim();
        if (!groups.has(nome)) groups.set(nome, []);
        groups.get(nome).push(r);
      }
      if (groups.size === 0) {
        setMsg({ type: "err", text: "Nenhuma linha válida encontrada — confira se preencheu a coluna \"Nome do imóvel\"." });
        return;
      }

      let propCount = 0;
      let unitCount = 0;
      for (const [nome, linhas] of groups) {
        const first = linhas.find((r) => (r[1] ?? "").trim() || (r[2] ?? "").trim() || (r[3] ?? "").trim()) ?? linhas[0];
        const endereco = (first[1] ?? "").trim() || null;
        const resumo = (first[2] ?? "").trim() || null;
        const criterios = (first[3] ?? "")
          .split("|")
          .map((s) => s.trim())
          .filter(Boolean);

        const { data: inserted, error } = await supabase
          .from("av_portfolio_properties")
          .insert({ [dono.coluna]: dono.id, name: nome, address: endereco, summary: resumo, extra_criteria: criterios })
          .select("id")
          .single();
        if (error) throw error;
        propCount++;

        const unidades = linhas
          .filter((r) => (r[4] ?? "").trim())
          .map((r) => ({ portfolio_property_id: inserted.id, name: r[4].trim(), table_value: parseValor(r[5]) }));
        if (unidades.length) {
          const { error: unitError } = await supabase.from("av_portfolio_units").insert(unidades);
          if (unitError) throw unitError;
          unitCount += unidades.length;
        }
      }

      setMsg({ type: "ok", text: `Importado: ${propCount} imóvel(is), ${unitCount} unidade(s).` });
      onImported();
    } catch (err) {
      setMsg({ type: "err", text: "Erro ao importar: " + err.message });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setShow(true)}>
        Importar planilha
      </Button>
      <Modal open={show} onClose={() => setShow(false)} title="Importar planilha">
        <p className="text-body-sm text-graytext">
          Baixe o modelo, preencha uma linha por unidade (repita o nome do imóvel para agrupar várias
          unidades no mesmo imóvel), e envie o arquivo de volta.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={baixarModelo}>
            Baixar modelo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={handleFile}
            aria-label="Arquivo da planilha"
            className="min-w-0 text-body-sm text-graytext"
          />
        </div>
        {busy && <p className="mt-3 text-body-sm text-muted">Importando…</p>}
        {msg && (
          <p className={`mt-3 text-body-sm font-semibold ${msg.type === "ok" ? "text-success-text" : "text-danger-text"}`}>{msg.text}</p>
        )}
      </Modal>
    </>
  );
}

function NovoImovelModal({ open, onClose, dono, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("av_portfolio_properties")
      .insert({ [dono.coluna]: dono.id, name: name.trim() })
      .select("id")
      .single();
    setSaving(false);
    setName("");
    onCreated(data?.id);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo imóvel"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="novo-imovel" disabled={saving || !name.trim()}>
            {saving ? "Criando…" : "Criar imóvel"}
          </Button>
        </>
      }
    >
      <form id="novo-imovel" onSubmit={handleSubmit} className="space-y-3">
        <p className="text-body-sm text-graytext">Dê um nome. Endereço, fotos e unidades você completa na próxima tela.</p>
        <Input label="Nome do imóvel" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Residencial Vila Verde" autoFocus />
      </form>
    </Modal>
  );
}

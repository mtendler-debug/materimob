import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";
import { parseCsv, downloadCsv } from "../lib/csv";
import { importarLancamento } from "../lib/importar";
import { ImageUploader } from "../components/ImageUploader";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}
function n1(v) {
  return v == null ? "—" : String(v).replace(".", ",");
}

const STATUS_LABELS = { disponivel: "Disponível", reservada: "Reservada", vendida: "Vendida" };
const STATUS_CLASSES = {
  disponivel: "bg-success-bg text-success-text",
  reservada: "bg-warning-bg text-warning-text",
  vendida: "bg-danger-bg text-danger-text",
};
const STAGE_LABELS = { "a-visitar": "A visitar", visitado: "Visitado", negociacao: "Em negociação", descartado: "Descartado" };

export default function LaunchDetail() {
  const { id } = useParams();
  const { org, role } = useOrganization();
  const [launch, setLaunch] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [partners, setPartners] = useState(null);
  const [error, setError] = useState("");
  const [gerarAberto, setGerarAberto] = useState(false);

  const manage = org && launch && org.id === launch.organization_id && canManage(role);
  const isOwnerOrg = org && launch && org.id === launch.organization_id;

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_launches")
      .select("*, av_launch_units(*), organizations(name)")
      .eq("id", id)
      .single();
    if (loadError) {
      setError("Erro ao carregar lançamento: " + loadError.message);
      return;
    }
    setLaunch({ ...data, units: data.av_launch_units });
  }

  async function loadDashboard() {
    const { data, error: rpcError } = await supabase.rpc("launch_dashboard", { p_launch_id: id });
    if (!rpcError) setDashboard(data);
  }

  async function loadPartners() {
    const { data } = await supabase
      .from("av_launch_partners")
      .select("organization_id, organizations(name)")
      .eq("launch_id", id);
    setPartners(data ?? []);
  }

  useEffect(() => {
    load();
    loadPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (manage) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manage]);

  if (error) return <div className="p-6 text-sm text-danger-text">{error}</div>;
  if (!launch) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  const cor = launch.color || "#0284C7";
  const capa = launch.photo_urls?.[0];
  const disponiveis = launch.units.filter((u) => u.status === "disponivel");
  const reservadas = launch.units.filter((u) => u.status === "reservada");
  const valores = launch.units.filter((u) => u.status !== "vendida" && u.table_value != null).map((u) => u.table_value);
  const menor = valores.length ? Math.min(...valores) : null;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[900px] px-4 pt-5 pb-32 md:px-7">
        <Link to="/app/lancamentos" className="-ml-1 inline-flex min-h-9 items-center gap-0.5 px-1 text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
          Lançamentos
        </Link>

        <div
          className="relative mt-2 flex h-[180px] items-end overflow-hidden rounded-[20px] p-5 sm:h-[220px]"
          style={{
            background: capa ? `center/cover url(${capa})` : `linear-gradient(135deg, ${cor}, ${cor}cc 60%, #0f172a)`,
          }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/60" />
          <div className="relative text-white">
            <span className="mb-2.5 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-caption font-semibold backdrop-blur-md">Lançamento</span>
            <h1 className="text-[clamp(1.5rem,4vw,1.75rem)] leading-[1.12] font-bold tracking-[-0.035em]">{launch.name}</h1>
            <p className="mt-1 text-body-sm text-slate-200">
              {launch.organizations?.name && (
                <Link to={`/app/organizacoes/${launch.organization_id}`} className="font-semibold hover:underline">
                  {launch.organizations.name}
                </Link>
              )}
              {launch.organizations?.name && launch.address ? " · " : ""}
              {launch.address}
            </p>
          </div>
        </div>
        {launch.summary && <p className="mt-3 text-body-sm text-graytext">{launch.summary}</p>}

        <div className="mt-5 flex flex-wrap gap-7 border-b border-slate-200/70 pb-5">
          <div>
            <b className="block text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{disponiveis.length}</b>
            <small className="text-body-sm text-graytext">unidades disponíveis</small>
          </div>
          {menor != null && (
            <div>
              <b className="block text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{brl(menor)}</b>
              <small className="text-body-sm text-graytext">a partir de</small>
            </div>
          )}
          <div>
            <b className="block text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal tabular-nums">{reservadas.length}</b>
            <small className="text-body-sm text-graytext">reservadas</small>
          </div>
        </div>

        {manage && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-sky-200 bg-[#f5fbff] px-4 py-3.5">
            <span className="text-body-sm font-semibold text-sky-800">Você é a incorporadora deste lançamento</span>
            <div className="flex flex-wrap gap-2">
              <EditarMidia launch={launch} onChange={load} />
              <ImportLaunchUnitsSpreadsheet launchId={launch.id} onImported={load} />
              <NewLaunchUnit launchId={launch.id} onCreated={load} />
            </div>
          </div>
        )}

        {org && canManage(role) && !isOwnerOrg && (
          <PartnerToggle launchId={launch.id} org={org} partners={partners} onChange={loadPartners} />
        )}

        {partners?.length > 0 && (
          <p className="mt-3 text-caption text-graytext">
            Imobiliárias trabalhando este lançamento: {partners.map((p) => p.organizations?.name).filter(Boolean).join(", ")}
          </p>
        )}

        <SectionTitle first>Unidades</SectionTitle>
        {launch.units.length === 0 && <p className="text-body-sm text-muted">Nenhuma unidade cadastrada ainda.</p>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {launch.units.map((u) => (
            <UnitRow key={u.id} unit={u} manage={manage} onChange={() => { load(); if (manage) loadDashboard(); }} />
          ))}
        </div>

        {manage && (
          <>
            <SectionTitle>Painel do lançamento</SectionTitle>
            {dashboard ? <LaunchDashboard dashboard={dashboard} /> : <p className="text-body-sm text-muted">Carregando painel…</p>}
          </>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4 md:bottom-0 md:left-64 md:pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-[420px]">
          <Button size="lg" block className="!min-h-[52px] !rounded-2xl shadow-[0_14px_34px_-10px_rgba(2,132,199,.6)]" onClick={() => setGerarAberto(true)}>
            Gerar link para o cliente
          </Button>
        </div>
      </div>
      <CreateRoteiro launch={launch} open={gerarAberto} onClose={() => setGerarAberto(false)} />
    </div>
  );
}

function PartnerToggle({ launchId, org, partners, onChange }) {
  const [busy, setBusy] = useState(false);
  const checked = (partners ?? []).some((p) => p.organization_id === org.id);

  async function toggle() {
    setBusy(true);
    if (checked) {
      await supabase
        .from("av_launch_partners")
        .delete()
        .eq("launch_id", launchId)
        .eq("organization_id", org.id);
    } else {
      await supabase.from("av_launch_partners").insert({ launch_id: launchId, organization_id: org.id });
    }
    setBusy(false);
    onChange();
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3.5">
      <span className="text-body-sm font-semibold text-charcoal">
        {checked ? `${org.name} está trabalhando este lançamento.` : `${org.name} quer trabalhar este lançamento?`}
      </span>
      <Button variant="secondary" size="sm" disabled={busy} onClick={toggle}>
        {checked ? "Deixar de trabalhar" : "Trabalhar este lançamento"}
      </Button>
    </div>
  );
}

function EditLaunchMedia({ launch, onChange }) {
  const [floorPlanUrl, setFloorPlanUrl] = useState(launch.floor_plan_url ?? null);
  const [photoUrls, setPhotoUrls] = useState(launch.photo_urls ?? []);
  const [paymentTerms, setPaymentTerms] = useState(launch.payment_terms ?? "");
  const [condoValue, setCondoValue] = useState(launch.condo_value ?? "");
  const [iptuValue, setIptuValue] = useState(launch.iptu_value ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("av_launches")
      .update({
        floor_plan_url: floorPlanUrl,
        photo_urls: photoUrls,
        payment_terms: paymentTerms.trim() || null,
        condo_value: condoValue === "" ? null : Number(condoValue),
        iptu_value: iptuValue === "" ? null : Number(iptuValue),
      })
      .eq("id", launch.id);
    setSaving(false);
    if (error) setMsg("Erro: " + error.message);
    else {
      setMsg("Salvo.");
      onChange();
    }
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap gap-4">
        <ImageUploader label="Planta do imóvel" value={floorPlanUrl} onChange={setFloorPlanUrl} multiple={false} />
        <ImageUploader label="Fotos" value={photoUrls} onChange={setPhotoUrls} multiple={true} />
      </div>
      <div>
        <label className="mb-1.5 block text-caption font-medium text-graytext">Condições de pagamento</label>
        <textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          rows={2}
          placeholder="Ex.: 10% entrada + 30% obra + 60% financiamento"
          className={`${classesCampo} min-h-[84px] py-3`}
        />
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Input label="Condomínio" type="number" value={condoValue} onChange={(e) => setCondoValue(e.target.value)} placeholder="Valor mensal" />
        <Input label="IPTU" type="number" value={iptuValue} onChange={(e) => setIptuValue(e.target.value)} placeholder="Valor mensal" />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        {msg && <span className="text-body-sm text-graytext">{msg}</span>}
      </div>
    </div>
  );
}

function EditarMidia({ launch, onChange }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setAberto(true)}>
        Editar mídia
      </Button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="Mídia do lançamento" className="sm:max-w-xl">
        <EditLaunchMedia launch={launch} onChange={onChange} />
      </Modal>
    </>
  );
}

function SectionTitle({ children, first = false }) {
  return (
    <h2 className={`mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase ${first ? "mt-7" : "mt-9"}`}>{children}</h2>
  );
}

function Kpi({ label, value, foot }) {
  return (
    <div className="bg-white p-4">
      <div className="text-[11px] font-semibold tracking-[.06em] text-muted uppercase">{label}</div>
      <div className="mt-1 text-2xl leading-[1.15] font-bold tracking-[-0.03em] tabular-nums">{value}</div>
      <div className="mt-0.5 text-caption text-graytext">{foot}</div>
    </div>
  );
}

function LaunchDashboard({ dashboard }) {
  const funilEntries = Object.entries(dashboard.funil || {});
  const porUnidade = dashboard.por_unidade || [];

  return (
    <div>
      <p className="text-caption text-graytext">
        Números agregados de todos os roteiros feitos a partir deste lançamento — sem nome de
        cliente nem identidade do corretor.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-slate-200/70 bg-slate-200/70 sm:grid-cols-4">
        <Kpi label="Roteiros" value={dashboard.total_roteiros} foot={`${dashboard.total_corretores} corretor(es)`} />
        <Kpi label="Avaliações" value={dashboard.total_avaliacoes} foot="recebidas" />
        <Kpi label="Nota média" value={n1(dashboard.nota_media)} foot="escala de 1 a 10" />
        <Kpi label="Propostas" value={dashboard.total_propostas} foot={`${dashboard.propostas_interesse} com interesse`} />
      </div>

      {funilEntries.length > 0 && (
        <div className="mt-3 rounded-card border border-slate-200/70 bg-white p-4">
          <p className="text-caption font-semibold uppercase tracking-[.08em] text-muted">Funil</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {funilEntries.map(([stage, n]) => (
              <span key={stage} className="rounded-full bg-light px-2.5 py-1 text-caption font-semibold text-graytext">
                {n} {(STAGE_LABELS[stage] || stage).toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      {porUnidade.length > 0 && (
        <div className="mt-3 rounded-card border border-slate-200/70 bg-white p-4">
          <p className="text-caption font-semibold uppercase tracking-[.08em] text-muted">Nota por unidade</p>
          <div className="mt-2 space-y-1">
            {porUnidade.map((u) => (
              <div key={u.launch_unit_id} className="flex items-center justify-between text-sm">
                <span className="text-charcoal">{u.name}</span>
                <span className="text-graytext">
                  {u.avaliacoes > 0 ? `${n1(u.nota_media)}/10 · ${u.avaliacoes} aval.` : "sem avaliação"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UnitRow({ unit, manage, onChange }) {
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const [value, setValue] = useState(unit.table_value ?? "");
  const [photoUrls, setPhotoUrls] = useState(unit.photo_urls ?? []);
  const [paymentTerms, setPaymentTerms] = useState(unit.payment_terms ?? "");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!name.trim()) return;
    setSaving(true);
    await supabase
      .from("av_launch_units")
      .update({
        name: name.trim(),
        table_value: value === "" ? null : Number(value),
        photo_urls: photoUrls,
        payment_terms: paymentTerms.trim() || null,
      })
      .eq("id", unit.id);
    setSaving(false);
    setEditing(false);
    onChange();
  }

  function cancelar() {
    setName(unit.name);
    setValue(unit.table_value ?? "");
    setPhotoUrls(unit.photo_urls ?? []);
    setPaymentTerms(unit.payment_terms ?? "");
    setEditing(false);
  }

  async function remover() {
    if (!(await confirm(`Remover "${unit.name}"?`))) return;
    await supabase.from("av_launch_units").delete().eq("id", unit.id);
    onChange();
    toast(`"${unit.name}" removida.`);
  }

  async function markSold() {
    if (!(await confirm(`Marcar "${unit.name}" como vendida?`, { tone: "warning", confirmLabel: "Marcar como vendida" }))) return;
    await supabase.from("av_launch_units").update({ status: "vendida" }).eq("id", unit.id);
    onChange();
    toast(`"${unit.name}" marcada como vendida.`);
  }
  async function release() {
    if (!(await confirm(`Desfazer a reserva de "${unit.name}"?`, { tone: "warning", confirmLabel: "Desfazer reserva" }))) return;
    await supabase
      .from("av_launch_units")
      .update({ status: "disponivel", reserved_by: null, reserved_for: null })
      .eq("id", unit.id);
    onChange();
    toast("Reserva desfeita.");
  }

  if (editing) {
    return (
      <div className="col-span-full rounded-2xl border border-slate-200/70 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome da unidade" />
          </div>
          <div className="w-40">
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor de tabela" aria-label="Valor de tabela" />
          </div>
        </div>
        <div className="mt-3">
          <ImageUploader label="Fotos desta unidade" value={photoUrls} onChange={setPhotoUrls} multiple={true} />
        </div>
        <label className="mt-3 mb-1.5 block text-caption font-medium text-graytext">Condições de pagamento desta unidade</label>
        <textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          rows={2}
          placeholder="Deixe em branco pra usar a condição geral do lançamento"
          className={`${classesCampo} min-h-[72px] py-2.5`}
        />
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={salvar} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const [titulo, ...resto] = unit.name.split(" · ");
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-200/70 bg-white p-3.5">
      <b className="font-semibold text-charcoal">
        {titulo}
        {(unit.photo_urls?.length > 0 || unit.payment_terms) && (
          <span className="ml-1 text-xs text-muted" title="Tem fotos ou condições de pagamento próprias">
            •
          </span>
        )}
      </b>
      {resto.length > 0 && <small className="text-caption text-graytext">{resto.join(" · ")}</small>}
      <span className="font-bold tracking-tight text-charcoal tabular-nums">{brl(unit.table_value)}</span>
      <span className={`self-start rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_CLASSES[unit.status]}`}>
        {STATUS_LABELS[unit.status]}
        {unit.reserved_for ? ` · ${unit.reserved_for}` : ""}
      </span>
      {manage && (
        <div className="-mx-1 mt-1 flex flex-wrap">
          <button onClick={() => setEditing(true)} className={acaoUnidade}>
            Editar
          </button>
          <button onClick={remover} className={acaoUnidadePerigo}>
            Remover
          </button>
          {unit.status === "reservada" && (
            <>
              <button onClick={markSold} className={`${acaoUnidade} !text-success-text`}>
                Confirmar venda
              </button>
              <button onClick={release} className={acaoUnidadePerigo}>
                Desfazer reserva
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const acaoUnidade = "min-h-9 rounded-[9px] px-2 text-xs font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal";
const acaoUnidadePerigo = "min-h-9 rounded-[9px] px-2 text-xs font-medium text-graytext transition-all duration-200 hover:bg-danger-bg hover:text-danger-text";

function NewLaunchUnit({ launchId, onCreated }) {
  const [aberto, setAberto] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await supabase.from("av_launch_units").insert({
      launch_id: launchId,
      name: name.trim(),
      table_value: value ? Number(value) : null,
    });
    setName("");
    setValue("");
    setAberto(false);
    onCreated();
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setAberto(true)}>
        + Unidade
      </Button>
      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title="Nova unidade"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="nova-unidade" disabled={!name.trim()}>
              Adicionar
            </Button>
          </>
        }
      >
        <form id="nova-unidade" onSubmit={submit} className="space-y-3.5">
          <Input label="Nome da unidade" value={name} onChange={(e) => setName(e.target.value)} placeholder="403 · Sereine · 216 m²" autoFocus />
          <Input label="Valor de tabela" type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Opcional" />
        </form>
      </Modal>
    </>
  );
}

const UNIT_TEMPLATE_HEADER = ["Nome da unidade", "Valor de tabela"];
const UNIT_TEMPLATE_EXAMPLE = [
  ["101 · 80 m²", "650000"],
  ["102 · 95 m²", "720000"],
];

function ImportLaunchUnitsSpreadsheet({ launchId, onImported }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const fileRef = useRef(null);

  function baixarModelo() {
    downloadCsv("modelo-unidades-lancamento.csv", [UNIT_TEMPLATE_HEADER, ...UNIT_TEMPLATE_EXAMPLE]);
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
      if (dataRows.length === 0) {
        setMsg({ type: "err", text: "Nenhuma linha válida encontrada — confira a coluna \"Nome da unidade\"." });
        return;
      }

      const unidades = dataRows.map((r) => ({
        launch_id: launchId,
        name: r[0].trim(),
        table_value: parseValor(r[1]),
      }));
      const { error } = await supabase.from("av_launch_units").insert(unidades);
      if (error) throw error;

      setMsg({ type: "ok", text: `Importado: ${unidades.length} unidade(s).` });
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
      <Button variant="secondary" size="sm" onClick={() => setShow(true)}>
        Importar planilha
      </Button>
      <Modal open={show} onClose={() => setShow(false)} title="Importar unidades">
        <p className="text-body-sm text-graytext">
          Baixe o modelo, preencha uma linha por unidade deste lançamento, e envie o arquivo de volta.
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
        {msg && <p className={`mt-3 text-body-sm font-semibold ${msg.type === "ok" ? "text-success-text" : "text-danger-text"}`}>{msg.text}</p>}
      </Modal>
    </>
  );
}

function CreateRoteiro({ launch, open, onClose }) {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const disponiveis = launch.units.filter((u) => u.status === "disponivel");

  async function create(e) {
    e.preventDefault();
    if (!clientName.trim()) return;
    setBusy(true);
    setError("");

    const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
      p_name: clientName.trim(),
      p_phone: clientPhone.trim() || null,
      p_email: null,
    });
    if (clientError) {
      setBusy(false);
      setError("Erro ao vincular cliente: " + clientError.message);
      return;
    }

    const { data: selection, error: selError } = await supabase
      .from("av_selections")
      .insert({
        title: launch.name,
        subtitle: launch.summary,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim() || null,
        client_id: clientId,
        criteria: launch.criteria,
        unit_criteria: launch.unit_criteria,
        milestones: launch.milestones,
        launch_id: launch.id,
        token_form: generateToken(),
        token_panel: generateToken(),
      })
      .select("id")
      .single();
    if (selError) {
      setBusy(false);
      setError(selError.message);
      return;
    }

    const { error: propError } = await importarLancamento(selection.id, launch, disponiveis, 0);
    if (propError) {
      setBusy(false);
      setError(propError.message);
      return;
    }

    setBusy(false);
    navigate(`/app/selections/${selection.id}`);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gerar link para o cliente"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="gerar-link" disabled={busy || !clientName.trim()}>
            {busy ? "Criando…" : "Gerar link"}
          </Button>
        </>
      }
    >
      <form id="gerar-link" onSubmit={create} className="space-y-3.5">
        <p className="text-body-sm text-graytext">
          Cria um roteiro com as {disponiveis.length} unidades disponíveis e leva você até ele.
        </p>
        <Input label="Nome do cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ex.: Casal Almeida" autoFocus />
        <Input label="Telefone (opcional)" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="reúne outros roteiros dele" />
        {error && <p className="text-body-sm text-danger-text">{error}</p>}
      </form>
    </Modal>
  );
}

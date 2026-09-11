import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { generateToken } from "../../lib/token";
import { callFunction } from "../../lib/edgeFunctions";
import { STATUS_FUNIL_LABELS, PRIORIDADE_LABELS, StatusParceiraChip, PrioridadeChip } from "./Parceiras";
import { RegistroForm } from "./RegistroForm";
import { STATUS_REGISTRO_LABELS } from "./Registros";

const TABS = ["Dados", "Interesses", "Observações", "Corretores", "Registros", "Link de registro"];

export default function ParceiraDetail() {
  const { id } = useParams();
  const [parceira, setParceira] = useState(null);
  const [tab, setTab] = useState("Dados");

  async function load() {
    const { data } = await supabase.from("pc_parceiras").select("*").eq("id", id).single();
    setParceira(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!parceira) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  return (
    <div>
      <Link to="/app/parcerias/parceiras" className="mt-4 inline-block text-sm text-graytext underline">
        ← todas as parceiras
      </Link>

      {!parceira.validado && (
        <div className="mt-3 rounded-[12px] border-[1.5px] border-gold bg-light p-3 text-sm text-charcoal">
          Esta parceira chegou por autocadastro e ainda não foi validada. Confira os dados, complete o
          segmento e defina a prioridade antes de validar.
          <button
            onClick={async () => {
              await supabase.from("pc_parceiras").update({ validado: true }).eq("id", parceira.id);
              load();
            }}
            className="ml-2 rounded-[8px] bg-charcoal px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
          >
            Validar cadastro
          </button>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-[21px] font-semibold text-charcoal">{parceira.nome_fantasia}</h2>
        <div className="flex items-center gap-2">
          <PrioridadeChip prioridade={parceira.prioridade} />
          <StatusParceiraChip status={parceira.status_funil} />
        </div>
      </div>

      <MudarStatus parceira={parceira} onChange={load} />

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 border-b-2 px-3 pb-2 text-sm font-bold ${
              tab === t ? "border-gold text-charcoal" : "border-transparent text-graytext hover:text-charcoal"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "Dados" && <DadosTab parceira={parceira} onChange={load} />}
        {tab === "Interesses" && <InteressesTab parceira={parceira} />}
        {tab === "Observações" && <ObservacoesTab parceiraId={id} />}
        {tab === "Corretores" && <CorretoresTab parceiraId={id} />}
        {tab === "Registros" && <RegistrosTab parceira={parceira} onChange={load} />}
        {tab === "Link de registro" && <LinkTab parceira={parceira} onChange={load} />}
      </div>
    </div>
  );
}

// Toda mudança de status vem com uma observação obrigatória — as duas
// gravações acontecem juntas aqui, nunca como um campo solto dentro do
// formulário geral de Dados.
function MudarStatus({ parceira, onChange }) {
  const [show, setShow] = useState(false);
  const [novoStatus, setNovoStatus] = useState(parceira.status_funil);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmar() {
    if (!nota.trim()) return setError("Escreva uma observação explicando a mudança.");
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase
      .from("pc_parceiras")
      .update({ status_funil: novoStatus })
      .eq("id", parceira.id);
    if (updateError) {
      setBusy(false);
      return setError(updateError.message);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("pc_parceira_observacoes").insert({
      owner_id: user.id,
      parceira_id: parceira.id,
      texto: `Status alterado para "${STATUS_FUNIL_LABELS[novoStatus]}". ${nota.trim()}`,
    });
    setBusy(false);
    setShow(false);
    setNota("");
    onChange();
  }

  if (!show) {
    return (
      <button onClick={() => setShow(true)} className="mt-2 text-xs font-bold text-graytext underline">
        mudar status
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[12px] border border-rule bg-white p-4">
      <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">Novo status</label>
      <select
        value={novoStatus}
        onChange={(e) => setNovoStatus(e.target.value)}
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      >
        {Object.entries(STATUS_FUNIL_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <label className="mt-3 mb-[6px] block text-[13px] font-semibold text-charcoal">
        O que motivou a mudança (obrigatório)
      </label>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={2}
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      />
      {error && <p className="mt-2 text-xs text-[#B34A2E]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={confirmar}
          disabled={busy}
          className="rounded-[9px] bg-charcoal px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Confirmar"}
        </button>
        <button onClick={() => setShow(false)} className="text-xs text-graytext underline">
          cancelar
        </button>
      </div>
    </div>
  );
}

function DadosTab({ parceira, onChange }) {
  const [form, setForm] = useState(parceira);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(field) {
    return (value) => {
      setForm((f) => ({ ...f, [field]: value }));
      setSaved(false);
    };
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    const prioridadeMudou =
      form.prioridade !== parceira.prioridade || form.prioridade_justificativa !== parceira.prioridade_justificativa;
    await supabase
      .from("pc_parceiras")
      .update({
        nome_fantasia: form.nome_fantasia,
        razao_social: form.razao_social || null,
        cnpj: form.cnpj || null,
        creci_juridico: form.creci_juridico || null,
        tipo_pessoa: form.tipo_pessoa,
        cidade: form.cidade || null,
        uf: form.uf || null,
        praca: form.praca || null,
        segmento_foco: form.segmento_foco || null,
        responsavel_nome: form.responsavel_nome || null,
        responsavel_telefone: form.responsavel_telefone || null,
        responsavel_email: form.responsavel_email || null,
        comissao_pct_padrao: form.comissao_pct_padrao || null,
        prioridade: form.prioridade || null,
        prioridade_justificativa: form.prioridade_justificativa || null,
        ...(prioridadeMudou ? { prioridade_calculada_em: new Date().toISOString() } : {}),
      })
      .eq("id", parceira.id);
    setSaving(false);
    setSaved(true);
    onChange();
  }

  return (
    <form onSubmit={salvar} className="rounded-[14px] border border-rule bg-white p-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome fantasia" value={form.nome_fantasia ?? ""} onChange={set("nome_fantasia")} required />
        <Field label="Razão social" value={form.razao_social ?? ""} onChange={set("razao_social")} />
        <Field label="CNPJ" value={form.cnpj ?? ""} onChange={set("cnpj")} />
        <Field label="CRECI" value={form.creci_juridico ?? ""} onChange={set("creci_juridico")} />
        <div>
          <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">Tipo de pessoa</label>
          <select
            value={form.tipo_pessoa ?? "PJ"}
            onChange={(e) => set("tipo_pessoa")(e.target.value)}
            className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
          >
            <option value="PJ">PJ (imobiliária)</option>
            <option value="PF">PF (corretor autônomo)</option>
          </select>
        </div>
        <Field label="Cidade / região de atuação" value={form.cidade ?? ""} onChange={set("cidade")} />
        <Field label="UF" value={form.uf ?? ""} onChange={set("uf")} maxLength={2} />
        <Field label="Praça" value={form.praca ?? ""} onChange={set("praca")} />
        <Field label="Comissão padrão (%)" value={form.comissao_pct_padrao ?? ""} onChange={set("comissao_pct_padrao")} type="number" />
        <Field label="Nome do contato principal" value={form.responsavel_nome ?? ""} onChange={set("responsavel_nome")} />
        <Field label="Telefone / WhatsApp do contato" value={form.responsavel_telefone ?? ""} onChange={set("responsavel_telefone")} />
        <Field label="E-mail do contato" value={form.responsavel_email ?? ""} onChange={set("responsavel_email")} />
      </div>

      <label className="mt-3 mb-[6px] block text-[13px] font-semibold text-charcoal">Segmento / foco de produto</label>
      <textarea
        value={form.segmento_foco ?? ""}
        onChange={(e) => set("segmento_foco")(e.target.value)}
        rows={2}
        placeholder="Ex.: Alto padrão, lançamentos, popular/MCMV, locação, rural…"
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      />

      <div className="mt-4 rounded-[12px] bg-light p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[.1em] text-graytext">
          Prioridade para o portfólio ativo
        </p>
        <p className="mb-2 text-xs text-graytext">
          Aderência entre o perfil da parceira e o portfólio de hoje — recalcule quando o portfólio mudar.
          {parceira.prioridade_calculada_em && (
            <> Definida em {new Date(parceira.prioridade_calculada_em).toLocaleDateString("pt-BR")}.</>
          )}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={form.prioridade ?? ""}
            onChange={(e) => set("prioridade")(e.target.value)}
            className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
          >
            <option value="">Ainda não avaliada</option>
            {Object.entries(PRIORIDADE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <Field
            label=""
            value={form.prioridade_justificativa ?? ""}
            onChange={set("prioridade_justificativa")}
            placeholder="Justificativa"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        {saved && <span className="text-xs font-bold text-[#2E7D32]">Salvo ✓</span>}
      </div>
    </form>
  );
}

function InteressesTab({ parceira }) {
  const [empreendimentos, setEmpreendimentos] = useState(null);
  const [interesses, setInteresses] = useState([]);

  async function load() {
    const [{ data: emps }, { data: ints }] = await Promise.all([
      supabase.from("pc_empreendimentos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("pc_parceira_interesses").select("empreendimento_id").eq("parceira_id", parceira.id),
    ]);
    setEmpreendimentos(emps ?? []);
    setInteresses((ints ?? []).map((i) => i.empreendimento_id));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceira.id]);

  async function alternar(empId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (interesses.includes(empId)) {
      await supabase
        .from("pc_parceira_interesses")
        .delete()
        .eq("parceira_id", parceira.id)
        .eq("empreendimento_id", empId);
    } else {
      await supabase
        .from("pc_parceira_interesses")
        .insert({ owner_id: user.id, parceira_id: parceira.id, empreendimento_id: empId });
    }
    load();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-5">
      <p className="mb-3 text-sm text-graytext">
        Empreendimento(s) de maior interesse desta parceira — liga com o portfólio ativo, não é texto livre.
      </p>
      {empreendimentos === null && <p className="text-sm text-muted">Carregando…</p>}
      {empreendimentos?.length === 0 && <p className="text-sm text-muted">Nenhum empreendimento ativo cadastrado.</p>}
      <div className="space-y-2">
        {empreendimentos?.map((e) => (
          <label key={e.id} className="flex items-center gap-2 rounded-[10px] border border-rule p-3 text-sm">
            <input
              type="checkbox"
              checked={interesses.includes(e.id)}
              onChange={() => alternar(e.id)}
              className="h-4 w-4 accent-gold"
            />
            {e.nome}
          </label>
        ))}
      </div>
    </div>
  );
}

function ObservacoesTab({ parceiraId }) {
  const [lista, setLista] = useState(null);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("pc_parceira_observacoes")
      .select("*")
      .eq("parceira_id", parceiraId)
      .order("criado_em", { ascending: false });
    setLista(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceiraId]);

  async function adicionar(e) {
    e.preventDefault();
    if (!texto.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("pc_parceira_observacoes").insert({ owner_id: user.id, parceira_id: parceiraId, texto: texto.trim() });
    setSaving(false);
    setTexto("");
    load();
  }

  return (
    <div>
      <form onSubmit={adicionar} className="rounded-[14px] border border-rule bg-white p-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          placeholder="Ligação, mensagem, reunião…"
          className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="mt-2 rounded-[9px] bg-charcoal px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Adicionar"}
        </button>
      </form>

      <div className="mt-4 space-y-2">
        {lista === null && <p className="text-sm text-muted">Carregando…</p>}
        {lista?.length === 0 && <p className="text-sm text-muted">Nenhuma observação ainda.</p>}
        {lista?.map((o) => (
          <div key={o.id} className="rounded-[12px] border border-rule bg-white p-3">
            <p className="text-sm text-charcoal">{o.texto}</p>
            <p className="mt-1 text-[11px] text-muted">
              {new Date(o.criado_em).toLocaleString("pt-BR")} · {o.criado_por}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CorretoresTab({ parceiraId }) {
  const [corretores, setCorretores] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [nome, setNome] = useState("");
  const [creci, setCreci] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("pc_parceira_corretores")
      .select("*")
      .eq("parceira_id", parceiraId)
      .order("nome");
    setCorretores(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceiraId]);

  async function adicionar(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("pc_parceira_corretores").insert({
      owner_id: user.id,
      parceira_id: parceiraId,
      nome: nome.trim(),
      creci: creci.trim() || null,
      telefone: telefone.trim() || null,
      email: email.trim() || null,
    });
    setSaving(false);
    setNome("");
    setCreci("");
    setTelefone("");
    setEmail("");
    setShowNew(false);
    load();
  }

  async function alternarAtivo(c) {
    await supabase.from("pc_parceira_corretores").update({ ativo: !c.ativo }).eq("id", c.id);
    load();
  }

  return (
    <div>
      <button
        onClick={() => setShowNew((v) => !v)}
        className="rounded-[10px] border-[1.5px] border-rule bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-gold"
      >
        {showNew ? "Cancelar" : "+ Adicionar corretor"}
      </button>

      {showNew && (
        <form onSubmit={adicionar} className="mt-3 grid grid-cols-1 gap-2 rounded-[12px] border border-rule bg-white p-4 sm:grid-cols-2">
          <Field label="Nome" value={nome} onChange={setNome} required />
          <Field label="CRECI" value={creci} onChange={setCreci} />
          <Field label="Telefone" value={telefone} onChange={setTelefone} />
          <Field label="E-mail" value={email} onChange={setEmail} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-2">
        {corretores === null && <p className="text-sm text-muted">Carregando…</p>}
        {corretores?.length === 0 && <p className="text-sm text-muted">Nenhum corretor cadastrado ainda.</p>}
        {corretores?.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-[12px] border border-rule bg-white p-3">
            <div>
              <p className="text-sm font-bold text-charcoal">{c.nome}</p>
              <p className="text-xs text-graytext">
                {[c.creci && `CRECI ${c.creci}`, c.telefone, c.email].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!c.ativo && (
                <span className="rounded-full bg-light px-[9px] py-[3px] text-[10.5px] font-bold text-graytext">
                  inativo
                </span>
              )}
              <button onClick={() => alternarAtivo(c)} className="text-xs font-bold text-[#B34A2E] underline">
                {c.ativo ? "desativar" : "reativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegistrosTab({ parceira, onChange }) {
  const [registros, setRegistros] = useState(null);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("pc_registros_cliente")
      .select("id, cliente_nome, cliente_telefone, status, registrado_em, valido_ate")
      .eq("parceira_id", parceira.id)
      .order("registrado_em", { ascending: false });
    setRegistros(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceira.id]);

  return (
    <div>
      <button
        onClick={() => setShowNew((v) => !v)}
        className="rounded-[10px] border-[1.5px] border-rule bg-white px-4 py-2 text-sm font-bold text-charcoal hover:border-gold"
      >
        {showNew ? "Cancelar" : "+ Registrar cliente"}
      </button>

      {showNew && (
        <div className="mt-3">
          {parceira.status_funil !== "parceria_firmada" && (
            <p className="mb-2 text-xs text-[#B26A00]">
              Esta parceira ainda não está em "Parceria firmada" — o registro entra normalmente, mas o link
              público só funciona depois que o status chegar lá.
            </p>
          )}
          <RegistroForm
            parceira={parceira}
            onDone={async (payload) => {
              const r = await callFunction("pc-registro-cliente", {
                method: "POST",
                auth: true,
                body: payload,
              });
              load();
              onChange();
              return r;
            }}
          />
        </div>
      )}

      <div className="mt-4 space-y-2">
        {registros === null && <p className="text-sm text-muted">Carregando…</p>}
        {registros?.length === 0 && <p className="text-sm text-muted">Nenhum registro ainda.</p>}
        {registros?.map((r) => (
          <Link
            key={r.id}
            to="/app/parcerias/registros"
            className="flex items-center justify-between rounded-[12px] border border-rule bg-white p-3 hover:border-gold"
          >
            <div>
              <p className="text-sm font-bold text-charcoal">{r.cliente_nome}</p>
              <p className="text-xs text-graytext">{r.cliente_telefone}</p>
            </div>
            <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
              {STATUS_REGISTRO_LABELS[r.status] ?? r.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LinkTab({ parceira, onChange }) {
  const [copiado, setCopiado] = useState(false);
  const url = `${window.location.origin}/registrar/${parceira.token_registro}`;

  function copiar() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  function enviarWhatsapp() {
    const texto = `Olá, ${parceira.responsavel_nome || parceira.nome_fantasia}. Este é o seu link exclusivo para registrar clientes nos empreendimentos da Chaincorp: ${url}. Cada registro vale ${"90"} dias e é confirmado por mim na incorporadora. Qualquer dúvida, é só me chamar. Marcos Tendler, Coordenador de Parcerias.`;
    const numero = (parceira.responsavel_telefone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  async function renovar() {
    if (
      !window.confirm(
        "Gerar um link novo invalida o link atual na hora — ele para de funcionar. Continuar?",
      )
    )
      return;
    await supabase
      .from("pc_parceiras")
      .update({ token_registro: generateToken() })
      .eq("id", parceira.id);
    onChange();
  }

  return (
    <div className="rounded-[14px] border border-rule bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-[.1em] text-graytext">Link de registro público</p>
      <p className="mt-2 break-all text-sm text-charcoal">{url}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={copiar}
          className="rounded-[9px] bg-charcoal px-3 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>
        <button
          onClick={enviarWhatsapp}
          className="rounded-[9px] border-[1.5px] border-rule bg-white px-3 py-2 text-xs font-bold text-charcoal hover:border-gold"
        >
          Enviar por WhatsApp
        </button>
        <button
          onClick={renovar}
          className="rounded-[9px] border-[1.5px] border-rule bg-white px-3 py-2 text-xs font-bold text-[#B34A2E] hover:border-[#B34A2E]"
        >
          Renovar link
        </button>
      </div>
      {parceira.status_funil !== "parceria_firmada" && (
        <p className="mt-3 text-xs font-bold text-[#B34A2E]">
          O link só funciona quando o status desta parceira estiver em "Parceria firmada".
        </p>
      )}
      {!parceira.token_ativo && (
        <p className="mt-3 text-xs font-bold text-[#B34A2E]">
          Este link está desativado — a parceira não consegue registrar clientes por ele agora.
        </p>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, maxLength, type = "text" }) {
  return (
    <div>
      {label && <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      />
    </div>
  );
}

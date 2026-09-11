import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { generateToken } from "../../lib/token";

export const STATUS_FUNIL_LABELS = {
  nao_contatado: "Não contatado",
  contato_iniciado: "Contato iniciado",
  reuniao_agendada: "Reunião agendada",
  em_negociacao: "Em negociação",
  parceria_firmada: "Parceria firmada",
  sem_interesse: "Sem interesse",
  pausado: "Pausado",
};

const STATUS_FUNIL_COLORS = {
  nao_contatado: { bg: "#EDEAE4", color: "#5C5C5C" },
  contato_iniciado: { bg: "#E3EDF8", color: "#1565C0" },
  reuniao_agendada: { bg: "#E3EDF8", color: "#1565C0" },
  em_negociacao: { bg: "#FFF3E0", color: "#B26A00" },
  parceria_firmada: { bg: "#E3F0E4", color: "#2E7D32" },
  sem_interesse: { bg: "#F1E4E0", color: "#B34A2E" },
  pausado: { bg: "#EDEAE4", color: "#5C5C5C" },
};

export const PRIORIDADE_LABELS = { alta: "Alta", media: "Média", baixa: "Baixa" };
const PRIORIDADE_COLORS = {
  alta: { bg: "#E3F0E4", color: "#2E7D32" },
  media: { bg: "#FFF3E0", color: "#B26A00" },
  baixa: { bg: "#EDEAE4", color: "#5C5C5C" },
};

export function StatusParceiraChip({ status }) {
  const c = STATUS_FUNIL_COLORS[status] ?? STATUS_FUNIL_COLORS.nao_contatado;
  return (
    <span className="rounded-full px-[10px] py-1 text-[10.5px] font-bold" style={{ background: c.bg, color: c.color }}>
      {STATUS_FUNIL_LABELS[status] ?? status}
    </span>
  );
}

export function PrioridadeChip({ prioridade }) {
  if (!prioridade) return null;
  const c = PRIORIDADE_COLORS[prioridade] ?? PRIORIDADE_COLORS.baixa;
  return (
    <span className="rounded-full px-[10px] py-1 text-[10.5px] font-bold" style={{ background: c.bg, color: c.color }}>
      Prioridade {PRIORIDADE_LABELS[prioridade]}
    </span>
  );
}

export default function Parceiras() {
  const { user } = useAuth();
  const [parceiras, setParceiras] = useState(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("pc_parceiras")
      .select("id, nome_fantasia, cidade, uf, praca, status_funil, prioridade, validado, created_at")
      .order("nome_fantasia");
    setParceiras(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const pendentesValidacao = (parceiras ?? []).filter((p) => !p.validado);

  const visiveis = (parceiras ?? []).filter((p) => {
    if (!p.validado) return false;
    if (filtroStatus !== "todos" && p.status_funil !== filtroStatus) return false;
    if (filtroPrioridade !== "todas" && p.prioridade !== filtroPrioridade) return false;
    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      return (
        p.nome_fantasia?.toLowerCase().includes(q) ||
        p.cidade?.toLowerCase().includes(q) ||
        p.praca?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <LinkAutocadastro />

      {pendentesValidacao.length > 0 && (
        <div className="mt-4 rounded-[12px] border-[1.5px] border-gold bg-light p-3 text-sm text-charcoal">
          <b>{pendentesValidacao.length}</b> parceira(s) chegaram por autocadastro e aguardam sua validação:{" "}
          {pendentesValidacao.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              <Link to={`/app/parcerias/parceiras/${p.id}`} className="underline">
                {p.nome_fantasia}
              </Link>
            </span>
          ))}
          .
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, cidade ou praça"
          className="min-w-[220px] flex-1 rounded-[9px] border border-rule bg-white px-3 py-2 text-sm"
        />
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="rounded-[8px] border border-rule bg-white px-2 py-2 text-sm"
        >
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_FUNIL_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filtroPrioridade}
          onChange={(e) => setFiltroPrioridade(e.target.value)}
          className="rounded-[8px] border border-rule bg-white px-2 py-2 text-sm"
        >
          <option value="todas">Todas as prioridades</option>
          {Object.entries(PRIORIDADE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90"
        >
          {showNew ? "Cancelar" : "+ Nova parceira"}
        </button>
      </div>

      {showNew && (
        <NovaParceira
          userId={user.id}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      <div className="mt-5 space-y-2">
        {parceiras === null && <p className="text-sm text-muted">Carregando…</p>}
        {parceiras?.length === 0 && (
          <p className="text-sm text-muted">Nenhuma parceira cadastrada ainda.</p>
        )}
        {parceiras && parceiras.length > 0 && visiveis.length === 0 && (
          <p className="text-sm text-muted">Nada encontrado com esse filtro.</p>
        )}
        {visiveis.map((p) => (
          <Link
            key={p.id}
            to={`/app/parcerias/parceiras/${p.id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-rule bg-white p-4 hover:border-gold"
          >
            <div>
              <p className="font-serif font-semibold text-charcoal">{p.nome_fantasia}</p>
              <p className="text-xs text-graytext">
                {[p.cidade, p.uf].filter(Boolean).join("/")}
                {p.praca ? ` · ${p.praca}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PrioridadeChip prioridade={p.prioridade} />
              <StatusParceiraChip status={p.status_funil} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LinkAutocadastro() {
  const [copiado, setCopiado] = useState(false);
  const url = `${window.location.origin}/parceria/cadastro`;

  function copiar() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[12px] border border-rule bg-white p-3 text-xs text-graytext">
      <span className="font-bold text-charcoal">Link de autocadastro (mande pra quem você quer que se cadastre sozinho):</span>
      <span className="break-all">{url}</span>
      <button onClick={copiar} className="rounded-[7px] bg-charcoal px-3 py-1.5 font-bold text-white">
        {copiado ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

function NovaParceira({ userId, onCreated }) {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [praca, setPraca] = useState("");
  const [segmento, setSegmento] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [prioridade, setPrioridade] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function salvar(e) {
    e.preventDefault();
    if (!nome.trim()) return setError("Nome é obrigatório.");
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("pc_parceiras").insert({
      owner_id: userId,
      nome_fantasia: nome.trim(),
      cidade: cidade.trim() || null,
      uf: uf.trim().toUpperCase() || null,
      praca: praca.trim() || null,
      segmento_foco: segmento.trim() || null,
      responsavel_nome: responsavel.trim() || null,
      responsavel_telefone: telefone.trim() || null,
      prioridade: prioridade || null,
      prioridade_justificativa: prioridade ? "Definida na criação do cadastro." : null,
      prioridade_calculada_em: prioridade ? new Date().toISOString() : null,
      status_funil: "nao_contatado",
      origem: "Cadastro manual",
      token_registro: generateToken(),
    });
    setSaving(false);
    if (insertError) return setError("Erro ao salvar: " + insertError.message);
    onCreated();
  }

  return (
    <form onSubmit={salvar} className="mt-4 rounded-[14px] border border-rule bg-white p-5">
      <h2 className="font-serif mb-4 text-[16px] font-semibold text-charcoal">Nova parceira</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nome fantasia" value={nome} onChange={setNome} required />
        <Field label="Praça" value={praca} onChange={setPraca} placeholder="Ex.: Interior SP Norte" />
        <Field label="Cidade / região de atuação" value={cidade} onChange={setCidade} />
        <Field label="UF" value={uf} onChange={setUf} maxLength={2} />
        <Field label="Responsável (contato)" value={responsavel} onChange={setResponsavel} />
        <Field label="Telefone do responsável" value={telefone} onChange={setTelefone} placeholder="+55 11 99999-9999" />
        <div>
          <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">Prioridade (opcional)</label>
          <select
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value)}
            className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
          >
            <option value="">Ainda não avaliada</option>
            {Object.entries(PRIORIDADE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="mt-3 mb-[6px] block text-[13px] font-semibold text-charcoal">Segmento / foco de produto</label>
      <textarea
        value={segmento}
        onChange={(e) => setSegmento(e.target.value)}
        rows={2}
        placeholder="Ex.: Alto padrão, lançamentos, popular/MCMV, locação, rural…"
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      />
      {error && <p className="mt-3 text-sm text-[#B34A2E]">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Criar parceira"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, required, maxLength }) {
  return (
    <div>
      <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">{label}</label>
      <input
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

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { sha256Hex, onlyDigits } from "../../lib/hash";

const PERFIL_LABELS = {
  investidor: "Investidor",
  moradia: "Moradia",
  estudante: "Estudante",
  outro: "Outro",
};

const ENQUADRAMENTO_LABELS = {
  R2V: "Sem restrição",
  "HIS-1": "HIS-1",
  "HIS-2": "HIS-2",
  HMP: "HMP",
  NR: "Não residencial",
};

const RESTRITOS = ["HIS-1", "HIS-2", "HMP"];

// Núcleo do formulário de registro de cliente, reaproveitado tanto pelo
// registro interno (Marcos logado, grava direto na tabela) quanto pelo
// formulário público por token (grava via função de borda). Quem chama
// decide o `onSubmit` e passa a lista de corretores já carregada — o
// formulário em si não sabe se veio de um jeito ou do outro.
export function RegistroForm({ parceira, token, corretores: corretoresProp, empreendimentos: empreendimentosProp, onDone }) {
  const [corretores, setCorretores] = useState(corretoresProp ?? null);
  const [empreendimentos, setEmpreendimentos] = useState(empreendimentosProp ?? null);
  const [corretorId, setCorretorId] = useState("");
  const [novoCorretorNome, setNovoCorretorNome] = useState("");
  const [novoCorretorCreci, setNovoCorretorCreci] = useState("");
  const [novoCorretorTelefone, setNovoCorretorTelefone] = useState("");

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [perfil, setPerfil] = useState("");
  const [empreendimentoId, setEmpreendimentoId] = useState("");
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState([]);
  const [faixaRenda, setFaixaRenda] = useState("");
  const [possuiImovel, setPossuiImovel] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!corretoresProp) {
      supabase
        .from("pc_parceira_corretores")
        .select("id, nome")
        .eq("parceira_id", parceira.id)
        .eq("ativo", true)
        .order("nome")
        .then(({ data }) => setCorretores(data ?? []));
    }
    if (!empreendimentosProp) {
      supabase
        .from("pc_empreendimentos")
        .select("id, nome, pc_unidades(id, identificacao, tipologia, metragem_privativa, valor_total, enquadramento, disponivel, destaque_rede)")
        .eq("ativo", true)
        .order("nome")
        .then(({ data }) => setEmpreendimentos(data ?? []));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parceira.id]);

  const empreendimento = empreendimentos?.find((e) => e.id === empreendimentoId) ?? null;
  const unidadesDisponiveis = (empreendimento?.pc_unidades ?? []).filter((u) => u.disponivel);

  const temRestricao = useMemo(
    () =>
      unidadesSelecionadas.some((uid) => {
        const u = unidadesDisponiveis.find((x) => x.id === uid);
        return u && RESTRITOS.includes(u.enquadramento);
      }),
    [unidadesSelecionadas, unidadesDisponiveis],
  );

  function toggleUnidade(uid) {
    setUnidadesSelecionadas((s) => (s.includes(uid) ? s.filter((x) => x !== uid) : [...s, uid]));
  }

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!nome.trim()) return setError("Nome do cliente é obrigatório.");
    if (!onlyDigits(telefone)) return setError("Telefone do cliente é obrigatório.");
    if (!corretorId && !novoCorretorNome.trim())
      return setError("Escolha o corretor responsável, ou marque que é um novo corretor.");
    if (temRestricao && (!faixaRenda || possuiImovel === ""))
      return setError("A unidade escolhida tem restrição de renda — preencha a faixa de renda e se o cliente já possui imóvel.");

    setBusy(true);
    try {
      const cpfDigits = onlyDigits(cpf);
      const cliente_cpf_hash = cpfDigits.length === 11 ? await sha256Hex(cpfDigits) : null;
      const cliente_cpf_final = cpfDigits.length === 11 ? cpfDigits.slice(-3) : null;

      const payload = {
        parceira_id: parceira.id,
        token: token || undefined,
        corretor_id: corretorId || null,
        corretor_novo: corretorId
          ? null
          : { nome: novoCorretorNome.trim(), creci: novoCorretorCreci.trim() || null, telefone: novoCorretorTelefone.trim() || null },
        empreendimento_id: empreendimentoId || null,
        cliente_nome: nome.trim(),
        cliente_telefone: telefone.trim(),
        cliente_email: email.trim() || null,
        cliente_cpf_hash,
        cliente_cpf_final,
        cidade_origem: cidade.trim() || null,
        uf_origem: uf.trim().toUpperCase() || null,
        perfil: perfil || null,
        interesse_unidades: unidadesSelecionadas,
        faixa_renda_declarada: temRestricao ? Number(faixaRenda) : null,
        possui_imovel_declarado: temRestricao ? possuiImovel === "sim" : null,
        observacoes: observacoes.trim() || null,
      };

      const r = await onDone(payload);
      setResultado(r ?? { status: "ok" });
    } catch (err) {
      setError(err.message || "Não consegui registrar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (resultado) {
    return <Confirmacao resultado={resultado} onNovo={() => setResultado(null)} />;
  }

  return (
    <form onSubmit={enviar} className="rounded-[14px] border border-rule bg-white p-5">
      <SectionLabel>Corretor responsável</SectionLabel>
      {corretores === null ? (
        <p className="text-sm text-muted">Carregando…</p>
      ) : (
        <>
          <select
            value={corretorId}
            onChange={(e) => setCorretorId(e.target.value)}
            className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
          >
            <option value="">Sou eu, novo corretor</option>
            {corretores.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {!corretorId && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Field label="Seu nome" value={novoCorretorNome} onChange={setNovoCorretorNome} required />
              <Field label="CRECI" value={novoCorretorCreci} onChange={setNovoCorretorCreci} />
              <Field label="Seu telefone" value={novoCorretorTelefone} onChange={setNovoCorretorTelefone} />
            </div>
          )}
        </>
      )}

      <SectionLabel>Cliente</SectionLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="Nome do cliente" value={nome} onChange={setNome} required />
        <Field label="Telefone do cliente" value={telefone} onChange={setTelefone} placeholder="+55 11 99999-9999" required />
        <Field label="CPF (opcional)" value={cpf} onChange={setCpf} placeholder="Só fica guardada uma referência" />
        <Field label="E-mail (opcional)" value={email} onChange={setEmail} />
        <Field label="Cidade do cliente" value={cidade} onChange={setCidade} />
        <Field label="UF do cliente" value={uf} onChange={setUf} maxLength={2} />
        <div>
          <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">Perfil</label>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
          >
            <option value="">Selecione</option>
            {Object.entries(PERFIL_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SectionLabel>Empreendimento e unidades de interesse</SectionLabel>
      <select
        value={empreendimentoId}
        onChange={(e) => {
          setEmpreendimentoId(e.target.value);
          setUnidadesSelecionadas([]);
        }}
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      >
        <option value="">Selecione o empreendimento</option>
        {empreendimentos?.map((e) => (
          <option key={e.id} value={e.id}>
            {e.nome}
          </option>
        ))}
      </select>

      {empreendimento && (
        <div className="mt-2 space-y-2">
          {unidadesDisponiveis.length === 0 && (
            <p className="text-xs text-graytext">Nenhuma unidade disponível cadastrada neste empreendimento.</p>
          )}
          {unidadesDisponiveis.map((u) => (
            <label
              key={u.id}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-rule bg-white p-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={unidadesSelecionadas.includes(u.id)}
                  onChange={() => toggleUnidade(u.id)}
                  className="h-4 w-4 accent-gold"
                />
                <span>
                  {u.identificacao} · {u.tipologia} {u.metragem_privativa ? `· ${u.metragem_privativa}m²` : ""}
                  {u.valor_total ? ` · R$ ${Math.round(u.valor_total).toLocaleString("pt-BR")}` : ""}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-light px-[9px] py-[3px] text-[10.5px] font-bold text-graytext">
                {ENQUADRAMENTO_LABELS[u.enquadramento] ?? u.enquadramento}
              </span>
            </label>
          ))}
        </div>
      )}

      {temRestricao && (
        <div className="mt-3 rounded-[11px] bg-light p-3 text-[13px] text-graytext">
          <p className="mb-2 font-bold text-charcoal">
            Uma das unidades escolhidas tem restrição de renda ou de titularidade. Confirme com o cliente:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field
              label="Faixa de renda familiar (R$)"
              value={faixaRenda}
              onChange={setFaixaRenda}
              type="number"
              required
            />
            <div>
              <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">
                O cliente já possui imóvel?
              </label>
              <select
                value={possuiImovel}
                onChange={(e) => setPossuiImovel(e.target.value)}
                className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
              >
                <option value="">Selecione</option>
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <SectionLabel>Observações</SectionLabel>
      <textarea
        value={observacoes}
        onChange={(e) => setObservacoes(e.target.value)}
        rows={3}
        className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
      />

      {error && <p className="mt-3 text-sm text-[#B34A2E]">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-[11px] bg-charcoal px-[18px] py-[13px] text-[15px] font-bold text-white disabled:opacity-45"
      >
        {busy ? "Enviando…" : "Registrar cliente"}
      </button>
    </form>
  );
}

function Confirmacao({ resultado, onNovo }) {
  const msgs = {
    ok: {
      titulo: "Cliente registrado.",
      texto: `Validade até ${resultado.valido_ate ? new Date(resultado.valido_ate).toLocaleDateString("pt-BR") : "—"}. O coordenador confirma o registro na incorporadora e retorna com o protocolo.`,
    },
    conflito: {
      titulo: "Registro recebido.",
      texto: "Este cliente já possui registro vigente com outra origem. O coordenador vai analisar e retornar.",
    },
    alerta: {
      titulo: "Registro recebido.",
      texto: "A unidade escolhida tem restrição de renda ou titularidade; o coordenador vai confirmar a elegibilidade antes de validar.",
    },
  };
  const m = msgs[resultado.status] ?? msgs.ok;
  return (
    <div className="rounded-[14px] border border-rule bg-white p-5 text-center">
      <div className="mx-auto my-4 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-light text-[24px] text-gold">
        ✓
      </div>
      <h3 className="font-serif text-[18px] font-semibold text-charcoal">{m.titulo}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm text-graytext">{m.texto}</p>
      <button
        onClick={onNovo}
        className="mt-5 rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
      >
        Registrar outro cliente
      </button>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <h4 className="mt-[20px] mb-[8px] text-[11px] font-bold uppercase tracking-[.1em] text-graytext first:mt-0">
      {children}
    </h4>
  );
}

function Field({ label, value, onChange, placeholder, required, maxLength, type = "text" }) {
  return (
    <div>
      <label className="mb-[6px] block text-[13px] font-semibold text-charcoal">{label}</label>
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

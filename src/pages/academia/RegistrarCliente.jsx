import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { onlyDigits, sha256Hex } from "../../lib/hash";
import { RESTRITOS } from "../../lib/registros";

const PERFIS = [
  ["investidor", "Investidor"],
  ["moradia", "Moradia"],
  ["estudante", "Estudante"],
  ["outro", "Outro"],
];

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none";

const vazio = { nome: "", zap: "", cpf: "", cidade: "", uf: "", perfil: "", projeto: "", renda: "", imovel: "", obs: "" };

export default function RegistrarCliente() {
  const { acesso } = useAcessoCanal();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [kits, setKits] = useState(null);
  const [f, setF] = useState({ ...vazio, ...(state?.prefill ?? {}) });
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [autorizou, setAutorizou] = useState(false);

  useEffect(() => {
    supabase
      .from("pc_kits")
      .select("empreendimento_id, nome, tags, ordem")
      .order("ordem")
      .then(({ data }) => setKits(data ?? []));
  }, []);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;

  const kit = kits?.find((k) => k.empreendimento_id === f.projeto);
  const restrito = !!kit?.tags?.some((t) => RESTRITOS.includes(t));
  const set = (campoNome) => (e) => setF((x) => ({ ...x, [campoNome]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    if (!f.nome.trim()) return setErro("Nome do cliente é obrigatório.");
    if (onlyDigits(f.zap).length < 10) return setErro("Informe o WhatsApp do cliente com DDD.");
    if (!f.projeto) return setErro("Escolha o projeto.");
    if (!autorizou) return setErro("Confirme que o cliente autorizou o uso dos dados dele.");
    if (restrito && (!f.renda || !f.imovel)) {
      return setErro("Este projeto tem regra de renda: preencha a renda e se o cliente já possui imóvel.");
    }
    setErro("");
    setBusy(true);
    const cpf = onlyDigits(f.cpf);
    const cpfValido = cpf.length === 11;
    const { data, error } = await supabase.rpc("pc_registrar_cliente", {
      p_nome: f.nome.trim(),
      p_telefone: f.zap.trim(),
      p_empreendimento: f.projeto,
      p_perfil: f.perfil || null,
      p_cpf_hash: cpfValido ? await sha256Hex(cpf) : null,
      p_cpf_final: cpfValido ? cpf.slice(-3) : null,
      p_email: null,
      p_cidade: f.cidade.trim() || null,
      p_uf: f.uf.trim() || null,
      p_renda: restrito ? Number(onlyDigits(f.renda)) || null : null,
      p_possui_imovel: restrito ? f.imovel === "sim" : null,
      p_observacoes: f.obs.trim() || null,
    });
    setBusy(false);
    if (error) return setErro(error.message || "Não consegui registrar agora. Tente de novo.");
    setResultado({ ...data, cliente: f.nome.trim(), projeto: kit?.nome });
  }

  if (resultado) {
    const ate = new Date(resultado.valido_ate).toLocaleDateString("pt-BR");
    const conflito = resultado.status === "conflito";
    const alerta = !conflito && resultado.alerta;
    return (
      <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
        <h1 className="text-xl font-bold text-charcoal">Cliente registrado</h1>
        <div
          className={`mt-3 rounded-[12px] border p-3.5 text-[13px] ${
            conflito
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : alerta
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <h2 className="mb-1 text-base font-bold">{conflito ? "Em conflito" : alerta ? "Registrado, com alerta" : "Registrado"}</h2>
          {conflito ? (
            <>
              Já existe um registro vigente de <b>{resultado.cliente}</b> no {resultado.projeto}. O seu ficou em conflito e a
              coordenação decide qual vale. Você não precisa fazer nada, e avisamos aqui.
            </>
          ) : (
            <>
              <b>{resultado.cliente}</b> está registrado no {resultado.projeto} até <b>{ate}</b>. A coordenação confirma com a
              incorporadora.
              {alerta && <p className="mt-2">{resultado.alerta}</p>}
            </>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          <button
            onClick={() => navigate(`/app/academia/clientes/${resultado.id}`)}
            className="w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white"
          >
            Ver o registro
          </button>
          <button
            onClick={() => {
              setF({ ...vazio });
              setResultado(null);
            }}
            className="w-full rounded-[10px] border border-slate-300 bg-white px-4 py-[11px] text-sm font-bold text-slate-700"
          >
            Registrar outro cliente
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <Link to="/app/academia/clientes" className="text-sm text-graytext underline">
        ← Clientes registrados
      </Link>
      <h1 className="mt-2 text-xl font-bold text-charcoal">Registrar cliente</h1>
      <p className="mt-1 text-sm text-graytext">Registre antes de atender. O registro vale por 90 dias.</p>

      <Campo id="rc-nome" rotulo="Nome do cliente">
        <input id="rc-nome" value={f.nome} onChange={set("nome")} autoComplete="off" className={campo} />
      </Campo>
      <Campo id="rc-zap" rotulo="WhatsApp do cliente">
        <input
          id="rc-zap"
          value={f.zap}
          onChange={set("zap")}
          inputMode="tel"
          placeholder="(16) 99999-9999"
          autoComplete="off"
          className={campo}
        />
      </Campo>
      <Campo id="rc-cpf" rotulo="CPF (opcional)">
        <input id="rc-cpf" value={f.cpf} onChange={set("cpf")} inputMode="numeric" placeholder="Só números" autoComplete="off" className={campo} />
        <p className="mt-1 text-[11.5px] text-graytext">Guardamos só um código e os 3 últimos dígitos, nunca o CPF inteiro.</p>
      </Campo>
      <div className="mt-3 grid grid-cols-[1fr_78px] gap-2">
        <Campo id="rc-cid" rotulo="Cidade de origem" semMargem>
          <input id="rc-cid" value={f.cidade} onChange={set("cidade")} autoComplete="off" className={campo} />
        </Campo>
        <Campo id="rc-uf" rotulo="UF" semMargem>
          <input id="rc-uf" value={f.uf} onChange={set("uf")} maxLength={2} autoComplete="off" className={campo} />
        </Campo>
      </div>
      <Campo id="rc-perfil" rotulo="Perfil do cliente">
        <select id="rc-perfil" value={f.perfil} onChange={set("perfil")} className={campo}>
          <option value="">Escolha…</option>
          {PERFIS.map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      </Campo>
      <Campo id="rc-proj" rotulo="Projeto">
        <select id="rc-proj" value={f.projeto} onChange={set("projeto")} className={campo}>
          <option value="">{kits ? "Escolha…" : "Carregando…"}</option>
          {(kits ?? []).map((k) => (
            <option key={k.empreendimento_id} value={k.empreendimento_id}>
              {k.nome}
            </option>
          ))}
        </select>
      </Campo>

      {restrito && (
        <>
          <p className="mt-3 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            Este projeto tem regra de renda (HIS-2 e HMP). Informe os dois campos abaixo para conferirmos a elegibilidade.
          </p>
          <Campo id="rc-renda" rotulo="Renda familiar mensal (R$)">
            <input id="rc-renda" value={f.renda} onChange={set("renda")} inputMode="numeric" placeholder="Ex.: 8500" autoComplete="off" className={campo} />
          </Campo>
          <div className="mt-3">
            <span id="rc-im" className="block text-xs font-medium text-graytext">
              O cliente já possui imóvel?
            </span>
            <div className="mt-1 grid grid-cols-2 gap-1.5" role="group" aria-labelledby="rc-im">
              {[
                ["nao", "Não"],
                ["sim", "Sim"],
              ].map(([v, r]) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={f.imovel === v}
                  onClick={() => setF((x) => ({ ...x, imovel: v }))}
                  className={`rounded-[9px] border-[1.5px] px-2 py-2 text-[13px] font-semibold ${
                    f.imovel === v ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Campo id="rc-obs" rotulo="Observações (opcional)">
        <textarea id="rc-obs" value={f.obs} onChange={set("obs")} rows={3} className={campo} />
      </Campo>

      <label className="mt-4 flex items-start gap-2 text-[13px] text-graytext">
        <input
          type="checkbox"
          checked={autorizou}
          onChange={(e) => {
            setAutorizou(e.target.checked);
            setErro("");
          }}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          O cliente autorizou o uso dos dados dele para este registro e para o contato sobre o empreendimento (
          <a href="/privacidade.html" target="_blank" rel="noreferrer" className="underline">
            política de privacidade
          </a>
          ).
        </span>
      </label>

      {erro && (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {erro}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "Registrando…" : "Registrar cliente"}
      </button>
    </form>
  );
}

function Campo({ id, rotulo, children, semMargem }) {
  return (
    <div className={semMargem ? "" : "mt-3"}>
      <label htmlFor={id} className="block text-xs font-medium text-graytext">
        {rotulo}
      </label>
      {children}
    </div>
  );
}

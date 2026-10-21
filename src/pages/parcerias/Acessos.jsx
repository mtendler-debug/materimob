import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";

const FILTROS = [
  ["pendente", "Pendentes"],
  ["liberado", "Liberados"],
  ["recusado", "Recusados"],
  ["bloqueado", "Bloqueados"],
];

const VAZIO = {
  pendente: "Nenhum pedido esperando. Tudo em dia.",
  liberado: "Ninguém liberado ainda.",
  recusado: "Nenhum pedido recusado.",
  bloqueado: "Nenhum acesso bloqueado.",
};

const AUTONOMO = "__autonomo";

function haQuanto(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return "agora há pouco";
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

function linkWhatsapp(tel) {
  const d = (tel ?? "").replace(/\D/g, "");
  if (!d) return null;
  return `https://wa.me/${d.length <= 11 ? "55" + d : d}`;
}

// Fila de pedidos de acesso à Academia de Vendas. Todas as decisões passam
// por funções do banco (pc_decidir_acesso, pc_editar_acesso), que conferem
// que quem decide é o administrador do canal.
export default function Acessos() {
  const { contarPendentes } = useOutletContext();
  const { toast, confirm } = useFeedback();
  const [lista, setLista] = useState(null);
  const [ativas, setAtivas] = useState([]);
  const [filtro, setFiltro] = useState("pendente");
  const [editando, setEditando] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: acessos }, { data: parceiras }] = await Promise.all([
      supabase
        .from("pc_acessos")
        .select(
          "user_id, nome, whatsapp, creci, email, papel, status, imobiliaria_informada, parceira_id, created_at, decidido_em, pc_parceiras(nome_fantasia, validado)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("pc_parceiras").select("id, nome_fantasia").eq("ativa_na_academia", true).order("nome_fantasia"),
    ]);
    setLista(acessos ?? []);
    setAtivas(parceiras ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function decidir(p, status) {
    if (status === "bloqueado" && !(await confirm(`Bloquear o acesso de ${p.nome}? Ele perde tudo na hora, mas o histórico fica.`, { tone: "warning", confirmLabel: "Bloquear" })))
      return;
    setBusy(true);
    const { error } = await supabase.rpc("pc_decidir_acesso", { p_user: p.user_id, p_status: status });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    const msg = {
      liberado: `${p.nome} liberado(a). Já pode entrar na Academia.`,
      recusado: `Pedido de ${p.nome} recusado.`,
      bloqueado: `Acesso de ${p.nome} bloqueado.`,
    };
    toast(msg[status]);
    setEditando(null);
    await load();
    contarPendentes();
  }

  async function salvarEdicao(p, papel, imob) {
    if (papel === "gestor" && imob === AUTONOMO) return toast("Gestor precisa de uma imobiliária.", "warning");
    setBusy(true);
    const { error } = await supabase.rpc("pc_editar_acesso", {
      p_user: p.user_id,
      p_papel: papel,
      p_parceira_id: imob === AUTONOMO ? null : imob,
    });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast("Alterações salvas.");
    setEditando(null);
    load();
  }

  const url = `${window.location.origin}/academia`;
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiado.");
    } catch {
      toast("Não consegui copiar. Selecione o link e copie.", "warning");
    }
  }

  if (!lista) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const contagem = Object.fromEntries(FILTROS.map(([k]) => [k, lista.filter((p) => p.status === k).length]));
  const visiveis = lista.filter((p) => p.status === filtro);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Numero valor={contagem.liberado} rotulo="Corretores liberados" />
        <Numero valor={contagem.pendente} rotulo="Aguardando liberação" />
        <Numero valor={ativas.length} rotulo="Imobiliárias ativas na Academia" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-rule bg-white p-3">
        <div>
          <div className="text-xs text-graytext">Link de cadastro para divulgar aos parceiros</div>
          <div className="break-all text-[13.5px] font-semibold text-charcoal">{url}</div>
        </div>
        <button onClick={copiar} className="rounded-[7px] bg-charcoal px-3 py-1.5 text-xs font-bold text-white">
          Copiar link
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtro">
        {FILTROS.map(([k, rotulo]) => (
          <button
            key={k}
            aria-pressed={filtro === k}
            onClick={() => {
              setFiltro(k);
              setEditando(null);
            }}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${
              filtro === k ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-600"
            }`}
          >
            {rotulo} ({contagem[k]})
          </button>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-white">
        {visiveis.length === 0 && <p className="px-4 py-7 text-center text-sm text-graytext">{VAZIO[filtro]}</p>}
        {visiveis.map((p) => (
          <Linha
            key={p.user_id}
            p={p}
            busy={busy}
            ativas={ativas}
            editando={editando === p.user_id}
            onEditar={() => setEditando(editando === p.user_id ? null : p.user_id)}
            onDecidir={decidir}
            onSalvar={salvarEdicao}
          />
        ))}
      </div>
    </div>
  );
}

function Linha({ p, busy, ativas, editando, onEditar, onDecidir, onSalvar }) {
  const zap = linkWhatsapp(p.whatsapp);
  const parceira = p.pc_parceiras;
  const novo = parceira && parceira.validado === false;
  const [papel, setPapel] = useState(p.papel);
  const [imob, setImob] = useState(p.parceira_id ?? AUTONOMO);
  useEffect(() => {
    if (editando) {
      setPapel(p.papel);
      setImob(p.parceira_id ?? AUTONOMO);
    }
  }, [editando, p.papel, p.parceira_id]);
  const opcoes = ativas.some((a) => a.id === p.parceira_id) || !p.parceira_id
    ? ativas
    : [...ativas, { id: p.parceira_id, nome_fantasia: parceira?.nome_fantasia ?? "Imobiliária atual" }];

  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-rule px-3.5 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1.3fr)_auto_auto] sm:gap-3.5">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-charcoal">{p.nome}</div>
        <div className="text-[12.5px] text-graytext">
          {zap ? (
            <a href={zap} target="_blank" rel="noreferrer" className="text-sky-700 underline">
              {p.whatsapp}
            </a>
          ) : (
            "sem WhatsApp"
          )}
          {" · "}
          {p.creci ? `CRECI ${p.creci}` : "sem CRECI informado"}
          {" · "}
          {p.status === "pendente" ? haQuanto(p.created_at) : p.decidido_em ? haQuanto(p.decidido_em) : haQuanto(p.created_at)}
        </div>
      </div>

      <div className="min-w-0 text-[13.5px] text-charcoal">
        {parceira?.nome_fantasia ?? (p.imobiliaria_informada ? p.imobiliaria_informada : "Autônomo")}
        {novo && (
          <span className="ml-1.5 rounded-full border border-amber-300 bg-amber-100 px-2 text-[11.5px] font-semibold text-amber-800">
            cadastro novo
          </span>
        )}
      </div>

      <div>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${
            p.papel === "gestor" ? "border-purple-300 bg-purple-100 text-purple-800" : "border-rule bg-slate-100 text-slate-600"
          }`}
        >
          {p.papel === "gestor" ? "Gestor" : "Corretor"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {p.status !== "liberado" && (
          <Botao disabled={busy} tom="ok" onClick={() => onDecidir(p, "liberado")}>
            Liberar
          </Botao>
        )}
        {p.status === "pendente" && (
          <Botao disabled={busy} tom="ruim" onClick={() => onDecidir(p, "recusado")}>
            Recusar
          </Botao>
        )}
        {p.status === "liberado" && (
          <Botao disabled={busy} tom="ruim" onClick={() => onDecidir(p, "bloqueado")}>
            Bloquear
          </Botao>
        )}
        <Botao disabled={busy} onClick={onEditar}>
          Editar
        </Botao>
      </div>

      {novo && p.status === "pendente" && (
        <p className="rounded-[8px] border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[12.5px] text-amber-800 sm:col-span-full">
          Esta imobiliária não estava na lista. Ela entrou em Parcerias como não validada, e liberar a pessoa não muda
          isso.{" "}
          <Link to={`/app/parcerias/parceiras/${p.parceira_id}`} className="underline">
            Ver cadastro
          </Link>
        </p>
      )}

      {editando && (
        <div className="flex flex-wrap items-end gap-2 rounded-[10px] border border-rule bg-bg p-2.5 sm:col-span-full">
          <label className="min-w-[150px] flex-1 text-xs font-medium text-graytext">
            Papel
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value)}
              className="mt-1 w-full rounded-[8px] border border-rule bg-white px-2 py-2 text-sm text-charcoal"
            >
              <option value="corretor">Corretor</option>
              <option value="gestor">Gestor</option>
            </select>
          </label>
          <label className="min-w-[150px] flex-1 text-xs font-medium text-graytext">
            Imobiliária
            <select
              value={imob}
              onChange={(e) => setImob(e.target.value)}
              className="mt-1 w-full rounded-[8px] border border-rule bg-white px-2 py-2 text-sm text-charcoal"
            >
              {opcoes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_fantasia}
                </option>
              ))}
              <option value={AUTONOMO}>Autônomo</option>
            </select>
          </label>
          <Botao disabled={busy} tom="ok" onClick={() => onSalvar(p, papel, imob)}>
            Salvar
          </Botao>
          <Botao disabled={busy} onClick={onEditar}>
            Cancelar
          </Botao>
        </div>
      )}
    </div>
  );
}

function Numero({ valor, rotulo }) {
  return (
    <div className="rounded-[12px] border border-rule bg-white px-3 py-2.5">
      <b className="block text-[22px] leading-tight text-charcoal tabular-nums">{valor}</b>
      <span className="text-xs text-graytext">{rotulo}</span>
    </div>
  );
}

function Botao({ tom, children, ...props }) {
  const cls =
    tom === "ok"
      ? "bg-emerald-800 text-white"
      : tom === "ruim"
        ? "border border-rose-300 bg-white text-rose-800"
        : "border border-slate-300 bg-white text-slate-700";
  return (
    <button {...props} className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { useFeedback } from "../../lib/feedback";
import { semAcento } from "../../lib/treino";

export const ETAPAS = [
  ["abordagem", "Abordagem"],
  ["qualificacao", "Qualificação"],
  ["apresentacao", "Apresentação"],
  ["objecao", "Objeção"],
  ["fechamento", "Fechamento"],
  ["pos_venda", "Pós-venda"],
];
export const ETAPA_LABELS = Object.fromEntries(ETAPAS);

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[9px] text-[13.5px] text-charcoal focus:border-gold focus:outline-none";
const btnEscuro = "rounded-[8px] bg-charcoal px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50";
const btnLinha = "rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700";

// Biblioteca de argumentos por etapa da venda e por projeto. Copiar também conta
// o uso (pc_usar_argumento) e registra a atividade do corretor.
export default function Argumentos() {
  const { user } = useAuth();
  const { acesso } = useAcessoCanal();
  const { toast } = useFeedback();
  const [lista, setLista] = useState(null);
  const [projetos, setProjetos] = useState([]);
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState("todas");
  const [projeto, setProjeto] = useState("todos");
  const [abertos, setAbertos] = useState({});
  const [form, setForm] = useState(null);

  async function carregar() {
    const [a, k] = await Promise.all([
      supabase.from("pc_argumentos").select("id, etapa, titulo, texto, empreendimento_id, usos, status, sugerido_por").order("created_at"),
      supabase.from("pc_kits").select("empreendimento_id, nome, ordem").order("ordem"),
    ]);
    setLista(a.data ?? []);
    setProjetos(k.data ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;

  const nomeProjeto = new Map(projetos.map((p) => [p.empreendimento_id, p.nome]));
  const publicados = (lista ?? []).filter((a) => a.status === "publicada");
  const minhas = (lista ?? []).filter((a) => a.status === "sugerida" && a.sugerido_por === user?.id);

  const q = semAcento(busca.trim());
  const visiveis = publicados.filter((a) => {
    if (etapa !== "todas" && a.etapa !== etapa) return false;
    if (projeto === "geral" && a.empreendimento_id) return false;
    if (projeto !== "todos" && projeto !== "geral" && a.empreendimento_id !== projeto) return false;
    if (q && !semAcento(`${a.titulo} ${a.texto}`).includes(q)) return false;
    return true;
  });

  async function copiar(a) {
    try {
      await navigator.clipboard.writeText(a.texto);
      toast("Copiado. Troque os trechos entre colchetes.");
    } catch {
      toast("Uso registrado. Selecione o texto para copiar.", "warning");
    }
    const { error } = await supabase.rpc("pc_usar_argumento", { p_id: a.id });
    if (!error) setLista((l) => l.map((x) => (x.id === a.id ? { ...x, usos: x.usos + 1 } : x)));
  }

  async function enviarSugestao(e) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.texto.trim()) return setForm((f) => ({ ...f, erro: "Informe título e texto." }));
    setForm((f) => ({ ...f, busy: true, erro: "" }));
    const { error } = await supabase.rpc("pc_sugerir_argumento", {
      p_etapa: form.etapa,
      p_titulo: form.titulo.trim(),
      p_texto: form.texto.trim(),
      p_empreendimento: null,
    });
    if (error) return setForm((f) => ({ ...f, busy: false, erro: error.message || "Não consegui enviar agora." }));
    setForm(null);
    toast("Enviado. A coordenação revisa antes de publicar.");
    carregar();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <h1 className="text-xl font-bold text-charcoal">Argumentos</h1>
      <p className="mt-1 text-sm text-graytext">Respostas e mensagens prontas por etapa da venda. Copie, ajuste e envie.</p>

      <input
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar, ex.: SCP, Airbnb, renda"
        aria-label="Buscar argumento"
        className={`${campo} mt-4`}
      />

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Etapa">
        {[["todas", "Todas"], ...ETAPAS].map(([k, rotulo]) => (
          <button
            key={k}
            type="button"
            aria-pressed={etapa === k}
            onClick={() => setEtapa(k)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${
              etapa === k ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-600"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      <label className="mt-2 block text-xs font-medium text-graytext">
        Projeto
        <select value={projeto} onChange={(e) => setProjeto(e.target.value)} className={campo}>
          <option value="todos">Todos os projetos</option>
          <option value="geral">Geral (qualquer projeto)</option>
          {projetos.map((p) => (
            <option key={p.empreendimento_id} value={p.empreendimento_id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      {!form ? (
        <button onClick={() => setForm({ etapa: "objecao", titulo: "", texto: "", erro: "", busy: false })} className={`${btnLinha} mt-3 w-full py-2.5`}>
          Sugerir um argumento
        </button>
      ) : (
        <form onSubmit={enviarSugestao} className="mt-3 rounded-[12px] border border-rule bg-white p-3">
          <label className="block text-xs font-medium text-graytext">
            Etapa
            <select value={form.etapa} onChange={(e) => setForm({ ...form, etapa: e.target.value })} className={campo}>
              {ETAPAS.map(([k, rotulo]) => (
                <option key={k} value={k}>
                  {rotulo}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-xs font-medium text-graytext">
            Título
            <input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ex.: Cliente pede desconto à vista"
              className={campo}
            />
          </label>
          <label className="mt-2 block text-xs font-medium text-graytext">
            Texto
            <textarea
              value={form.texto}
              onChange={(e) => setForm({ ...form, texto: e.target.value })}
              placeholder="Como você responde"
              rows={4}
              className={campo}
            />
          </label>
          {form.erro && (
            <p role="alert" className="mt-2 text-[12.5px] text-rose-700">
              {form.erro}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={form.busy} className={btnEscuro}>
              {form.busy ? "Enviando…" : "Enviar sugestão"}
            </button>
            <button type="button" onClick={() => setForm(null)} className={btnLinha}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {minhas.length > 0 && (
        <>
          <h2 className="mb-1.5 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Minhas sugestões</h2>
          {minhas.map((m) => (
            <div key={m.id} className="mt-2 rounded-[12px] border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px]">
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-px text-[11.5px] font-semibold text-amber-800">
                Aguardando revisão
              </span>
              <b className="mt-1 block text-charcoal">{m.titulo}</b>
            </div>
          ))}
        </>
      )}

      <h2 className="mb-1 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">
        {lista === null ? "Carregando…" : `${visiveis.length} ${visiveis.length === 1 ? "argumento" : "argumentos"}`}
      </h2>
      {lista !== null && visiveis.length === 0 && (
        <div className="rounded-[12px] border border-rule bg-white px-3.5 py-4 text-center text-[13px] text-graytext">
          Nenhum argumento com esse filtro. Tente outra palavra ou etapa.
        </div>
      )}
      {visiveis.map((a) => {
        const aberto = !!abertos[a.id];
        const projetoNome = nomeProjeto.get(a.empreendimento_id);
        return (
          <div key={a.id} className="mt-2 rounded-[12px] border border-rule bg-white px-3.5 py-3">
            <div className="mb-1 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-px text-[11.5px] font-semibold text-purple-800">
                {ETAPA_LABELS[a.etapa] ?? a.etapa}
              </span>
              <span
                className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${
                  projetoNome ? "border-sky-300 bg-sky-100 text-sky-800" : "border-rule bg-slate-100 text-slate-600"
                }`}
              >
                {projetoNome ?? "Geral"}
              </span>
            </div>
            <b className="block text-[13.5px] leading-snug text-charcoal">{a.titulo}</b>
            <div className={`mt-1 whitespace-pre-wrap text-[13px] text-slate-600 ${aberto ? "" : "line-clamp-3"}`}>{a.texto}</div>
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => copiar(a)} className={btnEscuro}>
                Copiar
              </button>
              <button onClick={() => setAbertos((x) => ({ ...x, [a.id]: !aberto }))} className={btnLinha}>
                {aberto ? "Ver menos" : "Ver tudo"}
              </button>
              <span className="ml-auto text-[11.5px] text-muted">
                {a.usos > 0 ? `usado ${a.usos} ${a.usos === 1 ? "vez" : "vezes"}` : "ainda não usado"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

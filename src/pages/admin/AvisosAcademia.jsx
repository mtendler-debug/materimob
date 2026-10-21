import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { haQuanto } from "../../lib/academiaUtil";

const PUBLICOS = { todos: "Todos", corretores: "Só corretores", gestores: "Só gestores" };

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[8px] text-sm text-charcoal focus:border-gold focus:outline-none";

// Comunicados para a rede. Aparecem no Início do corretor (os 3 mais recentes
// ativos do público dele). Desligar não apaga.
export default function AvisosAcademia() {
  const { toast } = useFeedback();
  const [lista, setLista] = useState(null);
  const [f, setF] = useState({ titulo: "", texto: "", publico: "todos" });
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("pc_avisos").select("id, titulo, texto, publico, ativo, publicado_em").order("publicado_em", { ascending: false });
    setLista(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function publicar(e) {
    e.preventDefault();
    if (!f.titulo.trim() || !f.texto.trim()) return toast("Informe título e texto.", "warning");
    setBusy(true);
    const { error } = await supabase.from("pc_avisos").insert({ titulo: f.titulo.trim(), texto: f.texto.trim(), publico: f.publico });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    setF({ titulo: "", texto: "", publico: "todos" });
    toast("Aviso publicado. Aparece no Início de quem tem acesso.");
    load();
  }

  async function alternar(a, ativo) {
    setLista((l) => l.map((x) => (x.id === a.id ? { ...x, ativo } : x)));
    const { error } = await supabase.from("pc_avisos").update({ ativo }).eq("id", a.id);
    if (error) {
      toast(error.message, "danger");
      return load();
    }
    toast(ativo ? "Aviso ligado. Volta a aparecer no Início." : "Aviso desligado. Some do Início, mas não é apagado.");
  }

  return (
    <div className="mt-4 grid items-start gap-3.5 lg:grid-cols-2">
      <div>
        <form onSubmit={publicar} className="rounded-[12px] border border-rule bg-white p-3.5">
          <h4 className="text-xs font-bold uppercase tracking-[.08em] text-graytext">Novo aviso</h4>
          <label className="mt-2 block text-xs font-medium text-graytext">
            Título
            <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Nova tabela do Verya" className={campo} />
          </label>
          <label className="mt-2 block text-xs font-medium text-graytext">
            Texto
            <textarea value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} rows={4} placeholder="O que o corretor precisa saber" className={campo} />
          </label>
          <label className="mt-2 block text-xs font-medium text-graytext">
            Quem vê
            <select value={f.publico} onChange={(e) => setF({ ...f, publico: e.target.value })} className={campo}>
              {Object.entries(PUBLICOS).map(([k, r]) => (
                <option key={k} value={k}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={busy} className="mt-3 rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? "Publicando…" : "Publicar aviso"}
          </button>
        </form>

        <h4 className="mb-1.5 mt-4 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Como o corretor vê no Início</h4>
        <div className="rounded-[12px] border border-sky-200 bg-sky-100 px-3 py-2.5 text-[13px] text-sky-900">
          <b className="block">{f.titulo || "Título do aviso"}</b>
          {f.texto || "O texto aparece aqui."}
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-rule bg-white">
        <h4 className="border-b border-rule px-3.5 py-2.5 text-xs font-bold uppercase tracking-[.08em] text-graytext">Avisos publicados</h4>
        {lista === null && <p className="px-3.5 py-4 text-sm text-muted">Carregando…</p>}
        {lista?.length === 0 && <p className="px-3.5 py-5 text-sm text-graytext">Nenhum aviso ainda.</p>}
        {lista?.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-charcoal">{a.titulo}</div>
              <div className="whitespace-pre-wrap text-[12.5px] text-graytext">{a.texto}</div>
              <div className="mt-1 text-[12px] text-graytext">
                <span className="rounded-full border border-rule bg-slate-100 px-2 py-px font-semibold text-slate-600">{PUBLICOS[a.publico]}</span> {haQuanto(a.publicado_em)}
              </div>
            </div>
            <label className="relative inline-block h-[22px] w-[38px] flex-none cursor-pointer" title={a.ativo ? "Ligado" : "Desligado"}>
              <input type="checkbox" checked={a.ativo} onChange={(e) => alternar(a, e.target.checked)} aria-label={`Mostrar aviso ${a.titulo}`} className="peer sr-only" />
              <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-emerald-800 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-sky-700" />
              <span className="absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-4" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

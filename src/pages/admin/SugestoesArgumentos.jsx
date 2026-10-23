import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { haQuanto } from "../../lib/academiaUtil";
import { ETAPA_LABELS } from "../academia/Argumentos";

const campo =
  "mt-1 w-full rounded-control border border-slate-200/70 bg-white px-[10px] py-[9px] text-sm text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none";

// Caixa de entrada dos argumentos sugeridos pelos corretores. Publicar coloca o
// argumento na biblioteca de todos; arquivar descarta. O dono é o único que
// escreve em pc_argumentos (a RLS exige pc_sou_dono_do_canal).
export default function SugestoesArgumentos() {
  const { contarPendentes } = useOutletContext();
  const { toast } = useFeedback();
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [{ data: args }, { data: acessos }] = await Promise.all([
      supabase
        .from("pc_argumentos")
        .select("id, etapa, titulo, texto, sugerido_por, sugerido_por_nome, created_at")
        .eq("status", "sugerida")
        .order("created_at", { ascending: false }),
      supabase.from("pc_acessos").select("user_id, pc_parceiras(nome_fantasia)"),
    ]);
    const imobs = new Map((acessos ?? []).map((a) => [a.user_id, a.pc_parceiras?.nome_fantasia]));
    setLista((args ?? []).map((a) => ({ ...a, imobiliaria: imobs.get(a.sugerido_por) ?? "Autônomo" })));
  }

  useEffect(() => {
    load();
  }, []);

  async function atualizar(a, campos, mensagem) {
    setBusy(true);
    const { error } = await supabase.from("pc_argumentos").update(campos).eq("id", a.id);
    setBusy(false);
    if (error) {
      return toast(error.code === "23505" ? "Já existe um argumento com esse título." : error.message, "danger");
    }
    toast(mensagem);
    setEditando(null);
    await load();
    contarPendentes();
  }

  if (!lista) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto mt-4 max-w-4xl">
      <div className="overflow-hidden rounded-card border border-slate-200/70 bg-white">
        {lista.length === 0 && <p className="px-4 py-7 text-center text-sm text-graytext">Nenhuma sugestão esperando. Tudo em dia.</p>}
        {lista.map((a) => {
          const ed = editando?.id === a.id;
          return (
            <div key={a.id} className="grid gap-1.5 border-b border-slate-200/70 px-3.5 py-3 last:border-b-0">
              <div className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-graytext">
                <b className="text-charcoal">{a.sugerido_por_nome ?? "Corretor"}</b>
                <span>· {a.imobiliaria} · {haQuanto(a.created_at)} ·</span>
                <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-px text-[11.5px] font-semibold text-purple-800">
                  {ETAPA_LABELS[a.etapa] ?? a.etapa}
                </span>
              </div>

              {!ed ? (
                <>
                  <div className="text-sm font-semibold text-charcoal">{a.titulo}</div>
                  <div className="whitespace-pre-wrap text-[13px] text-slate-600">{a.texto}</div>
                </>
              ) : (
                <div className="rounded-control border border-slate-200/70 bg-bg p-2.5">
                  <label className="block text-xs font-medium text-graytext">
                    Título
                    <input value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} className={campo} />
                  </label>
                  <label className="mt-2 block text-xs font-medium text-graytext">
                    Texto
                    <textarea value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} rows={4} className={campo} />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {!ed ? (
                  <>
                    <Botao tom="ok" disabled={busy} onClick={() => atualizar(a, { status: "publicada" }, "Publicado. Já está na biblioteca de todos os corretores.")}>
                      Publicar
                    </Botao>
                    <Botao disabled={busy} onClick={() => setEditando({ id: a.id, titulo: a.titulo, texto: a.texto })}>
                      Editar
                    </Botao>
                    <Botao tom="ruim" disabled={busy} onClick={() => atualizar(a, { status: "arquivada" }, "Sugestão arquivada.")}>
                      Arquivar
                    </Botao>
                  </>
                ) : (
                  <>
                    <Botao
                      tom="ok"
                      disabled={busy || !editando.titulo.trim() || !editando.texto.trim()}
                      onClick={() =>
                        atualizar(a, { titulo: editando.titulo.trim(), texto: editando.texto.trim(), status: "publicada" }, "Publicado com as suas alterações.")
                      }
                    >
                      Salvar e publicar
                    </Botao>
                    <Botao disabled={busy} onClick={() => setEditando(null)}>
                      Cancelar
                    </Botao>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Botao({ tom, children, ...props }) {
  const cls =
    tom === "ok"
      ? "bg-emerald-800 text-white"
      : tom === "ruim"
        ? "border border-rose-300 bg-white text-danger-text"
        : "border border-slate-300 bg-white text-slate-700";
  return (
    <button {...props} className={`rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

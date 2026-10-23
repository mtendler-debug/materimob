import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { Interruptor, btnEscuro } from "./conteudoUi";

export default function TrilhasConteudo() {
  const { toast } = useFeedback();
  const [trilhas, setTrilhas] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("pc_trilhas")
      .select("id, titulo, nivel, nota_minima, publicada, ordem, pc_aulas(count), pc_quiz_perguntas(count)")
      .order("ordem")
      .order("nivel");
    setTrilhas(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function publicar(t, publicada) {
    setTrilhas((l) => l.map((x) => (x.id === t.id ? { ...x, publicada } : x)));
    const { error } = await supabase.from("pc_trilhas").update({ publicada }).eq("id", t.id);
    if (error) {
      toast(error.message, "danger");
      return load();
    }
    toast(publicada ? "Trilha publicada." : "Trilha despublicada. Some do Treinamento, e o histórico de quem fez fica guardado.");
  }

  if (!trilhas) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-card border border-slate-200/70 bg-white">
        {trilhas.length === 0 && <p className="px-4 py-6 text-center text-sm text-graytext">Nenhuma trilha ainda.</p>}
        {trilhas.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-charcoal">{t.titulo}</div>
              <div className="text-[12.5px] text-graytext">
                {t.pc_aulas?.[0]?.count ?? 0} aulas · {t.pc_quiz_perguntas?.[0]?.count ?? 0} perguntas · nota mínima {t.nota_minima}%
              </div>
            </div>
            <div className="flex flex-none items-center gap-3">
              <Interruptor marcado={t.publicada} onChange={(v) => publicar(t, v)} rotulo={`Publicar ${t.titulo}`} />
              <Link to={`/admin/academia/conteudo/trilhas/${t.id}`} className="rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700">
                Editar
              </Link>
            </div>
          </div>
        ))}
      </div>
      <Link to="/admin/academia/conteudo/trilhas/nova" className={`${btnEscuro} mt-3 inline-block`}>
        Nova trilha
      </Link>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { Interruptor } from "./conteudoUi";

export default function ProjetosConteudo() {
  const { toast } = useFeedback();
  const [kits, setKits] = useState(null);

  async function load() {
    const { data } = await supabase
      .from("pc_kits")
      .select("id, codigo, nome, local_texto, fase, preco_desde, capa_url, publicado, ordem")
      .order("ordem");
    setKits(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function publicar(k, publicado) {
    setKits((l) => l.map((x) => (x.id === k.id ? { ...x, publicado } : x)));
    const { error } = await supabase.from("pc_kits").update({ publicado }).eq("id", k.id);
    if (error) {
      toast(error.message, "danger");
      return load();
    }
    toast(publicado ? "Projeto publicado. Os corretores já veem." : "Projeto despublicado. Some do catálogo, e os links já enviados continuam abrindo.");
  }

  if (!kits) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  return (
    <div className="mt-3 overflow-hidden rounded-[12px] border border-rule bg-white">
      {kits.length === 0 && <p className="px-4 py-6 text-center text-sm text-graytext">Nenhum projeto ainda.</p>}
      {kits.map((k) => (
        <div key={k.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3.5 py-3 last:border-b-0">
          <div className="flex min-w-0 items-center gap-3">
            {k.capa_url ? <img src={k.capa_url} alt="" className="h-12 w-16 flex-none rounded-[8px] object-cover" /> : <div className="h-12 w-16 flex-none rounded-[8px] bg-slate-100" />}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-charcoal">{k.nome}</div>
              <div className="truncate text-[12.5px] text-graytext">{[k.local_texto, k.fase, k.preco_desde].filter(Boolean).join(" · ")}</div>
            </div>
          </div>
          <div className="flex flex-none items-center gap-3">
            <Interruptor marcado={k.publicado} onChange={(v) => publicar(k, v)} rotulo={`Publicar ${k.nome}`} />
            <Link to={`/admin/academia/conteudo/projetos/${k.codigo}`} className="rounded-[8px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700">
              Editar
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

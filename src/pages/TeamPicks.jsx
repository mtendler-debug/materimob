import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useOrganization } from "../lib/useOrganization";
import { loadCatalogItems } from "../lib/catalogo";
import { CatalogBrowser } from "../components/CatalogBrowser";

// A curadoria de verdade da imobiliária: escolhe, de qualquer origem da
// plataforma, o que o time dela deve estar oferecendo. Mecanismo puro —
// nenhuma categoria embutida, a imobiliária escolhe o que quiser e escreve
// a observação que quiser. Aparece pro time em /app/imoveis.
export default function TeamPicks() {
  const { org, loading: loadingOrg } = useOrganization();
  const [picks, setPicks] = useState(null);
  const [items, setItems] = useState(null);

  async function loadPicks() {
    const { data } = await supabase
      .from("av_team_picks")
      .select("*")
      .eq("organization_id", org.id)
      .order("position");
    setPicks(data ?? []);
  }

  useEffect(() => {
    if (!org) return;
    loadPicks();
    loadCatalogItems().then(setItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org]);

  if (loadingOrg || !org) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  const picksResolvidos = (picks ?? [])
    .map((p) => {
      const item = items?.find((it) =>
        p.portfolio_property_id ? it.kind === "portfolio" && it.id === p.portfolio_property_id : it.kind === "lancamento" && it.id === p.launch_id,
      );
      return item ? { pick: p, item } : null;
    })
    .filter(Boolean);

  const pickedKeys = new Set((picks ?? []).map((p) => (p.portfolio_property_id ? `portfolio-${p.portfolio_property_id}` : `lancamento-${p.launch_id}`)));

  async function mover(index, direcao) {
    const alvo = index + direcao;
    if (alvo < 0 || alvo >= picksResolvidos.length) return;
    const a = picksResolvidos[index].pick;
    const b = picksResolvidos[alvo].pick;
    await Promise.all([
      supabase.from("av_team_picks").update({ position: b.position }).eq("id", a.id),
      supabase.from("av_team_picks").update({ position: a.position }).eq("id", b.id),
    ]);
    loadPicks();
  }

  async function remover(pickId) {
    if (!window.confirm("Remover da seleção do time?")) return;
    await supabase.from("av_team_picks").delete().eq("id", pickId);
    loadPicks();
  }

  async function editarNota(pick) {
    const nova = window.prompt("Nota para o time (opcional)", pick.note || "");
    if (nova == null) return;
    await supabase.from("av_team_picks").update({ note: nova.trim() || null }).eq("id", pick.id);
    loadPicks();
  }

  async function adicionar(item) {
    const note = window.prompt("Nota para o time (opcional)", "");
    if (note === null) return;
    const proximaPosicao = (picks ?? []).reduce((max, p) => Math.max(max, p.position), -1) + 1;
    await supabase.from("av_team_picks").insert({
      organization_id: org.id,
      portfolio_property_id: item.kind === "portfolio" ? item.id : null,
      launch_id: item.kind === "lancamento" ? item.id : null,
      note: note.trim() || null,
      position: proximaPosicao,
    });
    loadPicks();
  }

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-charcoal">Seleção do time</h1>
        <p className="text-sm text-graytext">
          O que você escolher aqui aparece em destaque para todo o time da {org.name} em Imóveis —
          de qualquer origem da plataforma, com a nota que você quiser escrever.
        </p>

        <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
          Selecionados ({picksResolvidos.length})
        </h2>
        {picksResolvidos.length === 0 && <p className="text-sm text-muted">Nenhum item selecionado ainda.</p>}
        <div className="space-y-2">
          {picksResolvidos.map(({ pick, item }, i) => (
            <div key={pick.id} className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${item.color || "#A68A5B"}` }}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-charcoal">{item.name}</p>
                  {item.orgName && (
                    <p className="text-xs text-graytext">
                      {item.orgName} {item.kind === "lancamento" ? "· lançamento" : "· pronto"}
                    </p>
                  )}
                  {pick.note && <p className="mt-1 text-sm text-graytext">{pick.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-xs font-bold text-graytext underline disabled:opacity-30">
                    ↑
                  </button>
                  <button
                    onClick={() => mover(i, 1)}
                    disabled={i === picksResolvidos.length - 1}
                    className="text-xs font-bold text-graytext underline disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <button onClick={() => editarNota(pick)} className="text-xs font-bold text-graytext underline">
                  editar nota
                </button>
                <button onClick={() => remover(pick.id)} className="text-xs font-bold text-[#B34A2E] underline">
                  remover
                </button>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mt-8 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
          Buscar e adicionar
        </h2>
        <CatalogBrowser
          renderAction={(item) => {
            const key = `${item.kind}-${item.id}`;
            if (pickedKeys.has(key)) {
              return <span className="text-xs font-bold text-muted">já está na seleção</span>;
            }
            return (
              <button onClick={() => adicionar(item)} className="text-xs font-bold text-graytext underline">
                Adicionar à seleção do time
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}

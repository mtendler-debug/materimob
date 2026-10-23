import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useOrganization } from "../lib/useOrganization";
import { loadCatalogItems } from "../lib/catalogo";
import { CatalogBrowser } from "../components/CatalogBrowser";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import { estiloCapa } from "../lib/capa";
import { useCapasAcademia } from "../lib/capasAcademia";

// A curadoria de verdade da imobiliária: escolhe, de qualquer origem da
// plataforma, o que o time dela deve estar oferecendo. Mecanismo puro —
// nenhuma categoria embutida, a imobiliária escolhe o que quiser e escreve
// a observação que quiser. Aparece pro time em /app/imoveis.
export default function TeamPicks() {
  const { confirm, toast } = useFeedback();
  const { org, loading: loadingOrg } = useOrganization();
  const [picks, setPicks] = useState(null);
  const [items, setItems] = useState(null);
  const [catalogoAberto, setCatalogoAberto] = useState(false);
  const capaAcademia = useCapasAcademia();
  const [notaEmEdicao, setNotaEmEdicao] = useState(null);

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
    if (!(await confirm("Remover da seleção do time?"))) return;
    await supabase.from("av_team_picks").delete().eq("id", pickId);
    loadPicks();
    toast("Removido da seleção do time.");
  }

  async function salvarNota(pick, texto) {
    setNotaEmEdicao(null);
    const nova = texto.trim() || null;
    if (nova === (pick.note || null)) return;
    await supabase.from("av_team_picks").update({ note: nova }).eq("id", pick.id);
    loadPicks();
  }

  async function adicionar(item) {
    const proximaPosicao = (picks ?? []).reduce((max, p) => Math.max(max, p.position), -1) + 1;
    const { data } = await supabase
      .from("av_team_picks")
      .insert({
        organization_id: org.id,
        portfolio_property_id: item.kind === "portfolio" ? item.id : null,
        launch_id: item.kind === "lancamento" ? item.id : null,
        note: null,
        position: proximaPosicao,
      })
      .select("id")
      .single();
    await loadPicks();
    setCatalogoAberto(false);
    // A nota vem logo depois, no próprio item, em vez de numa janela do navegador.
    if (data?.id) setNotaEmEdicao(data.id);
    toast("Adicionado à seleção do time.");
  }

  const iconeBtn =
    "grid h-9 w-9 place-items-center rounded-[10px] text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[780px] px-4 py-8 pb-24 md:px-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Seleção do time</h1>
            <p className="mt-1.5 max-w-[60ch] text-base text-graytext">
              O que você escolher aqui aparece em destaque para todo o time da {org.name} em Imóveis, de qualquer origem da
              plataforma, com a nota que você quiser escrever.
            </p>
          </div>
          <Button onClick={() => setCatalogoAberto(true)}>+ Adicionar imóvel</Button>
        </div>

        <h2 className="mt-8 mb-2.5 text-caption font-semibold tracking-[.08em] text-muted uppercase">
          Selecionados ({picksResolvidos.length})
        </h2>
        {picks !== null && picksResolvidos.length === 0 && (
          <div className="rounded-card border border-dashed border-slate-300 px-4 py-12 text-center text-graytext">
            <b className="mb-1 block text-body text-charcoal">Nenhum item selecionado ainda</b>
            <p className="text-body-sm">Escolha imóveis do catálogo para o time oferecer.</p>
          </div>
        )}
        <div className="space-y-2.5">
          {picksResolvidos.map(({ pick, item }, i) => {
            const cor = item.color || "#0284C7";
            return (
              <div key={pick.id} className="grid grid-cols-[30px_minmax(0,1fr)] items-start gap-3.5 rounded-[20px] border border-slate-200/70 bg-white p-3.5 transition-shadow duration-200 hover:shadow-soft sm:grid-cols-[34px_52px_minmax(0,1fr)_auto]">
                <span className="mt-2 grid h-[30px] w-[30px] place-items-center rounded-full bg-light text-body-sm font-bold text-graytext sm:h-[34px] sm:w-[34px]">{i + 1}</span>
                <span className="mt-0.5 hidden h-[52px] w-[52px] rounded-[14px] sm:block" style={estiloCapa(item.color, item.raw?.photo_urls, capaAcademia(item.name))} />
                <div className="grid min-w-0 gap-2">
                  <div>
                    <b className="block text-[15px] tracking-tight text-charcoal">{item.name}</b>
                    {item.orgName && (
                      <small className="text-body-sm text-graytext">
                        {item.orgName} · {item.kind === "lancamento" ? "lançamento" : "pronto"}
                      </small>
                    )}
                  </div>
                  {notaEmEdicao === pick.id ? (
                    <input
                      autoFocus
                      defaultValue={pick.note || ""}
                      placeholder="Nota para o time (opcional)"
                      aria-label="Nota para o time"
                      onBlur={(e) => salvarNota(pick, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className="min-h-11 w-full rounded-control border border-slate-200 bg-white px-3 text-body-sm transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setNotaEmEdicao(pick.id)}
                      className={`min-h-10 w-full rounded-[10px] px-2.5 py-2 text-left text-body-sm ${
                        pick.note ? "bg-bg text-slate-700" : "border border-dashed border-slate-200 text-muted"
                      }`}
                    >
                      {pick.note || "Adicionar nota para o time"}
                    </button>
                  )}
                </div>
                <div className="col-span-full flex justify-end gap-0.5 sm:col-span-1 sm:col-start-4 sm:row-start-1">
                  <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" className={iconeBtn}>
                    ↑
                  </button>
                  <button onClick={() => mover(i, 1)} disabled={i === picksResolvidos.length - 1} aria-label="Descer" className={iconeBtn}>
                    ↓
                  </button>
                  <button onClick={() => remover(pick.id)} aria-label="Remover" className={`${iconeBtn} hover:!bg-danger-bg hover:!text-danger-text`}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={catalogoAberto} onClose={() => setCatalogoAberto(false)} title="Adicionar à seleção" className="sm:max-w-2xl">
        <CatalogBrowser
          gridClass="grid gap-3.5"
          renderAction={(item) => {
            const key = `${item.kind}-${item.id}`;
            if (pickedKeys.has(key)) {
              return <span className="text-caption font-semibold text-success-text">✓ já está na seleção</span>;
            }
            return (
              <Button size="sm" onClick={() => adicionar(item)}>
                + Adicionar à seleção do time
              </Button>
            );
          }}
        />
      </Modal>
    </div>
  );
}

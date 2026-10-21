import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { semAcento } from "../../lib/treino";
import { ETAPAS, ETAPA_LABELS } from "../academia/Argumentos";
import { Campo, btnEscuro, btnLinha, btnVerde, campoCls } from "./conteudoUi";

const SITUACOES = [
  ["publicada", "Publicados"],
  ["sugerida", "Sugeridos"],
  ["arquivada", "Arquivados"],
  ["todos", "Todos"],
];
const SITUACAO_ROTULO = { publicada: "Publicado", sugerida: "Sugerido (só quem sugeriu vê)", arquivada: "Arquivado" };
const TOM = {
  publicada: "border-emerald-300 bg-emerald-100 text-emerald-800",
  sugerida: "border-amber-300 bg-amber-100 text-amber-800",
  arquivada: "border-slate-200 bg-slate-100 text-slate-600",
};

export default function ArgumentosConteudo() {
  const { toast } = useFeedback();
  const [lista, setLista] = useState(null);
  const [projetos, setProjetos] = useState([]);
  const [situacao, setSituacao] = useState("publicada");
  const [etapa, setEtapa] = useState("todas");
  const [busca, setBusca] = useState("");
  const [ed, setEd] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [a, k] = await Promise.all([
      supabase.from("pc_argumentos").select("id, etapa, titulo, texto, empreendimento_id, status, usos").order("created_at"),
      supabase.from("pc_kits").select("empreendimento_id, nome").order("ordem"),
    ]);
    setLista(a.data ?? []);
    setProjetos(k.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  if (!lista) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const nomeProjeto = new Map(projetos.map((p) => [p.empreendimento_id, p.nome]));
  const contagem = { publicada: 0, sugerida: 0, arquivada: 0, todos: lista.length };
  lista.forEach((a) => contagem[a.status]++);
  const q = semAcento(busca.trim());
  const visiveis = lista.filter(
    (a) => (situacao === "todos" || a.status === situacao) && (etapa === "todas" || a.etapa === etapa) && (!q || semAcento(`${a.titulo} ${a.texto}`).includes(q)),
  );

  async function salvar() {
    if (!ed.titulo.trim() || !ed.texto.trim()) return toast("Informe título e texto.", "warning");
    setBusy(true);
    const dados = { etapa: ed.etapa, titulo: ed.titulo.trim(), texto: ed.texto.trim(), empreendimento_id: ed.empreendimento_id || null, status: ed.status };
    const { error } = ed.id ? await supabase.from("pc_argumentos").update(dados).eq("id", ed.id) : await supabase.from("pc_argumentos").insert(dados);
    setBusy(false);
    if (error) return toast(error.code === "23505" ? "Já existe um argumento com esse título." : error.message, "danger");
    toast("Argumento salvo.");
    setEd(null);
    load();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação">
          {SITUACOES.map(([k, r]) => (
            <button
              key={k}
              type="button"
              aria-pressed={situacao === k}
              onClick={() => setSituacao(k)}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${situacao === k ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-600"}`}
            >
              {r} ({contagem[k]})
            </button>
          ))}
        </div>
        <select value={etapa} onChange={(e) => setEtapa(e.target.value)} aria-label="Etapa" className="rounded-[9px] border-[1.5px] border-rule bg-white px-2.5 py-1.5 text-[13px]">
          <option value="todas">Todas as etapas</option>
          {ETAPAS.map(([k, r]) => (
            <option key={k} value={k}>
              {r}
            </option>
          ))}
        </select>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar" className="rounded-[9px] border-[1.5px] border-rule bg-white px-2.5 py-1.5 text-[13px]" />
        <button type="button" onClick={() => setEd({ etapa: "objecao", titulo: "", texto: "", empreendimento_id: "", status: "publicada" })} className={`${btnEscuro} py-1.5 text-[12.5px]`}>
          Novo argumento
        </button>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[12px] border border-rule bg-white">
        <table className="w-full min-w-[640px] text-[13px]">
          <thead>
            <tr className="border-b border-rule text-left text-[11px] font-bold uppercase tracking-wide text-graytext">
              <th className="px-2.5 py-2">Título</th>
              <th className="px-2.5 py-2">Etapa</th>
              <th className="px-2.5 py-2">Projeto</th>
              <th className="px-2.5 py-2 text-right">Usos</th>
              <th className="px-2.5 py-2">Situação</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-graytext">
                  Nenhum argumento com esse filtro.
                </td>
              </tr>
            )}
            {visiveis.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-b-0">
                <td className="max-w-[340px] px-2.5 py-2 font-semibold text-charcoal">{a.titulo}</td>
                <td className="px-2.5 py-2">
                  <span className="rounded-full border border-purple-300 bg-purple-100 px-2 py-px text-[11.5px] font-semibold text-purple-800">{ETAPA_LABELS[a.etapa]}</span>
                </td>
                <td className="px-2.5 py-2">{nomeProjeto.get(a.empreendimento_id) ?? <span className="text-graytext">Geral</span>}</td>
                <td className="px-2.5 py-2 text-right tabular-nums">{a.usos}</td>
                <td className="px-2.5 py-2">
                  <span className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${TOM[a.status]}`}>{SITUACAO_ROTULO[a.status].split(" (")[0]}</span>
                </td>
                <td className="px-2.5 py-2 text-right">
                  <button type="button" onClick={() => setEd({ ...a, empreendimento_id: a.empreendimento_id ?? "" })} className={btnLinha}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ed && (
        <>
          <div className="fixed inset-0 z-[55] bg-slate-900/35" onClick={() => setEd(null)} />
          <aside role="dialog" aria-label="Argumento" className="fixed bottom-0 right-0 top-0 z-[60] w-full max-w-[440px] overflow-y-auto border-l border-slate-300 bg-white p-5 shadow-xl">
            <button type="button" onClick={() => setEd(null)} className={`${btnLinha} float-right`}>
              Fechar
            </button>
            <h3 className="text-xl font-bold text-charcoal">{ed.id ? "Editar argumento" : "Novo argumento"}</h3>
            <Campo id="x-et" rotulo="Etapa">
              <select id="x-et" value={ed.etapa} onChange={(e) => setEd({ ...ed, etapa: e.target.value })} className={campoCls}>
                {ETAPAS.map(([k, r]) => (
                  <option key={k} value={k}>
                    {r}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="x-pj" rotulo="Projeto">
              <select id="x-pj" value={ed.empreendimento_id} onChange={(e) => setEd({ ...ed, empreendimento_id: e.target.value })} className={campoCls}>
                <option value="">Geral (qualquer projeto)</option>
                {projetos.map((p) => (
                  <option key={p.empreendimento_id} value={p.empreendimento_id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="x-ti" rotulo="Título">
              <input id="x-ti" value={ed.titulo} onChange={(e) => setEd({ ...ed, titulo: e.target.value })} className={campoCls} />
            </Campo>
            <Campo id="x-tx" rotulo="Texto" dica="Use [nome] onde o corretor deve trocar pelo nome do cliente.">
              <textarea id="x-tx" rows={8} value={ed.texto} onChange={(e) => setEd({ ...ed, texto: e.target.value })} className={campoCls} />
            </Campo>
            <Campo id="x-st" rotulo="Situação">
              <select id="x-st" value={ed.status} onChange={(e) => setEd({ ...ed, status: e.target.value })} className={campoCls}>
                {Object.entries(SITUACAO_ROTULO).map(([k, r]) => (
                  <option key={k} value={k}>
                    {r}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={salvar} disabled={busy} className={btnVerde}>
                {busy ? "Salvando…" : "Salvar"}
              </button>
              <button type="button" onClick={() => setEd(null)} className="rounded-[10px] border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
                Cancelar
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

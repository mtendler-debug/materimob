import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { Campo, Cartao, btnLinha, btnPerigo, btnVerde, campoCls } from "./conteudoUi";

const TIPOS = [
  ["leitura", "Leitura"],
  ["video", "Vídeo"],
  ["material", "Material"],
  ["roteiro", "Roteiro"],
];
const PUBLICOS = [
  ["todos", "Todos"],
  ["corretor", "Só corretores"],
  ["gestor", "Só gestores"],
];

let chave = 0;
const novaChave = () => `n${++chave}`;
const aulaVazia = () => ({ key: novaChave(), titulo: "", tipo: "leitura", duracao_min: "", video_url: "", material_url: "", conteudo: "" });
const perguntaVazia = () => ({ key: novaChave(), enunciado: "", opcoes: ["", "", "", ""], correta: 0, explicacao: "" });

function mover(lista, i, d) {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const c = [...lista];
  [c[i], c[j]] = [c[j], c[i]];
  return c;
}

// Editor de trilha: dados, aulas e quiz. A resposta certa e a explicação ficam
// em pc_quiz_gabarito, que o corretor nunca lê antes de responder.
export default function TrilhaEditor() {
  const { id } = useParams();
  const nova = id === "nova";
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();
  const [t, setT] = useState(null);
  const [aulas, setAulas] = useState([]);
  const [perguntas, setPerguntas] = useState([]);
  const [removidas, setRemovidas] = useState({ aulas: [], perguntas: [] });
  const [carregado, setCarregado] = useState(nova);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (nova) {
      setT({ titulo: "", descricao: "", nota_minima: 70, publico: "todos", publicada: true });
      setAulas([aulaVazia()]);
      return;
    }
    (async () => {
      const [tr, au, pe] = await Promise.all([
        supabase.from("pc_trilhas").select("id, titulo, descricao, nota_minima, publico, publicada").eq("id", id).maybeSingle(),
        supabase.from("pc_aulas").select("id, tipo, ordem, titulo, conteudo, video_url, duracao_min, material_url").eq("trilha_id", id).order("ordem"),
        supabase.from("pc_quiz_perguntas").select("id, enunciado, opcoes, ordem").eq("trilha_id", id).order("ordem"),
      ]);
      if (!tr.data) return setT(null);
      const ids = (pe.data ?? []).map((p) => p.id);
      const gab = ids.length ? (await supabase.from("pc_quiz_gabarito").select("pergunta_id, correta, explicacao").in("pergunta_id", ids)).data ?? [] : [];
      setT({ ...tr.data, descricao: tr.data.descricao ?? "" });
      setAulas((au.data ?? []).map((a) => ({ ...a, key: a.id, duracao_min: a.duracao_min ?? "", video_url: a.video_url ?? "", material_url: a.material_url ?? "", conteudo: a.conteudo ?? "" })));
      setPerguntas(
        (pe.data ?? []).map((p) => {
          const g = gab.find((x) => x.pergunta_id === p.id);
          return { key: p.id, id: p.id, enunciado: p.enunciado, opcoes: [...p.opcoes, "", "", "", ""].slice(0, Math.max(4, p.opcoes.length)), correta: g?.correta ?? 0, explicacao: g?.explicacao ?? "" };
        }),
      );
      setCarregado(true);
    })();
  }, [id, nova]);

  if (t === null) return <p className="mt-4 text-sm text-graytext">Trilha não encontrada.</p>;
  if (!t || !carregado) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const setAula = (i, campo, v) => setAulas((l) => l.map((a, j) => (j === i ? { ...a, [campo]: v } : a)));
  const setPerg = (i, campo, v) => setPerguntas((l) => l.map((p, j) => (j === i ? { ...p, [campo]: v } : p)));

  async function removerAula(i) {
    const a = aulas[i];
    if (a.id && !(await confirm("Remover esta aula? Isso também apaga o progresso de quem já a concluiu.", { confirmLabel: "Remover aula" }))) return;
    if (a.id) setRemovidas((r) => ({ ...r, aulas: [...r.aulas, a.id] }));
    setAulas((l) => l.filter((_, j) => j !== i));
  }

  async function removerPergunta(i) {
    const p = perguntas[i];
    if (p.id && !(await confirm("Remover esta pergunta do quiz?", { confirmLabel: "Remover pergunta" }))) return;
    if (p.id) setRemovidas((r) => ({ ...r, perguntas: [...r.perguntas, p.id] }));
    setPerguntas((l) => l.filter((_, j) => j !== i));
  }

  function validar() {
    if (!t.titulo.trim()) return "Informe o título da trilha.";
    const nota = Number(t.nota_minima);
    if (!(nota >= 1 && nota <= 100)) return "A nota mínima vai de 1 a 100.";
    for (const [i, a] of aulas.entries()) if (!a.titulo.trim()) return `Informe o título da aula ${i + 1}.`;
    for (const [i, p] of perguntas.entries()) {
      if (!p.enunciado.trim()) return `Informe o enunciado da pergunta ${i + 1}.`;
      const preenchidas = p.opcoes.filter((o) => o.trim());
      if (preenchidas.length < 2) return `A pergunta ${i + 1} precisa de pelo menos 2 opções.`;
      if (!p.opcoes[p.correta]?.trim()) return `Marque uma opção preenchida como a certa na pergunta ${i + 1}.`;
    }
    return "";
  }

  async function salvar() {
    const erro = validar();
    if (erro) return toast(erro, "warning");
    setBusy(true);
    try {
      let trilhaId = id;
      const dados = { titulo: t.titulo.trim(), descricao: t.descricao.trim() || null, nota_minima: Number(t.nota_minima), publico: t.publico, publicada: t.publicada };
      if (nova) {
        const { data: ult } = await supabase.from("pc_trilhas").select("ordem").order("ordem", { ascending: false }).limit(1);
        const { data, error } = await supabase.from("pc_trilhas").insert({ ...dados, ordem: (ult?.[0]?.ordem ?? 0) + 1 }).select("id").single();
        if (error) throw error;
        trilhaId = data.id;
      } else {
        const { error } = await supabase.from("pc_trilhas").update(dados).eq("id", id);
        if (error) throw error;
      }

      if (removidas.aulas.length) {
        const { error } = await supabase.from("pc_aulas").delete().in("id", removidas.aulas);
        if (error) throw error;
      }
      if (removidas.perguntas.length) {
        const { error } = await supabase.from("pc_quiz_perguntas").delete().in("id", removidas.perguntas);
        if (error) throw error;
      }

      for (const [i, a] of aulas.entries()) {
        const linha = {
          trilha_id: trilhaId,
          ordem: i + 1,
          titulo: a.titulo.trim(),
          tipo: a.tipo,
          conteudo: a.conteudo.trim() || null,
          video_url: a.video_url.trim() || null,
          material_url: a.material_url.trim() || null,
          duracao_min: a.duracao_min === "" ? null : Number(a.duracao_min),
        };
        const { error } = a.id ? await supabase.from("pc_aulas").update(linha).eq("id", a.id) : await supabase.from("pc_aulas").insert(linha);
        if (error) throw error;
      }

      for (const [i, p] of perguntas.entries()) {
        const mapa = [];
        const opcoes = p.opcoes.filter((o, j) => {
          if (o.trim()) mapa.push(j);
          return o.trim();
        }).map((o) => o.trim());
        const correta = mapa.indexOf(p.correta);
        const linha = { trilha_id: trilhaId, ordem: i + 1, enunciado: p.enunciado.trim(), opcoes };
        let perguntaId = p.id;
        if (perguntaId) {
          const { error } = await supabase.from("pc_quiz_perguntas").update(linha).eq("id", perguntaId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from("pc_quiz_perguntas").insert(linha).select("id").single();
          if (error) throw error;
          perguntaId = data.id;
        }
        const { error } = await supabase.from("pc_quiz_gabarito").upsert({ pergunta_id: perguntaId, correta, explicacao: p.explicacao.trim() || null }, { onConflict: "pergunta_id" });
        if (error) throw error;
      }

      toast("Trilha salva. Os corretores já veem a versão nova.");
      navigate("/admin/academia/conteudo/trilhas");
    } catch (e) {
      toast(e.message || "Não consegui salvar a trilha.", "danger");
      setBusy(false);
    }
  }

  const setaCls = `${btnLinha} px-2`;

  return (
    <div className="mt-3 max-w-3xl">
      <Link to="/admin/academia/conteudo/trilhas" className="inline-flex min-h-9 items-center text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
        ← Trilhas
      </Link>
      <h2 className="mt-1 text-lg font-bold text-charcoal">{nova ? "Nova trilha" : t.titulo}</h2>

      <Cartao>
        <Campo id="t-tit" rotulo="Título">
          <input id="t-tit" value={t.titulo} onChange={(e) => setT({ ...t, titulo: e.target.value })} className={campoCls} />
        </Campo>
        <Campo id="t-des" rotulo="Descrição">
          <textarea id="t-des" rows={2} value={t.descricao} onChange={(e) => setT({ ...t, descricao: e.target.value })} className={campoCls} />
        </Campo>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Campo id="t-nota" rotulo="Nota mínima do quiz (%)">
            <input id="t-nota" type="number" min={1} max={100} value={t.nota_minima} onChange={(e) => setT({ ...t, nota_minima: e.target.value })} className={campoCls} />
          </Campo>
          <Campo id="t-pub" rotulo="Para quem">
            <select id="t-pub" value={t.publico} onChange={(e) => setT({ ...t, publico: e.target.value })} className={campoCls}>
              {PUBLICOS.map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </Cartao>

      <h3 className="mb-0 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Aulas</h3>
      {aulas.map((a, i) => (
        <Cartao key={a.key}>
          <div className="flex items-center justify-between gap-2">
            <b className="text-sm text-charcoal">Aula {i + 1}</b>
            <span className="flex gap-1.5">
              <button type="button" aria-label="Mover para cima" onClick={() => setAulas((l) => mover(l, i, -1))} className={setaCls}>
                ↑
              </button>
              <button type="button" aria-label="Mover para baixo" onClick={() => setAulas((l) => mover(l, i, 1))} className={setaCls}>
                ↓
              </button>
              <button type="button" onClick={() => removerAula(i)} className={btnPerigo}>
                Remover
              </button>
            </span>
          </div>
          <div className="grid gap-x-3 sm:grid-cols-2">
            <Campo id={`a${i}t`} rotulo="Título">
              <input id={`a${i}t`} value={a.titulo} onChange={(e) => setAula(i, "titulo", e.target.value)} className={campoCls} />
            </Campo>
            <Campo id={`a${i}k`} rotulo="Tipo">
              <select id={`a${i}k`} value={a.tipo} onChange={(e) => setAula(i, "tipo", e.target.value)} className={campoCls}>
                {TIPOS.map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id={`a${i}m`} rotulo="Duração (min)">
              <input id={`a${i}m`} type="number" min={1} value={a.duracao_min} onChange={(e) => setAula(i, "duracao_min", e.target.value)} className={campoCls} />
            </Campo>
            <Campo id={`a${i}v`} rotulo="Link do vídeo (opcional)">
              <input id={`a${i}v`} value={a.video_url} onChange={(e) => setAula(i, "video_url", e.target.value)} className={campoCls} />
            </Campo>
          </div>
          <Campo id={`a${i}u`} rotulo="Link de material (opcional)">
            <input id={`a${i}u`} value={a.material_url} onChange={(e) => setAula(i, "material_url", e.target.value)} className={campoCls} />
          </Campo>
          <Campo id={`a${i}c`} rotulo="Conteúdo">
            <textarea id={`a${i}c`} rows={6} value={a.conteudo} onChange={(e) => setAula(i, "conteudo", e.target.value)} className={campoCls} />
          </Campo>
        </Cartao>
      ))}
      <button type="button" onClick={() => setAulas((l) => [...l, aulaVazia()])} className={`${btnLinha} mt-3`}>
        Adicionar aula
      </button>

      <h3 className="mb-0 mt-6 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Quiz</h3>
      <p className="mt-1 text-[11.5px] text-muted">Marque a resposta certa. O corretor nunca recebe o gabarito antes de responder.</p>
      {perguntas.map((p, i) => (
        <Cartao key={p.key}>
          <div className="flex items-center justify-between gap-2">
            <b className="text-sm text-charcoal">Pergunta {i + 1}</b>
            <span className="flex gap-1.5">
              <button type="button" aria-label="Mover para cima" onClick={() => setPerguntas((l) => mover(l, i, -1))} className={setaCls}>
                ↑
              </button>
              <button type="button" aria-label="Mover para baixo" onClick={() => setPerguntas((l) => mover(l, i, 1))} className={setaCls}>
                ↓
              </button>
              <button type="button" onClick={() => removerPergunta(i)} className={btnPerigo}>
                Remover
              </button>
            </span>
          </div>
          <Campo id={`q${i}e`} rotulo="Enunciado">
            <textarea id={`q${i}e`} rows={2} value={p.enunciado} onChange={(e) => setPerg(i, "enunciado", e.target.value)} className={campoCls} />
          </Campo>
          <div className="mt-2.5 text-xs font-medium text-graytext">Opções (marque a certa)</div>
          {p.opcoes.map((o, j) => (
            <div key={j} className="mt-1.5 flex items-center gap-2">
              <input type="radio" name={`certa-${p.key}`} checked={p.correta === j} onChange={() => setPerg(i, "correta", j)} aria-label={`Opção ${j + 1} é a certa`} />
              <input
                value={o}
                onChange={(e) => setPerg(i, "opcoes", p.opcoes.map((x, k) => (k === j ? e.target.value : x)))}
                aria-label={`Texto da opção ${j + 1}`}
                className="w-full rounded-control border border-slate-200/70 bg-white px-[10px] py-[7px] text-sm text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
              />
            </div>
          ))}
          <Campo id={`q${i}x`} rotulo="Explicação (aparece depois de corrigir)">
            <textarea id={`q${i}x`} rows={2} value={p.explicacao} onChange={(e) => setPerg(i, "explicacao", e.target.value)} className={campoCls} />
          </Campo>
        </Cartao>
      ))}
      <button type="button" onClick={() => setPerguntas((l) => [...l, perguntaVazia()])} className={`${btnLinha} mt-3`}>
        Adicionar pergunta
      </button>

      <div className="mt-5 flex gap-2">
        <button type="button" onClick={salvar} disabled={busy} className={btnVerde}>
          {busy ? "Salvando…" : "Salvar trilha"}
        </button>
        <button type="button" onClick={() => navigate("/admin/academia/conteudo/trilhas")} className="rounded-control border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">
          Cancelar
        </button>
      </div>
    </div>
  );
}

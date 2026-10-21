import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { useFeedback } from "../../lib/feedback";
import { rotuloTrilha, situacaoTrilha, tituloCurto } from "../../lib/treino";

const TIPO_LABELS = { leitura: "Leitura", video: "Vídeo", material: "Material", roteiro: "Roteiro" };

const btnEscuro = "w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white disabled:opacity-45";
const btnLinha = "w-full rounded-[10px] border border-slate-300 bg-white px-4 py-[11px] text-sm font-bold text-slate-700";

// Uma trilha: lista de aulas, leitura de cada aula, quiz, correção e certificado.
// A correção do quiz e a emissão do certificado acontecem no servidor
// (pc_responder_quiz, pc_concluir_aula): o gabarito nunca chega a esta tela
// antes de o corretor enviar as respostas.
export default function TrilhaDetalhe() {
  const { id } = useParams();
  const { acesso } = useAcessoCanal();
  const { toast } = useFeedback();
  const [dados, setDados] = useState(undefined);
  const [tela, setTela] = useState({ v: "trilha" });
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [busy, setBusy] = useState(false);

  const carregar = useCallback(async () => {
    const [t, au, pr, ac, pe, ce] = await Promise.all([
      supabase.from("pc_trilhas").select("id, titulo, descricao, nivel, nota_minima, empreendimento_id").eq("id", id).maybeSingle(),
      supabase.from("pc_aulas").select("id, tipo, ordem, titulo, conteudo, video_url, duracao_min, material_url").eq("trilha_id", id).order("ordem"),
      supabase.from("pc_progresso_aulas").select("aula_id"),
      supabase.rpc("pc_minha_academia"),
      supabase.from("pc_quiz_perguntas").select("id, enunciado, opcoes, ordem").eq("trilha_id", id).order("ordem"),
      supabase.from("pc_certificacoes").select("id, emitido_em").eq("trilha_id", id).maybeSingle(),
    ]);
    if (!t.data) return setDados(null);
    setDados({
      trilha: t.data,
      aulas: au.data ?? [],
      feitas: new Set((pr.data ?? []).map((p) => p.aula_id)),
      andamento: (ac.data ?? []).find((a) => a.trilha_id === id) ?? null,
      perguntas: pe.data ?? [],
      certificado: ce.data ?? null,
    });
  }, [id]);

  useEffect(() => {
    setDados(undefined);
    setTela({ v: "trilha" });
    carregar();
  }, [carregar]);

  if (acesso === undefined || dados === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;
  if (dados === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-graytext">Esta trilha não está disponível.</p>
        <Link to="/app/academia/treinamento" className="mt-3 inline-block text-sm text-sky-700 underline">
          Ver todas as trilhas
        </Link>
      </div>
    );
  }

  const { trilha, aulas, feitas, andamento, perguntas, certificado } = dados;
  const titulo = tituloCurto(trilha.titulo);
  const todasFeitas = aulas.length > 0 && aulas.every((a) => feitas.has(a.id));
  const situacao = situacaoTrilha(andamento);

  async function concluir(aula) {
    setBusy(true);
    const { error } = await supabase.rpc("pc_concluir_aula", { p_aula: aula.id });
    setBusy(false);
    if (error) return toast(error.message || "Não consegui salvar agora.", "danger");
    await carregar();
    toast("Aula concluída. Registrado na sua atividade.");
  }

  async function corrigir() {
    setBusy(true);
    const { data, error } = await supabase.rpc("pc_responder_quiz", { p_trilha: trilha.id, p_respostas: respostas });
    setBusy(false);
    if (error) return toast(error.message || "Não consegui corrigir agora.", "danger");
    setResultado({ ...data, escolhas: { ...respostas } });
    setTela({ v: "resultado" });
    await carregar();
    if (data.certificado && !certificado) toast("Certificado emitido.");
  }

  const voltar = (
    <button onClick={() => setTela({ v: "trilha" })} className="mb-2 text-sm text-graytext underline">
      ← {titulo}
    </button>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      {tela.v === "trilha" && (
        <>
          <Link to="/app/academia/treinamento" className="text-sm text-graytext underline">
            ← Treinamento
          </Link>
          <div className="mt-3 rounded-[12px] border border-rule bg-white px-3.5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">{rotuloTrilha(trilha)}</div>
            <h1 className="mt-0.5 text-base font-bold leading-tight text-charcoal">{titulo}</h1>
            {trilha.descricao && <p className="mt-1 text-[12.5px] text-graytext">{trilha.descricao}</p>}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule">
              <div className="h-full bg-sky-700" style={{ width: `${aulas.length ? (100 * feitas.size) / aulas.length : 0}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-graytext">
              <span>
                {feitas.size} de {aulas.length} aulas
              </span>
              <span className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${situacao.tom}`}>{situacao.rotulo}</span>
            </div>
          </div>

          <h2 className="mb-1 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Aulas</h2>
          {aulas.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setTela({ v: "aula", i })}
              className="mt-2 flex w-full items-center gap-2.5 rounded-[12px] border border-rule bg-white px-3 py-2.5 text-left"
            >
              <span
                className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-2 text-xs font-bold text-white ${
                  feitas.has(a.id) ? "border-emerald-800 bg-emerald-800" : "border-slate-300"
                }`}
              >
                {feitas.has(a.id) ? "✓" : ""}
              </span>
              <span>
                <b className="block text-[13.5px] leading-tight text-charcoal">{a.titulo}</b>
                <span className="text-xs text-graytext">
                  {TIPO_LABELS[a.tipo] ?? a.tipo}
                  {a.duracao_min ? ` · ${a.duracao_min} min` : ""}
                </span>
              </span>
            </button>
          ))}

          {perguntas.length > 0 && (
            <>
              <h2 className="mb-1 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Quiz</h2>
              <button
                onClick={() => {
                  if (!todasFeitas) return toast("Conclua todas as aulas para abrir o quiz.", "warning");
                  setRespostas({});
                  setTela({ v: "quiz" });
                }}
                aria-disabled={!todasFeitas}
                className={`flex w-full items-center gap-2.5 rounded-[12px] border border-rule bg-white px-3 py-2.5 text-left ${todasFeitas ? "" : "opacity-55"}`}
              >
                <span
                  className={`grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-2 text-xs font-bold text-white ${
                    andamento?.aprovado ? "border-emerald-800 bg-emerald-800" : "border-slate-300"
                  }`}
                >
                  {andamento?.aprovado ? "✓" : ""}
                </span>
                <span>
                  <b className="block text-[13.5px] text-charcoal">Quiz da trilha</b>
                  <span className="text-xs text-graytext">
                    {perguntas.length} perguntas · nota mínima {trilha.nota_minima}%
                    {andamento?.melhor_nota != null ? ` · melhor nota ${andamento.melhor_nota}%` : ""}
                    {todasFeitas ? "" : " · conclua todas as aulas"}
                  </span>
                </span>
              </button>
            </>
          )}

          {certificado && (
            <button onClick={() => setTela({ v: "cert" })} className="mt-4 w-full rounded-[10px] bg-emerald-800 px-4 py-[11px] text-sm font-bold text-white">
              Ver meu certificado
            </button>
          )}
        </>
      )}

      {tela.v === "aula" && (() => {
        const a = aulas[tela.i];
        const feita = feitas.has(a.id);
        return (
          <>
            {voltar}
            <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
              Aula {tela.i + 1} de {aulas.length} · {TIPO_LABELS[a.tipo] ?? a.tipo}
              {a.duracao_min ? ` · ${a.duracao_min} min` : ""}
            </div>
            <h1 className="mb-3 mt-1 text-xl font-bold leading-tight text-charcoal">{a.titulo}</h1>
            {a.video_url && (
              <a
                href={a.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block rounded-[12px] bg-slate-900 px-4 py-6 text-center text-sm font-semibold text-white"
              >
                Assistir ao vídeo da aula
              </a>
            )}
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-700">{a.conteudo}</div>
            {a.material_url && (
              <a href={a.material_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-sky-800 underline">
                Abrir o material
              </a>
            )}
            <div className="mt-5 grid gap-2">
              {feita ? (
                <div className="rounded-[10px] border border-emerald-300 bg-emerald-50 py-2 text-center text-sm font-semibold text-emerald-800">
                  Aula concluída
                </div>
              ) : (
                <button onClick={() => concluir(a)} disabled={busy} className={btnEscuro}>
                  {busy ? "Salvando…" : "Marcar como concluída"}
                </button>
              )}
              {tela.i < aulas.length - 1 ? (
                <button onClick={() => setTela({ v: "aula", i: tela.i + 1 })} className={btnLinha}>
                  Próxima aula
                </button>
              ) : (
                <button onClick={() => setTela({ v: "trilha" })} className={btnLinha}>
                  Voltar à trilha
                </button>
              )}
            </div>
          </>
        );
      })()}

      {tela.v === "quiz" && (
        <>
          {voltar}
          <h1 className="text-xl font-bold text-charcoal">Quiz da trilha</h1>
          <p className="mt-1 text-sm text-graytext">Responda todas as perguntas. A correção vem depois de enviar.</p>
          {perguntas.map((q, qi) => (
            <div key={q.id} className="mt-3 rounded-[12px] border border-rule bg-white px-3.5 py-3">
              <p className="mb-1 text-[13.5px] font-semibold text-charcoal">
                {qi + 1}. {q.enunciado}
              </p>
              {q.opcoes.map((o, oi) => (
                <button
                  key={oi}
                  type="button"
                  aria-pressed={respostas[q.id] === oi}
                  onClick={() => setRespostas((r) => ({ ...r, [q.id]: oi }))}
                  className={`mt-1.5 block w-full rounded-[10px] border-[1.5px] px-2.5 py-2 text-left text-[13px] text-slate-700 ${
                    respostas[q.id] === oi ? "border-charcoal ring-1 ring-charcoal" : "border-rule"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          ))}
          <button
            onClick={corrigir}
            disabled={busy || perguntas.some((q) => respostas[q.id] === undefined)}
            className={`${btnEscuro} mt-4`}
          >
            {busy ? "Corrigindo…" : "Enviar respostas"}
          </button>
        </>
      )}

      {tela.v === "resultado" && resultado && (() => {
        const pct = Math.round((100 * resultado.acertos) / resultado.total);
        const porId = new Map((resultado.correcao ?? []).map((c) => [c.id, c]));
        return (
          <>
            {voltar}
            <div className="py-3 text-center">
              <div className="text-[38px] font-bold leading-none text-charcoal tabular-nums">{pct}%</div>
              <div className="mb-1 mt-1.5 text-[13px] text-slate-600">
                {resultado.acertos} de {resultado.total} perguntas certas
              </div>
              <span
                className={`rounded-full border px-2.5 py-px text-[11.5px] font-semibold ${
                  resultado.aprovado ? "border-emerald-300 bg-emerald-100 text-emerald-800" : "border-rose-300 bg-rose-100 text-rose-800"
                }`}
              >
                {resultado.aprovado ? "Aprovado" : `Abaixo de ${trilha.nota_minima}%`}
              </span>
            </div>
            {perguntas.map((q, qi) => {
              const c = porId.get(q.id);
              return (
                <div key={q.id} className="mt-3 rounded-[12px] border border-rule bg-white px-3.5 py-3">
                  <p className="mb-1 text-[13.5px] font-semibold text-charcoal">
                    {qi + 1}. {q.enunciado}
                  </p>
                  {q.opcoes.map((o, oi) => {
                    const certa = c && oi === c.correta;
                    const errada = c && oi === c.escolha && !certa;
                    return (
                      <div
                        key={oi}
                        className={`mt-1.5 rounded-[10px] border-[1.5px] px-2.5 py-2 text-[13px] text-slate-700 ${
                          certa ? "border-emerald-800 bg-emerald-50" : errada ? "border-rose-700 bg-rose-50" : "border-rule"
                        }`}
                      >
                        {o}
                        {certa ? " ✓" : errada ? " ✗" : ""}
                      </div>
                    );
                  })}
                  {c?.explicacao && <p className="mt-2 border-t border-rule pt-2 text-[12.5px] text-slate-600">{c.explicacao}</p>}
                </div>
              );
            })}
            <div className="mt-4 grid gap-2">
              {resultado.certificado ? (
                <button onClick={() => setTela({ v: "cert" })} className="w-full rounded-[10px] bg-emerald-800 px-4 py-[11px] text-sm font-bold text-white">
                  Ver meu certificado
                </button>
              ) : (
                !resultado.aprovado && (
                  <button
                    onClick={() => {
                      setRespostas({});
                      setTela({ v: "quiz" });
                    }}
                    className={btnEscuro}
                  >
                    Tentar de novo
                  </button>
                )
              )}
              <button onClick={() => setTela({ v: "trilha" })} className={btnLinha}>
                Voltar à trilha
              </button>
            </div>
          </>
        );
      })()}

      {tela.v === "cert" && certificado && (
        <>
          {voltar}
          <h1 className="text-xl font-bold text-charcoal">Certificado</h1>
          <div className="mt-3 rounded-[14px] border-2 border-charcoal bg-white p-1.5">
            <div className="rounded-[10px] border border-slate-300 px-4 py-6 text-center">
              <div className="text-[10.5px] font-bold uppercase tracking-[.2em] text-sky-700">Materimob · Academia de Vendas</div>
              <h2 className="mb-3.5 mt-2 text-xl font-bold text-charcoal">Certificado de conclusão</h2>
              <p className="my-1.5 text-[13px] text-slate-600">Certificamos que</p>
              <div className="text-[22px] font-bold text-charcoal">{acesso.nome}</div>
              <p className="my-1.5 text-[13px] text-slate-600">concluiu a trilha</p>
              <p className="my-1.5 text-[13px] font-bold text-charcoal">{trilha.titulo}</p>
              {andamento?.melhor_nota != null && (
                <p className="my-1.5 text-[13px] text-slate-600">com aproveitamento de {andamento.melhor_nota}% no quiz.</p>
              )}
              <p className="my-1.5 text-[13px] text-slate-600">
                {new Date(certificado.emitido_em).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <div className="mt-3.5 text-[11.5px] text-muted tabular-nums">Código ACAD-{certificado.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-graytext">O certificado fica guardado aqui. Você pode abrir de novo quando quiser.</p>
        </>
      )}
    </div>
  );
}

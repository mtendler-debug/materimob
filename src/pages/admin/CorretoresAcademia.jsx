import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { haQuanto, linkWhatsapp } from "../../lib/academiaUtil";
import { descreverAtividade, estaParado, PAPEL_LABELS, ultimoAcessoTexto } from "../../lib/atividades";
import { semAcento } from "../../lib/treino";

const FILTROS = [
  ["ativos", "Ativos"],
  ["parados", "Parados há 7 dias"],
  ["bloqueados", "Bloqueados"],
  ["todos", "Todos"],
];

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[8px] text-sm text-charcoal focus:border-gold focus:outline-none";

// Corretores liberados e bloqueados, com o que cada um fez. Pedidos pendentes e
// recusados ficam na aba Acessos.
export default function CorretoresAcademia() {
  const [lista, setLista] = useState(null);
  const [ativas, setAtivas] = useState([]);
  const [filtro, setFiltro] = useState("ativos");
  const [imob, setImob] = useState("todas");
  const [busca, setBusca] = useState("");
  const [porImob, setPorImob] = useState(false);
  const [ficha, setFicha] = useState(null);

  async function load() {
    const [r, a] = await Promise.all([
      supabase.rpc("pc_resumo_corretores", { p_parceira: null }),
      supabase.from("pc_parceiras").select("id, nome_fantasia").eq("ativa_na_academia", true).order("nome_fantasia"),
    ]);
    setLista((r.data ?? []).filter((c) => c.status === "liberado" || c.status === "bloqueado"));
    setAtivas(a.data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  if (!lista) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const situacao = (c) => (c.status === "bloqueado" ? "bloqueados" : estaParado(c.ultimo_acesso) ? "parados" : "ativos");
  const contagem = { ativos: 0, parados: 0, bloqueados: 0, todos: lista.length };
  lista.forEach((c) => contagem[situacao(c)]++);

  const q = semAcento(busca.trim());
  const visiveis = lista.filter((c) => {
    if (imob !== "todas" && (c.parceira ?? "Autônomo") !== imob) return false;
    if (q && !semAcento(c.nome).includes(q)) return false;
    return filtro === "todos" || situacao(c) === filtro;
  });
  const imobiliarias = [...new Set(lista.map((c) => c.parceira ?? "Autônomo"))].sort();

  const grupos = {};
  visiveis.forEach((c) => {
    const g = (grupos[c.parceira ?? "Autônomo"] ??= { n: 0, envios: 0, clientes_abriram: 0, certificados: 0, registros: 0, vendas: 0 });
    g.n++;
    ["envios", "clientes_abriram", "certificados", "registros", "vendas"].forEach((k) => (g[k] += Number(c[k])));
  });

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação">
          {FILTROS.map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filtro === k}
              onClick={() => setFiltro(k)}
              className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${
                filtro === k ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-600"
              }`}
            >
              {rotulo} ({contagem[k]})
            </button>
          ))}
        </div>
        <select value={imob} onChange={(e) => setImob(e.target.value)} aria-label="Imobiliária" className="rounded-[9px] border-[1.5px] border-rule bg-white px-2.5 py-1.5 text-[13px]">
          <option value="todas">Todas as imobiliárias</option>
          {imobiliarias.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome"
          className="rounded-[9px] border-[1.5px] border-rule bg-white px-2.5 py-1.5 text-[13px]"
        />
        <label className="flex items-center gap-1.5 text-[13px] text-slate-700">
          <input type="checkbox" checked={porImob} onChange={(e) => setPorImob(e.target.checked)} /> Por imobiliária
        </label>
      </div>

      <div className="mt-3 overflow-x-auto rounded-[12px] border border-rule bg-white">
        {porImob ? (
          <table className="w-full min-w-[560px] text-[13px] tabular-nums">
            <thead>
              <Cabecalho cols={["Imobiliária", "Corretores", "Kits enviados", "Abriram", "Certificados", "Registros", "Vendas"]} numericas={[1, 2, 3, 4, 5, 6]} />
            </thead>
            <tbody>
              {Object.keys(grupos).length === 0 && <Vazio colunas={7} />}
              {Object.entries(grupos).map(([nome, g]) => (
                <tr key={nome} className="border-b border-slate-100 last:border-b-0">
                  <td className="px-2.5 py-2 font-semibold text-charcoal">{nome}</td>
                  {[g.n, g.envios, g.clientes_abriram, g.certificados, g.registros, g.vendas].map((v, i) => (
                    <td key={i} className="px-2.5 py-2 text-right">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[760px] text-[13px] tabular-nums">
            <thead>
              <Cabecalho
                cols={["Corretor", "Papel", "Último acesso", "Materiais", "Envios", "Abriram", "Aulas", "Cert.", "Registros", "Vendas"]}
                numericas={[3, 4, 5, 6, 7, 8, 9]}
              />
            </thead>
            <tbody>
              {visiveis.length === 0 && <Vazio colunas={10} />}
              {visiveis.map((c) => {
                const parado = c.status === "liberado" && estaParado(c.ultimo_acesso);
                return (
                  <tr key={c.user_id} onClick={() => setFicha(c)} className="cursor-pointer border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                    <td className="px-2.5 py-2">
                      <div className="font-semibold text-charcoal">
                        {c.nome}
                        {c.status === "bloqueado" && (
                          <span className="ml-1.5 rounded-full border border-rose-300 bg-rose-100 px-2 py-px text-[11px] font-semibold text-rose-800">Bloqueado</span>
                        )}
                      </div>
                      <div className="text-xs text-graytext">{c.parceira ?? "Autônomo"}</div>
                    </td>
                    <td className="px-2.5 py-2">
                      <span
                        className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${
                          c.papel === "gestor" ? "border-purple-300 bg-purple-100 text-purple-800" : "border-rule bg-slate-100 text-slate-600"
                        }`}
                      >
                        {PAPEL_LABELS[c.papel]}
                      </span>
                    </td>
                    <td className={`px-2.5 py-2 ${parado ? "font-semibold text-amber-700" : ""}`}>{ultimoAcessoTexto(c.ultimo_acesso)}</td>
                    {[c.materiais, c.envios, c.clientes_abriram, c.aulas, c.certificados, c.registros, c.vendas].map((v, i) => (
                      <td key={i} className="px-2.5 py-2 text-right">
                        {v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {ficha && <Ficha c={ficha} ativas={ativas} onFechar={() => setFicha(null)} onMudou={async () => { await load(); setFicha(null); }} />}
    </div>
  );
}

function Cabecalho({ cols, numericas }) {
  return (
    <tr className="border-b border-rule">
      {cols.map((c, i) => (
        <th key={c} className={`whitespace-nowrap px-2.5 py-2 text-[11px] font-bold uppercase tracking-wide text-graytext ${numericas.includes(i) ? "text-right" : "text-left"}`}>
          {c}
        </th>
      ))}
    </tr>
  );
}

function Vazio({ colunas }) {
  return (
    <tr>
      <td colSpan={colunas} className="px-3 py-6 text-center text-sm text-graytext">
        Nada nesta lista.
      </td>
    </tr>
  );
}

function Ficha({ c, ativas, onFechar, onMudou }) {
  const { toast, confirm } = useFeedback();
  const [papel, setPapel] = useState(c.papel);
  const [parceira, setParceira] = useState(c.parceira_id ?? "");
  const [eventos, setEventos] = useState(null);
  const [busy, setBusy] = useState(false);
  const zap = linkWhatsapp(c.whatsapp);

  useEffect(() => {
    supabase.rpc("pc_linha_do_tempo", { p_usuario: c.user_id, p_limite: 30 }).then(({ data }) => setEventos(data ?? []));
  }, [c.user_id]);

  const opcoes = ativas.some((a) => a.id === c.parceira_id) || !c.parceira_id ? ativas : [...ativas, { id: c.parceira_id, nome_fantasia: c.parceira }];

  async function salvar() {
    if (papel === "gestor" && !parceira) return toast("Gestor precisa de uma imobiliária.", "warning");
    setBusy(true);
    const { error } = await supabase.rpc("pc_editar_acesso", { p_user: c.user_id, p_papel: papel, p_parceira_id: parceira || null });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast("Alterações salvas.");
    onMudou();
  }

  async function bloquear() {
    const bloquear = c.status === "liberado";
    if (bloquear && !(await confirm(`Bloquear o acesso de ${c.nome}? Ele perde tudo na hora, mas o histórico fica.`, { tone: "warning", confirmLabel: "Bloquear" }))) return;
    setBusy(true);
    const { error } = await supabase.rpc("pc_decidir_acesso", { p_user: c.user_id, p_status: bloquear ? "bloqueado" : "liberado" });
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast(bloquear ? `Acesso de ${c.nome} bloqueado.` : `${c.nome} liberado de novo.`);
    onMudou();
  }

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-slate-900/35" onClick={onFechar} />
      <aside role="dialog" aria-label={`Ficha de ${c.nome}`} className="fixed bottom-0 right-0 top-0 z-[60] w-full max-w-[440px] overflow-y-auto border-l border-slate-300 bg-white p-5 shadow-xl">
        <button onClick={onFechar} className="float-right rounded-[8px] border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700">
          Fechar
        </button>
        <h3 className="text-xl font-bold text-charcoal">{c.nome}</h3>
        <div className="mb-3 mt-1.5 flex gap-1.5">
          <span
            className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${
              c.status === "bloqueado" ? "border-rose-300 bg-rose-100 text-rose-800" : "border-emerald-300 bg-emerald-100 text-emerald-800"
            }`}
          >
            {c.status === "bloqueado" ? "Bloqueado" : "Liberado"}
          </span>
          <span className="rounded-full border border-rule bg-slate-100 px-2 py-px text-[11.5px] font-semibold text-slate-600">{PAPEL_LABELS[c.papel]}</span>
        </div>

        <dl className="divide-y divide-rule rounded-[12px] border border-rule px-3.5 text-[13px]">
          {[
            ["Imobiliária", c.parceira ?? "Autônomo"],
            ["WhatsApp", zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="text-sky-700 underline">{c.whatsapp}</a> : "não informado"],
            ["E-mail", c.email ?? "não informado"],
            ["CRECI", c.creci ?? "não informado"],
            ["Último acesso", ultimoAcessoTexto(c.ultimo_acesso)],
            ["Kits enviados / abriram", `${c.envios} / ${c.clientes_abriram}`],
            ["Treinamento", `${c.aulas} aulas · ${c.certificados} certificados`],
            ["Registros / vendas", `${c.registros} / ${c.vendas}`],
          ].map(([r, v]) => (
            <div key={r} className="flex justify-between gap-3 py-2">
              <dt className="flex-none text-graytext">{r}</dt>
              <dd className="text-right font-semibold text-charcoal">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <label className="text-xs font-medium text-graytext">
            Papel
            <select value={papel} onChange={(e) => setPapel(e.target.value)} className={campo}>
              <option value="corretor">Corretor</option>
              <option value="gestor">Gestor</option>
            </select>
          </label>
          <label className="text-xs font-medium text-graytext">
            Imobiliária
            <select value={parceira} onChange={(e) => setParceira(e.target.value)} className={campo}>
              {!c.parceira_id && <option value="">Autônomo</option>}
              {opcoes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_fantasia}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={salvar} disabled={busy} className="rounded-[8px] bg-emerald-800 px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50">
            Salvar papel e imobiliária
          </button>
          <button
            onClick={bloquear}
            disabled={busy}
            className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-50 ${
              c.status === "liberado" ? "border border-rose-300 bg-white text-rose-800" : "bg-charcoal text-white"
            }`}
          >
            {c.status === "liberado" ? "Bloquear acesso" : "Liberar de novo"}
          </button>
        </div>

        <h4 className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Linha do tempo</h4>
        {eventos === null && <p className="text-sm text-muted">Carregando…</p>}
        {eventos?.length === 0 && <p className="text-sm text-graytext">Ainda sem atividade.</p>}
        <ul className="ml-1.5 border-l-2 border-rule">
          {eventos?.map((e) => (
            <li key={e.id} className="relative pb-3 pl-4 text-[13px] text-slate-700">
              <span className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-sky-700" />
              {descreverAtividade(e)}
              <small className="block text-[11.5px] text-muted">{haQuanto(e.criado_em)}</small>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}

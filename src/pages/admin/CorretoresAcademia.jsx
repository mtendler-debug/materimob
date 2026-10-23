import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { haQuanto, linkWhatsapp } from "../../lib/academiaUtil";
import { descreverAtividade, estaParado, PAPEL_LABELS, ultimoAcessoTexto } from "../../lib/atividades";
import { semAcento } from "../../lib/treino";
import Button from "../../components/ui/Button";

const FILTROS = [
  ["ativos", "Ativos"],
  ["parados", "Parados há 7 dias"],
  ["bloqueados", "Bloqueados"],
  ["todos", "Todos"],
];

const campo =
  "mt-1 w-full min-h-11 rounded-control border border-slate-200 bg-white px-3 text-body-sm text-charcoal transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none";

function iniciais(nome) {
  return (nome || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

// Corretores liberados e bloqueados, com o que cada um fez. Pedidos pendentes e
// recusados ficam na aba Acessos.
export default function CorretoresAcademia() {
  const [lista, setLista] = useState(null);
  const [ativas, setAtivas] = useState([]);
  const [filtro, setFiltro] = useState("ativos");
  const [imob, setImob] = useState("todas");
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState({});
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

  // Agrupado por imobiliária: cada grupo mostra o total da equipe e abre para a lista de corretores.
  const grupos = {};
  visiveis.forEach((c) => {
    const nome = c.parceira ?? "Autônomo";
    const g = (grupos[nome] ??= { itens: [], envios: 0, clientes_abriram: 0, certificados: 0, vendas: 0 });
    g.itens.push(c);
    ["envios", "clientes_abriram", "certificados", "vendas"].forEach((k) => (g[k] += Number(c[k])));
  });
  const entradas = Object.entries(grupos);
  const abertoPadrao = entradas.length === 1;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Situação">
          {FILTROS.map(([k, rotulo]) => (
            <button
              key={k}
              type="button"
              aria-pressed={filtro === k}
              onClick={() => setFiltro(k)}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 ${
                filtro === k ? "border-charcoal bg-charcoal text-white" : "border-slate-200 bg-white text-graytext hover:border-slate-300 hover:text-charcoal"
              }`}
            >
              {rotulo} ({contagem[k]})
            </button>
          ))}
        </div>
        <select value={imob} onChange={(e) => setImob(e.target.value)} aria-label="Imobiliária" className="min-h-10 rounded-control border border-slate-200 bg-white px-3 text-[13.5px]">
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
          aria-label="Buscar por nome"
          className="min-h-10 rounded-control border border-slate-200 bg-white px-3 text-[13.5px] transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
      </div>

      {entradas.length === 0 && (
        <div className="py-12 text-center text-graytext">
          <b className="mb-1 block text-body text-charcoal">Nada nesta lista</b>
          <p className="text-body-sm">Mude o filtro ou a busca.</p>
        </div>
      )}

      {entradas.map(([nome, g]) => {
        const aberto = abertos[nome] ?? abertoPadrao;
        return (
          <section key={nome} className="mt-3 overflow-hidden rounded-[20px] border border-slate-200/70 bg-white">
            <button
              type="button"
              onClick={() => setAbertos((a) => ({ ...a, [nome]: !aberto }))}
              aria-expanded={aberto}
              className="grid min-h-[68px] w-full grid-cols-[minmax(0,1fr)_20px] items-center gap-3 px-[18px] py-3.5 text-left md:grid-cols-[minmax(0,1fr)_repeat(4,64px)_20px]"
            >
              <span>
                <b className="block text-[15px] tracking-tight text-charcoal">{nome}</b>
                <small className="text-body-sm text-graytext">{g.itens.length} corretor(es)</small>
              </span>
              {[
                [g.envios, "envios"],
                [g.clientes_abriram, "abriram"],
                [g.certificados, "cert."],
                [g.vendas, "vendas"],
              ].map(([v, r]) => (
                <span key={r} className="hidden text-center md:block">
                  <b className="block text-[17px] text-charcoal tabular-nums">{v}</b>
                  <small className="text-[11px] text-graytext">{r}</small>
                </span>
              ))}
              <svg viewBox="0 0 24 24" className={`h-5 w-5 text-muted transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {aberto && (
              <div className="border-t border-slate-100 px-[18px] pb-2.5">
                {g.itens.map((c) => {
                  const parado = c.status === "liberado" && estaParado(c.ultimo_acesso);
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setFicha(c)}
                      className="flex min-h-[60px] w-full items-center gap-3 border-t border-slate-100 py-2.5 text-left first:border-0"
                    >
                      <span className="grid h-[38px] w-[38px] flex-none place-items-center rounded-full bg-brand-soft text-xs font-semibold text-sky-800">{iniciais(c.nome)}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-body-sm font-semibold text-charcoal">
                          {c.nome}
                          {c.status === "bloqueado" && (
                            <span className="ml-1.5 rounded-full bg-danger-bg px-2 py-px text-caption font-semibold text-danger-text">Bloqueado</span>
                          )}
                        </b>
                        <small className="text-caption text-graytext">{PAPEL_LABELS[c.papel]}</small>
                      </span>
                      <span className={`text-caption ${parado ? "font-semibold text-amber-700" : "text-graytext"}`}>{ultimoAcessoTexto(c.ultimo_acesso)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {ficha && <Ficha c={ficha} ativas={ativas} onFechar={() => setFicha(null)} onMudou={async () => { await load(); setFicha(null); }} />}
    </div>
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
      <div className="fixed inset-0 z-[55] bg-slate-900/30 backdrop-blur-sm" onClick={onFechar} />
      <aside role="dialog" aria-label={`Ficha de ${c.nome}`} className="fixed bottom-0 right-0 top-0 z-[60] w-full max-w-[440px] overflow-y-auto border-l border-slate-300 bg-white p-5 shadow-xl">
        <button onClick={onFechar} className="float-right rounded-[8px] border border-slate-300 px-3 py-1 text-xs font-bold text-slate-700">
          Fechar
        </button>
        <h3 className="text-xl font-bold text-charcoal">{c.nome}</h3>
        <div className="mb-3 mt-1.5 flex gap-1.5">
          <span
            className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${
              c.status === "bloqueado" ? "border-danger-border bg-danger-bg text-danger-text" : "border-success-border bg-success-bg text-success-text"
            }`}
          >
            {c.status === "bloqueado" ? "Bloqueado" : "Liberado"}
          </span>
          <span className="rounded-full border border-slate-200/70 bg-slate-100 px-2 py-px text-[11.5px] font-semibold text-slate-600">{PAPEL_LABELS[c.papel]}</span>
        </div>

        <dl className="divide-y divide-rule rounded-card border border-slate-200/70 px-3.5 text-[13px]">
          {[
            ["Imobiliária", c.parceira ?? "Autônomo"],
            ["WhatsApp", zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{c.whatsapp}</a> : "não informado"],
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
          <button onClick={salvar} disabled={busy} className="rounded-[8px] bg-brand px-3 py-1.5 text-[12.5px] font-bold text-white disabled:opacity-50">
            Salvar papel e imobiliária
          </button>
          <button
            onClick={bloquear}
            disabled={busy}
            className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-50 ${
              c.status === "liberado" ? "border border-danger-border bg-white text-danger-text" : "bg-brand text-white"
            }`}
          >
            {c.status === "liberado" ? "Bloquear acesso" : "Liberar de novo"}
          </button>
        </div>

        <h4 className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Linha do tempo</h4>
        {eventos === null && <p className="text-sm text-muted">Carregando…</p>}
        {eventos?.length === 0 && <p className="text-sm text-graytext">Ainda sem atividade.</p>}
        <ul className="ml-1.5 border-l-2 border-slate-200/70">
          {eventos?.map((e) => (
            <li key={e.id} className="relative pb-3 pl-4 text-[13px] text-slate-700">
              <span className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
              {descreverAtividade(e)}
              <small className="block text-[11.5px] text-muted">{haQuanto(e.criado_em)}</small>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}

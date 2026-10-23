import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { usePendentesAcesso } from "../../lib/usePendentesAcesso";
import { haQuanto, linkWhatsapp } from "../../lib/academiaUtil";
import { descreverAtividade, ultimoAcessoTexto } from "../../lib/atividades";

// Visão geral da Academia para o dono do canal. Os números vêm prontos de
// pc_painel_canal; "Acontecendo agora" é a linha do tempo de todos.
export default function VisaoGeralAcademia() {
  const { pendentes, sugestoes } = usePendentesAcesso();
  const [p, setP] = useState(null);
  const [feed, setFeed] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.all([supabase.rpc("pc_painel_canal"), supabase.rpc("pc_linha_do_tempo", { p_usuario: null, p_limite: 12 })]).then(
      ([a, b]) => {
        if (a.error) return setErro(a.error.message);
        setP(a.data);
        setFeed(b.data ?? []);
      },
    );
  }, []);

  if (erro) return <p className="mt-4 text-sm text-danger-text">{erro}</p>;
  if (!p) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const esperando = (pendentes > 0 ? 1 : 0) + (sugestoes > 0 ? 1 : 0);

  return (
    <div className="mt-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Kpi v={p.corretores} r="Corretores liberados" s={`${p.ativos_7d} acessaram em 7 dias`} />
        <Kpi v={p.imobiliarias} r="Imobiliárias na Academia" s="fora os autônomos" />
        <Kpi v={p.envios} r="Kits enviados" s={`${p.clientes_abriram} clientes abriram o link · ${p.envios_7d} nos últimos 7 dias`} />
        <Kpi v={p.materiais_7d} r="Materiais vistos em 7 dias" s="projetos, fotos, textos" />
        <Kpi v={p.em_treinamento} r="Em treinamento" s={`${p.aulas} aulas concluídas`} />
        <Kpi v={p.certificados} r="Certificados" s="trilhas concluídas com quiz" />
        <Kpi v={p.registros_andamento} r="Registros em andamento" s="clientes na fila e nas visitas" />
        <Kpi v={p.vendas} r="Vendas" s="registros que viraram venda" />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-amber-300 bg-amber-50 px-4 py-3">
        <div className="text-sm text-charcoal">
          {esperando === 0 ? (
            <b>Nada esperando você.</b>
          ) : (
            <b>
              {[
                pendentes > 0 && `${pendentes} ${pendentes === 1 ? "pedido de acesso" : "pedidos de acesso"}`,
                sugestoes > 0 && `${sugestoes} ${sugestoes === 1 ? "sugestão de argumento" : "sugestões de argumento"}`,
              ]
                .filter(Boolean)
                .join(" e ")}{" "}
              aguardando você
            </b>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pendentes > 0 && <Atalho to="/admin/academia/acessos">Ver pedidos</Atalho>}
          {sugestoes > 0 && <Atalho to="/admin/academia/sugestoes">Ver sugestões</Atalho>}
          <Atalho to="/admin/academia/avisos" escuro>
            Publicar aviso
          </Atalho>
        </div>
      </div>

      <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <Caixa titulo="Acontecendo agora">
          {feed?.length === 0 && <p className="px-3.5 py-5 text-sm text-graytext">Ainda não há atividade. Ela aparece aqui conforme os corretores usam a Academia.</p>}
          <ul>
            {feed?.map((a) => (
              <li key={a.id} className="flex justify-between gap-2.5 border-b border-slate-100 px-3.5 py-2.5 text-[13px] last:border-b-0">
                <span>
                  <b className="text-charcoal">{a.nome}</b> {descreverAtividade(a)}
                </span>
                <span className="whitespace-nowrap text-xs text-muted">{haQuanto(a.criado_em)}</span>
              </li>
            ))}
          </ul>
        </Caixa>

        <div className="space-y-3.5">
          <Caixa titulo="Mais engajados (30 dias)">
            {p.mais_engajados.length === 0 && <p className="px-3.5 py-4 text-sm text-graytext">Sem atividade nos últimos 30 dias.</p>}
            <ul>
              {p.mais_engajados.map((c, i) => (
                <li key={c.user_id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2 text-[13px] last:border-b-0">
                  <span>
                    {i + 1}. <b className="text-charcoal">{c.nome}</b>
                  </span>
                  <b className="tabular-nums">{c.atividades}</b>
                </li>
              ))}
            </ul>
          </Caixa>

          <Caixa titulo={`Sem acessar há 7 dias (${p.parados.length})`}>
            {p.parados.length === 0 && <p className="px-3.5 py-4 text-sm text-graytext">Ninguém parado. Tudo em dia.</p>}
            <ul>
              {p.parados.map((c) => {
                const zap = linkWhatsapp(c.whatsapp);
                return (
                  <li key={c.user_id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2 text-[13px] last:border-b-0">
                    <span>
                      <b className="text-charcoal">{c.nome}</b>
                      <br />
                      <span className="text-xs text-muted">último acesso: {ultimoAcessoTexto(c.ultimo_acesso)}</span>
                    </span>
                    {zap && (
                      <a href={zap} target="_blank" rel="noopener noreferrer" className="rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700">
                        WhatsApp
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </Caixa>
        </div>
      </div>
    </div>
  );
}

function Kpi({ v, r, s }) {
  return (
    <div className="rounded-card border border-slate-200/70 bg-white px-3.5 py-3">
      <b className="block text-2xl leading-tight text-charcoal tabular-nums">{v}</b>
      <span className="text-[12.5px] text-graytext">{r}</span>
      <small className="mt-0.5 block text-[11.5px] text-muted">{s}</small>
    </div>
  );
}

function Caixa({ titulo, children }) {
  return (
    <div className="overflow-hidden rounded-card border border-slate-200/70 bg-white">
      <h4 className="border-b border-slate-200/70 px-3.5 py-2.5 text-xs font-bold uppercase tracking-[.08em] text-graytext">{titulo}</h4>
      {children}
    </div>
  );
}

function Atalho({ to, escuro, children }) {
  return (
    <Link
      to={to}
      className={`rounded-[10px] px-3 py-1.5 text-xs font-bold ${escuro ? "bg-brand text-white" : "border border-slate-300 bg-white text-slate-700"}`}
    >
      {children}
    </Link>
  );
}

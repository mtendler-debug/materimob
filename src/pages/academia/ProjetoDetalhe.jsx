import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { useFeedback } from "../../lib/feedback";
import { baixar, blocosDaFicha, nomeArquivo, registrarAtividade } from "../../lib/academiaUtil";
import EnviarCliente, { Detalhe } from "./EnviarCliente";

const SECOES = ["Como vender", "Enviar ao cliente", "Fotos e materiais", "Ficha"];

export default function ProjetoDetalhe() {
  const { codigo } = useParams();
  const { acesso } = useAcessoCanal();
  const [kit, setKit] = useState(undefined);
  const [secao, setSecao] = useState(0);

  useEffect(() => {
    setKit(undefined);
    setSecao(0);
    supabase
      .from("pc_kits")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle()
      .then(({ data }) => {
        setKit(data ?? null);
        if (data) registrarAtividade("abriu_projeto", data.empreendimento_id, data.nome);
      });
  }, [codigo]);

  if (acesso === undefined || kit === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;
  if (kit === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-graytext">Este projeto não está disponível.</p>
        <Link to="/app/academia/projetos" className="mt-3 inline-flex min-h-9 items-center text-body-sm font-semibold text-brand hover:underline">
          Ver todos os projetos
        </Link>
      </div>
    );
  }

  const avisoTexto = kit.aviso || kit.kit?.alerta?.texto;

  return (
    <div className="mx-auto max-w-2xl pb-24 md:pb-10">
      <Link to="/app/academia/projetos" className="mx-4 mt-3 inline-flex min-h-9 items-center text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
        ← Projetos
      </Link>

      <div className="relative mt-2 overflow-hidden md:mx-4 md:rounded-card">
        {kit.capa_url && <img src={kit.capa_url} alt="" className="h-36 w-full object-cover sm:h-48" />}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-900/80 to-slate-900/5 px-4 py-3 text-white">
          <b className="text-lg leading-tight">{kit.nome}</b>
          <span className="text-xs text-slate-200">
            {[kit.local_texto, kit.fase, kit.entrega && `entrega ${kit.entrega}`].filter(Boolean).join(" · ")}
          </span>
        </div>
      </div>

      {avisoTexto && (
        <p className="mx-4 mt-3 rounded-card border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <b>Atenção:</b> {avisoTexto}
        </p>
      )}

      <div role="tablist" aria-label="Seções do projeto" className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200/70 px-3">
        {SECOES.map((s, i) => (
          <button
            key={s}
            role="tab"
            aria-selected={secao === i}
            onClick={() => setSecao(i)}
            className={`shrink-0 border-b-2 px-2 py-2.5 text-[13px] font-bold ${
              secao === i ? "border-gold text-charcoal" : "border-transparent text-graytext"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 pt-4">
        {secao === 0 && <ComoVender kit={kit} />}
        {secao === 1 && <EnviarCliente kit={kit} acesso={acesso} />}
        {secao === 2 && <FotosMateriais kit={kit} />}
        {secao === 3 && <Ficha kit={kit} />}
      </div>
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">{titulo}</h2>
      {children}
    </section>
  );
}

function Cartao({ rotulo, children }) {
  return (
    <div className="mt-2 rounded-card border border-slate-200/70 bg-white px-3.5 py-2.5 text-[13px] first:mt-0">
      {rotulo && <div className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-800">{rotulo}</div>}
      {children}
    </div>
  );
}

function Lista({ itens }) {
  return (
    <ul className="list-disc space-y-1.5 pl-4">
      {itens.map((i) => (
        <li key={i}>{i}</li>
      ))}
    </ul>
  );
}

function ComoVender({ kit }) {
  const { toast } = useFeedback();
  const k = kit.kit ?? {};

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      registrarAtividade("copiou_texto", kit.empreendimento_id, "resposta de pergunta do cliente");
      toast("Resposta copiada.");
    } catch {
      toast("Não consegui copiar. Selecione o texto e copie.", "warning");
    }
  }

  return (
    <div>
      {k.pilula && (
        <Bloco titulo="Em resumo">
          <Cartao rotulo="A tese">{k.pilula.tese}</Cartao>
          <Cartao rotulo="Para quem vender">{k.pilula.publico}</Cartao>
          <Cartao rotulo="Gatilho de urgência">{k.pilula.gatilho}</Cartao>
        </Bloco>
      )}

      {k.numeros?.length > 0 && (
        <Bloco titulo="Números na ponta da língua">
          <Cartao>
            <div className="space-y-2">
              {k.numeros.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <b className="block text-[11px] font-bold uppercase tracking-wide text-graytext">{rotulo}</b>
                  {valor}
                </div>
              ))}
            </div>
          </Cartao>
        </Bloco>
      )}

      {k.antes?.length > 0 && (
        <Bloco titulo="Antes de abordar">
          <Cartao>
            <Lista itens={k.antes} />
          </Cartao>
        </Bloco>
      )}

      {k.regras?.map((r) => (
        <Bloco key={r.titulo} titulo={r.titulo}>
          <Cartao>
            <Lista itens={r.itens ?? []} />
          </Cartao>
          {Array.isArray(r.tabela) && r.tabela.length > 1 && <Tabela linhas={r.tabela} />}
        </Bloco>
      ))}

      {k.faq?.length > 0 && (
        <Bloco titulo="Perguntas do cliente">
          <div className="space-y-2">
            {k.faq.map((f) => (
              <Detalhe key={f.pergunta} titulo={f.pergunta}>
                {f.resposta}
                <div>
                  <button
                    type="button"
                    onClick={() => copiar(f.resposta)}
                    className="mt-2 rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700"
                  >
                    Copiar resposta
                  </button>
                </div>
              </Detalhe>
            ))}
          </div>
        </Bloco>
      )}

      {k.boas_praticas?.length > 0 && (
        <Bloco titulo="Boas práticas">
          <Cartao>
            <Lista itens={k.boas_praticas} />
          </Cartao>
        </Bloco>
      )}

      {k.aviso_legal && <p className="mt-5 text-[11px] text-muted">{k.aviso_legal}</p>}
    </div>
  );
}

function Tabela({ linhas }) {
  const [cab, ...corpo] = linhas;
  return (
    <div className="mt-2 overflow-x-auto rounded-card border border-slate-200/70 bg-white">
      <table className="w-full min-w-[320px] text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-200/70 bg-slate-50 text-left">
            {cab.map((c) => (
              <th key={c} className="px-3 py-2 font-bold text-charcoal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corpo.map((l, i) => (
            <tr key={i} className="border-b border-slate-200/70 last:border-b-0">
              {l.map((c, j) => (
                <td key={j} className="px-3 py-1.5">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FotosMateriais({ kit }) {
  const [ampliada, setAmpliada] = useState(null);
  const k = kit.kit ?? {};
  const galeria = Array.isArray(kit.galeria) ? kit.galeria : [];
  const cards = k.abordagens?.filter((o) => k.cards_img?.[o.tese]?.feed) ?? [];
  const temExtras = kit.drive_url || kit.tabela_url || kit.youtube_url;

  function baixarFoto(f) {
    registrarAtividade("baixou_foto", kit.empreendimento_id, f.legenda);
    baixar(f.url, nomeArquivo(f.url));
  }

  return (
    <div>
      {galeria.length > 0 && (
        <Bloco titulo="Fotos">
          <div className="grid grid-cols-2 gap-2">
            {galeria.map((f) => (
              <figure key={f.url}>
                <button type="button" onClick={() => setAmpliada(f)} className="block w-full" aria-label={`Ampliar: ${f.legenda}`}>
                  <img src={f.url} alt={f.legenda} loading="lazy" className="aspect-[4/3] w-full rounded-control object-cover" />
                </button>
                <figcaption className="mt-0.5 text-[11.5px] text-graytext">{f.legenda}</figcaption>
              </figure>
            ))}
          </div>
        </Bloco>
      )}

      <Bloco titulo="Materiais">
        {kit.lamina_url && (
          <Cartao rotulo="Lâmina">
            <img src={kit.lamina_url} alt="Lâmina do empreendimento" loading="lazy" className="mt-1 w-full rounded-control border border-slate-200/70" />
            <button
              type="button"
              onClick={() => {
                registrarAtividade("baixou_lamina", kit.empreendimento_id, kit.nome);
                baixar(kit.lamina_url, nomeArquivo(kit.lamina_url));
              }}
              className={btn}
            >
              Baixar lâmina
            </button>
          </Cartao>
        )}
        {kit.guia_url && (
          <Cartao rotulo="Guia do kit">
            <a
              href={kit.guia_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrarAtividade("baixou_guia", kit.empreendimento_id, kit.nome)}
              className={`${btn} inline-block`}
            >
              Abrir o guia (PDF)
            </a>
          </Cartao>
        )}
        {cards.length > 0 && (
          <Cartao rotulo="Cards para redes sociais">
            {cards.map((o) => {
              const c = k.cards_img[o.tese];
              return (
                <div key={o.opcao} className="flex items-center justify-between gap-2 border-t border-slate-200/70 py-1.5 first:border-t-0">
                  <span className="text-[12.5px]">{o.titulo}</span>
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        registrarAtividade("baixou_arte", kit.empreendimento_id, `${o.titulo} 1:1`);
                        baixar(c.feed, nomeArquivo(c.feed));
                      }}
                      className={btn}
                    >
                      1:1
                    </button>
                    {c.stories && (
                      <button
                        type="button"
                        onClick={() => {
                          registrarAtividade("baixou_arte", kit.empreendimento_id, `${o.titulo} 9:16`);
                          baixar(c.stories, nomeArquivo(c.stories));
                        }}
                        className={btn}
                      >
                        9:16
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </Cartao>
        )}
        {kit.drive_url && (
          <LinkMaterial href={kit.drive_url} tipo="abriu_book" kit={kit}>
            Abrir o book
          </LinkMaterial>
        )}
        {kit.tabela_url && (
          <LinkMaterial href={kit.tabela_url} tipo="abriu_tabela" kit={kit}>
            Abrir a tabela de preços
          </LinkMaterial>
        )}
        {kit.youtube_url && (
          <LinkMaterial href={kit.youtube_url} tipo="abriu_video" kit={kit}>
            Assistir ao vídeo
          </LinkMaterial>
        )}
        {!temExtras && (
          <p className="mt-2 text-[12.5px] text-graytext">Book e tabela de preços aparecem aqui quando o projeto tiver o arquivo.</p>
        )}
      </Bloco>

      {ampliada && (
        <div
          role="dialog"
          aria-label={ampliada.legenda}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
          onClick={() => setAmpliada(null)}
        >
          <img src={ampliada.url} alt={ampliada.legenda} className="max-h-[75vh] max-w-full rounded-control object-contain" />
          <p className="text-sm text-white">{ampliada.legenda}</p>
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => baixarFoto(ampliada)} className="rounded-[10px] bg-white px-4 py-2 text-sm font-bold text-charcoal">
              Baixar
            </button>
            <button type="button" onClick={() => setAmpliada(null)} className="rounded-[10px] border border-white/60 px-4 py-2 text-sm font-bold text-white">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const btn = "mt-2 rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700";

function LinkMaterial({ href, tipo, kit, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => registrarAtividade(tipo, kit.empreendimento_id, kit.nome)}
      className="mt-2 block rounded-card border border-slate-200/70 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-sky-800 underline"
    >
      {children}
    </a>
  );
}

function Ficha({ kit }) {
  const blocos = blocosDaFicha(kit.ficha);
  if (blocos.length === 0) return <p className="text-sm text-graytext">Este projeto ainda não tem ficha completa.</p>;
  return (
    <div className="text-[13px] text-slate-700">
      {blocos.map((b, i) =>
        b.tipo === "titulo" ? (
          <h3 key={i} className="mb-1 mt-4 text-sm font-bold text-charcoal first:mt-0">
            {b.texto}
          </h3>
        ) : b.tipo === "lista" ? (
          <ul key={i} className="list-disc space-y-1 pl-4">
            {b.itens.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        ) : (
          <p key={i} className="mb-1.5">
            {b.texto}
          </p>
        ),
      )}
    </div>
  );
}

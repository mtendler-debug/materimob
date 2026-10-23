import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { linkWhatsapp } from "../lib/academiaUtil";
import Button from "../components/ui/Button";

// Página que o cliente abre pelo link enviado pelo corretor (/p/<código>).
// Sem login. Só mostra o que o cliente pode ver: nunca preço de tabela,
// comissão, avisos internos nem a ficha técnica completa (o servidor já não
// devolve esses campos). Abrir a página gera a atividade "cliente abriu".
export default function PublicProjeto() {
  const { token } = useParams();
  const [dados, setDados] = useState(undefined);

  useEffect(() => {
    supabase
      .rpc("pc_abrir_envio", { p_token: token, p_user_agent: navigator.userAgent })
      .then(({ data }) => setDados(data ?? null));
  }, [token]);

  if (dados === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-body-sm text-muted">Carregando…</p>
      </div>
    );
  }
  if (dados === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
        <div>
          <h1 className="text-title font-bold tracking-tight text-charcoal">Link indisponível</h1>
          <p className="mt-1 text-body-sm text-graytext">Peça um novo link ao seu corretor.</p>
        </div>
      </div>
    );
  }

  const { projeto: p, corretor, imobiliaria } = dados;
  const destaques = (p.destaques ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const galeria = Array.isArray(p.galeria) ? p.galeria : [];
  const whatsapp = linkWhatsapp(
    corretor?.whatsapp,
    `Olá${corretor?.nome ? `, ${corretor.nome.split(" ")[0]}` : ""}! Vi o ${p.nome} e quero saber mais.`,
  );
  const iniciais = (corretor?.nome ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-md bg-white pb-8 sm:my-0 sm:border-x sm:border-slate-200/70">
        <div className="relative">
          {p.capa_url && <img src={p.capa_url} alt="" className="h-56 w-full object-cover" />}
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-slate-900/85 to-slate-900/10 px-4 py-4 text-white">
            <h1 className="text-headline font-bold leading-[1.1] tracking-[-0.03em]">{p.nome}</h1>
            <span className="text-[12.5px] text-slate-200">
              {[p.local, p.fase, p.entrega && `entrega ${p.entrega}`].filter(Boolean).join(" · ")}
            </span>
          </div>
        </div>

        <div className="px-4 pt-4">
          {p.resumo && <p className="text-base leading-relaxed text-slate-700">{p.resumo}</p>}

          {destaques.length > 0 && (
            <Secao titulo="Pontos fortes">
              <ul className="list-disc space-y-1.5 pl-4 text-body-sm text-slate-700">
                {destaques.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Secao>
          )}

          {galeria.length > 0 && (
            <Secao titulo="Galeria">
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                {galeria.map((f) => (
                  <img key={f.url} src={f.url} alt={f.legenda} loading="lazy" className="h-28 w-auto flex-none rounded-xl" />
                ))}
              </div>
            </Secao>
          )}

          {p.lamina_url && (
            <Secao titulo="Lâmina">
              <img src={p.lamina_url} alt="Lâmina do empreendimento" loading="lazy" className="w-full rounded-xl border border-slate-200/70" />
            </Secao>
          )}

          {(p.book_url || p.youtube_url) && (
            <div className="mt-5 flex flex-wrap gap-2">
              {p.book_url && (
                <Button href={p.book_url} target="_blank" rel="noopener noreferrer" variant="secondary">
                  Ver o book
                </Button>
              )}
              {p.youtube_url && (
                <Button href={p.youtube_url} target="_blank" rel="noopener noreferrer" variant="secondary">
                  Assistir ao vídeo
                </Button>
              )}
            </div>
          )}

          {corretor?.nome && (
            <Secao titulo="Seu corretor">
              <div className="flex items-center gap-3 rounded-card border border-slate-200/70 px-3.5 py-3">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand font-bold text-white">{iniciais}</div>
                <div>
                  <b className="text-body-sm text-charcoal">{corretor.nome}</b>
                  {imobiliaria && <div className="text-caption text-graytext">{imobiliaria}</div>}
                </div>
              </div>
              {whatsapp && (
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex min-h-12 items-center justify-center rounded-control bg-emerald-700 px-4 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-emerald-800 active:scale-[0.98]"
                >
                  Falar no WhatsApp
                </a>
              )}
            </Secao>
          )}

          <p className="mt-5 text-caption text-muted">Informações sujeitas a alteração e à disponibilidade. Imagens ilustrativas.</p>
        </div>
      </div>
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section className="mt-5">
      <h2 className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">{titulo}</h2>
      {children}
    </section>
  );
}

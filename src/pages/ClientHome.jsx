import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import Button from "../components/ui/Button";

function Centered({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
      {children}
    </div>
  );
}

export default function ClientHome() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    callFunction("cliente-painel", { params: { token } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [token]);

  if (loading) return <Centered>Buscando seus atendimentos…</Centered>;
  if (error) {
    return (
      <Centered>
        <h1 className="text-lg font-bold text-charcoal">Link inválido</h1>
        <p className="mt-2 max-w-xs text-sm text-graytext">
          Este link não é válido. Peça um link novo ao corretor que está te atendendo.
        </p>
      </Centered>
    );
  }

  // corretor vem só no link por corretor; o link antigo (compartilhado)
  // continua reunindo os roteiros de todos.
  const { client, corretor, selections } = data;
  const primeiroNome = (client.name || "").trim().split(/\s+/)[0];
  const proximo = selections.find((s) => !s.archived);

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto max-w-[700px] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="text-caption font-semibold tracking-[.06em] text-brand uppercase">MaterImob</div>
        <h1 className="mt-1 text-headline font-bold tracking-[-0.035em] text-charcoal">Olá, {primeiroNome}</h1>
        <p className="mt-1 text-base text-graytext">
          {corretor?.nome
            ? `Os imóveis que ${corretor.nome} separou para você.`
            : corretor
              ? "Os imóveis que seu corretor separou para você."
              : "Aqui ficam reunidos todos os imóveis que separaram para você, de qualquer corretor."}
        </p>
      </header>

      <div className="mx-auto max-w-[700px] px-5 pt-5 pb-12">
        {selections.length === 0 && (
          <div className="rounded-card border border-slate-200/70 bg-white p-6 text-center text-body-sm text-muted">
            Nenhum atendimento por aqui ainda.
          </div>
        )}

        {proximo && (
          <div className="grid gap-1.5 rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 p-[22px] text-white shadow-[0_18px_40px_-20px_rgba(2,132,199,.7)]">
            <small className="text-body-sm text-sky-100">Próximo passo · {proximo.title}</small>
            <h2 className="text-title leading-[1.2] font-bold tracking-[-0.03em]">Avalie os imóveis que você visitou</h2>
            <small className="text-body-sm text-sky-100">Leva poucos minutos e fica salvo neste celular.</small>
            <a
              href={`/c/${proximo.token_form}`}
              className="mt-3 inline-flex min-h-12 items-center justify-center rounded-control bg-white text-[15px] font-semibold text-sky-800 transition-all duration-200 active:scale-[0.98]"
            >
              Continuar avaliando
            </a>
          </div>
        )}

        {selections.length > 0 && (
          <p className="mt-7 mb-2.5 text-caption font-semibold tracking-[.08em] text-muted uppercase">Seus atendimentos</p>
        )}
        <div className="space-y-2.5">
          {selections.map((s) => (
            <article key={s.id} className="rounded-[22px] border border-slate-200/70 bg-white p-3.5">
              <div className="flex items-center gap-3.5">
                <span className="h-[52px] w-[52px] flex-none rounded-2xl bg-gradient-to-br from-sky-600 to-sky-800" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-base tracking-tight text-charcoal">{s.title}</b>
                    {s.archived && <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">encerrado</span>}
                  </div>
                  {s.subtitle && <p className="text-body-sm text-graytext">{s.subtitle}</p>}
                  {(s.corretor_org || s.corretor_nome) && (
                    <p className="text-caption text-muted">Atendimento por {s.corretor_org || s.corretor_nome}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {!s.archived && (
                  <Button href={`/c/${s.token_form}`} size="sm">
                    Avaliar imóveis
                  </Button>
                )}
                <Button href={`/r/${s.token_panel}`} variant="secondary" size="sm" className={s.archived ? "sm:col-span-2" : ""}>
                  Ver resultados e propostas
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

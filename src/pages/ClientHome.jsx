import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";

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

  const { client, selections } = data;

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-charcoal px-[18px] pt-[26px] pb-6 text-white">
        <div className="mx-auto max-w-[700px]">
          <div className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">
            MaterImob
          </div>
          <h1 className="mt-[9px] mb-1 text-[22px] leading-tight font-bold">Olá, {client.name}</h1>
          <p className="m-0 text-[13.5px] text-[#C9C9C9]">
            Aqui ficam reunidos todos os imóveis que separaram pra você — de qualquer corretor.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[700px] px-[18px] py-8">
        {selections.length === 0 && (
          <div className="rounded-[14px] bg-white p-6 text-center text-[13.5px] text-muted">
            Nenhum atendimento por aqui ainda.
          </div>
        )}
        <div className="space-y-3">
          {selections.map((s) => (
            <div key={s.id} className="rounded-[14px] bg-white p-[18px] shadow-[0_1px_3px_rgba(0,0,0,.06)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <b className="text-[16px] text-charcoal">{s.title}</b>
                {s.archived && (
                  <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
                    encerrado
                  </span>
                )}
              </div>
              {s.subtitle && <p className="mt-1 text-[13px] text-graytext">{s.subtitle}</p>}
              {(s.corretor_org || s.corretor_nome) && (
                <p className="mt-1 text-[12px] text-muted">
                  Atendimento por {s.corretor_org || s.corretor_nome}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {!s.archived && (
                  <a
                    href={`/c/${s.token_form}`}
                    className="rounded-[10px] bg-charcoal px-4 py-2 text-[13px] font-bold text-white hover:opacity-90"
                  >
                    Avaliar imóveis
                  </a>
                )}
                <a
                  href={`/r/${s.token_panel}`}
                  className="rounded-[10px] border-[1.5px] border-rule px-4 py-2 text-[13px] font-bold text-charcoal hover:border-gold"
                >
                  Ver resultados e propostas
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

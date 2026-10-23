import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { callFunction } from "../lib/edgeFunctions";
import { RegistroForm } from "./parcerias/RegistroForm";

export default function PublicPartnerForm() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    callFunction("pc-registro-form", { params: { token } })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-body-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Shell title="MaterImob">
        <div className="mt-5 rounded-card bg-light p-4 text-body-sm text-graytext">
          Este link não está mais ativo. Fale com o coordenador de parcerias.
        </div>
      </Shell>
    );
  }

  return (
    <Shell title={data.parceira.nome_fantasia} subtitle="Registro de cliente — Chaincorp Incorporações">
      <RegistroForm
        parceira={data.parceira}
        token={token}
        corretores={data.corretores}
        empreendimentos={data.empreendimentos}
        onDone={(payload) => callFunction("pc-registro-cliente", { method: "POST", body: payload })}
      />
    </Shell>
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto max-w-[640px] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="text-caption font-semibold tracking-[.06em] text-brand uppercase">MaterImob</div>
        <h1 className="mt-1 text-headline leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">{title}</h1>
        {subtitle && <p className="mt-2 text-base text-graytext">{subtitle}</p>}
      </header>
      <div className="mx-auto max-w-[640px] px-5 py-6 pb-10">{children}</div>
    </div>
  );
}

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
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Shell title="MaterImob">
        <div className="mt-5 rounded-xl bg-light p-[14px] text-[12.5px] text-graytext">
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
      <header className="bg-charcoal px-4 pt-[22px] pb-5 text-white">
        <div className="mx-auto max-w-[640px]">
          <div className="text-[11px] font-bold uppercase tracking-[.18em] text-gold">MaterImob</div>
          <h1 className="font-serif mt-2 mb-1 text-[23px] font-semibold leading-tight">{title}</h1>
          {subtitle && <p className="m-0 text-[13px] text-[#C9C9C9]">{subtitle}</p>}
        </div>
      </header>
      <div className="mx-auto max-w-[640px] px-4 py-6 pb-10">{children}</div>
    </div>
  );
}

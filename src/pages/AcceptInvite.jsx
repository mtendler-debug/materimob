import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useOrganization } from "../lib/useOrganization";

export default function AcceptInvite() {
  const { token } = useParams();
  const { user, loading } = useAuth();
  const { setActiveOrgId } = useOrganization();
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user || status !== "idle") return;
    accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function accept() {
    setStatus("working");
    const { data, error: fnError } = await supabase.functions.invoke("org-invite-accept", {
      body: { token },
    });
    if (fnError || data?.error) {
      setError(data?.error || fnError.message);
      setStatus("error");
      return;
    }
    setResult(data);
    setStatus("done");
    if (data.organization_id) setActiveOrgId(data.organization_id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-[20px] bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-charcoal">Convite de organização</h1>

        {loading && <p className="mt-3 text-sm text-graytext">Carregando…</p>}

        {!loading && !user && (
          <>
            <p className="mt-3 text-sm text-graytext">
              Faça login ou crie sua conta para aceitar o convite. Depois, abra este mesmo link de novo.
            </p>
            <Link to="/entrar" className="mt-4 inline-block rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white">
              Ir para o login
            </Link>
          </>
        )}

        {status === "working" && <p className="mt-3 text-sm text-graytext">Aceitando convite…</p>}

        {status === "done" && (
          <>
            <p className="mt-3 text-sm text-graytext">
              Pronto! Você agora faz parte de <b className="text-charcoal">{result.organization_name}</b>.
            </p>
            <Link to="/app/organizacao" className="mt-4 inline-block rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white">
              Ver organização
            </Link>
          </>
        )}

        {status === "error" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

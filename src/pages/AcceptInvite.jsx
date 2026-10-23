import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useOrganization } from "../lib/useOrganization";
import CartaoAcesso from "../components/ui/CartaoAcesso";
import Button from "../components/ui/Button";

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
    <CartaoAcesso>
      <div className="text-center">
        <h1 className="text-headline font-bold tracking-[-0.035em] text-charcoal">Convite de organização</h1>

        {loading && <p className="mt-3 text-body-sm text-graytext">Carregando…</p>}

        {!loading && !user && (
          <>
            <p className="mt-3 text-body-sm text-graytext">
              Faça login ou crie sua conta para aceitar o convite. Depois, abra este mesmo link de novo.
            </p>
            <Button to="/entrar" size="lg" block className="mt-6">
              Ir para o login
            </Button>
          </>
        )}

        {status === "working" && <p className="mt-3 text-body-sm text-graytext">Aceitando convite…</p>}

        {status === "done" && (
          <>
            <p className="mt-3 text-body-sm text-graytext">
              Pronto! Você agora faz parte de <b className="text-charcoal">{result.organization_name}</b>.
            </p>
            <Button to="/app/organizacao" size="lg" block className="mt-6">
              Ver organização
            </Button>
          </>
        )}

        {status === "error" && <p className="mt-3 text-body-sm text-danger-text">{error}</p>}
      </div>
    </CartaoAcesso>
  );
}

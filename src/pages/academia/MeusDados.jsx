import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";
import { useAcessoCanal } from "../../lib/AcessoCanal";

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none";

// O parceiro corrige o próprio nome, WhatsApp e CRECI. Imobiliária e papel
// continuam sendo decisão da coordenação, por isso aparecem só para leitura.
export default function MeusDados() {
  const { user } = useAuth();
  const { acesso, reload } = useAcessoCanal();
  const [f, setF] = useState(null);
  const [erro, setErro] = useState("");
  const [salvo, setSalvo] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pc_acessos")
      .select("nome, whatsapp, creci")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setF({ nome: data?.nome ?? "", whatsapp: data?.whatsapp ?? "", creci: data?.creci ?? "" }),
      );
  }, [user]);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (!acesso) return <Navigate to="/app/academia" replace />;

  const set = (nome) => (e) => {
    setSalvo(false);
    setF((x) => ({ ...x, [nome]: e.target.value }));
  };

  async function salvar(e) {
    e.preventDefault();
    if (!f.nome.trim()) return setErro("Informe o seu nome.");
    if (f.whatsapp.replace(/\D/g, "").length < 10) return setErro("Informe o seu WhatsApp com DDD.");
    setErro("");
    setBusy(true);
    const { error } = await supabase.rpc("pc_atualizar_meus_dados", {
      p_nome: f.nome.trim(),
      p_whatsapp: f.whatsapp.trim(),
      p_creci: f.creci.trim() || null,
    });
    setBusy(false);
    if (error) return setErro(error.message || "Não consegui salvar agora. Tente de novo.");
    setSalvo(true);
    reload();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-5 pb-24 md:pb-10">
      <Link to="/app/academia" className="text-sm text-graytext underline">
        ← Voltar
      </Link>
      <h1 className="mt-3 text-xl font-bold text-charcoal">Meus dados na Academia</h1>
      <p className="mt-1 text-sm text-graytext">
        É com esses dados que a coordenação e a sua imobiliária falam com você.
      </p>

      {f === null ? (
        <p className="mt-6 text-sm text-muted">Carregando…</p>
      ) : (
        <form onSubmit={salvar} noValidate className="mt-5 space-y-3">
          <div>
            <label htmlFor="md-nome" className="block text-xs font-medium text-graytext">
              Nome completo
            </label>
            <input id="md-nome" value={f.nome} onChange={set("nome")} autoComplete="name" className={campo} />
          </div>
          <div>
            <label htmlFor="md-zap" className="block text-xs font-medium text-graytext">
              WhatsApp
            </label>
            <input
              id="md-zap"
              value={f.whatsapp}
              onChange={set("whatsapp")}
              inputMode="tel"
              autoComplete="tel"
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="md-creci" className="block text-xs font-medium text-graytext">
              CRECI (opcional)
            </label>
            <input id="md-creci" value={f.creci} onChange={set("creci")} className={campo} />
          </div>

          <p className="rounded-[10px] bg-slate-100 px-3 py-2 text-[12.5px] text-graytext">
            Imobiliária: <b>{acesso.parceira || "Autônomo"}</b>. Para trocar de imobiliária, fale com a coordenação de
            parcerias.
          </p>

          {erro && (
            <p role="alert" className="text-sm text-rose-700">
              {erro}
            </p>
          )}
          {salvo && (
            <p role="status" className="text-sm font-semibold text-emerald-700">
              Dados salvos.
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Salvar"}
          </button>
        </form>
      )}
    </div>
  );
}

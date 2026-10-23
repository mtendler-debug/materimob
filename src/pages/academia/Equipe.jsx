import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { haQuanto } from "../../lib/academiaUtil";
import { descreverAtividade, estaParado, ultimoAcessoTexto } from "../../lib/atividades";

// Minha equipe: o gestor da imobiliária vê a atividade, o treinamento e os
// registros dos corretores da própria imobiliária, e de nenhuma outra.
export default function Equipe() {
  const { acesso } = useAcessoCanal();
  const navigate = useNavigate();
  const [equipe, setEquipe] = useState(null);
  const [membro, setMembro] = useState(null);
  const [eventos, setEventos] = useState(null);

  const gestor = acesso?.status === "liberado" && acesso.papel === "gestor";

  useEffect(() => {
    if (!gestor) return;
    supabase.rpc("pc_resumo_corretores", { p_parceira: null }).then(({ data }) => setEquipe((data ?? []).filter((c) => c.status === "liberado")));
  }, [gestor]);

  useEffect(() => {
    if (!membro) return;
    setEventos(null);
    supabase.rpc("pc_linha_do_tempo", { p_usuario: membro.user_id, p_limite: 30 }).then(({ data }) => setEventos(data ?? []));
  }, [membro]);

  if (acesso === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (!gestor) return <Navigate to="/app/academia" replace />;

  const soma = (k) => (equipe ?? []).reduce((a, c) => a + Number(c[k]), 0);

  if (membro) {
    return (
      <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
        <button onClick={() => setMembro(null)} className="inline-flex min-h-9 items-center text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
          ← Minha equipe
        </button>
        <h1 className="mt-2 text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal">{membro.nome}</h1>
        <p className="mt-0.5 text-sm text-graytext">
          {membro.papel === "gestor" ? "Gestor" : "Corretor"} · último acesso {ultimoAcessoTexto(membro.ultimo_acesso)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Numero v={membro.envios} r="Kits enviados" />
          <Numero v={membro.clientes_abriram} r="Clientes abriram" />
          <Numero v={membro.aulas} r="Aulas concluídas" />
          <Numero v={membro.registros} r="Registros" />
        </div>
        <h2 className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Linha do tempo</h2>
        {eventos === null && <p className="text-sm text-muted">Carregando…</p>}
        {eventos?.length === 0 && <p className="text-sm text-graytext">Ainda sem atividade.</p>}
        <ul className="ml-1.5 border-l-2 border-slate-200/70">
          {eventos?.map((e) => (
            <li key={e.id} className="relative pb-3 pl-4 text-[13px] text-slate-700">
              <span className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-brand" />
              {descreverAtividade(e)}
              <small className="block text-[11.5px] text-muted">{haQuanto(e.criado_em)}</small>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.035em] text-charcoal">Minha equipe</h1>
      <p className="mt-1 text-sm text-graytext">
        {acesso.parceira} · {equipe ? `${equipe.length} ${equipe.length === 1 ? "pessoa" : "pessoas"}` : "carregando…"}
      </p>

      {equipe && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Numero v={soma("envios")} r="Kits enviados" />
            <Numero v={soma("clientes_abriram")} r="Clientes abriram" />
            <Numero v={soma("certificados")} r="Certificados" />
            <Numero v={soma("registros")} r="Registros" />
          </div>

          <h2 className="mb-1.5 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Pessoas</h2>
          {equipe.map((c) => {
            const parado = estaParado(c.ultimo_acesso);
            return (
              <button
                key={c.user_id}
                onClick={() => setMembro(c)}
                className="mt-2 block w-full rounded-card border border-slate-200/70 bg-white px-3.5 py-3 text-left hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <b className="text-sm text-charcoal">{c.nome}</b>
                  <span
                    className={`rounded-full border px-2 py-px text-[11.5px] font-semibold ${
                      parado ? "border-slate-300 bg-slate-100 text-slate-600" : "border-sky-300 bg-sky-100 text-sky-800"
                    }`}
                  >
                    {parado ? "Parado" : "Ativo"}
                  </span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-graytext">
                  {c.papel === "gestor" ? "Gestor" : "Corretor"} · último acesso {ultimoAcessoTexto(c.ultimo_acesso)}
                </div>
                <div className="mt-1.5 flex justify-between gap-2 text-xs text-graytext">
                  <span>
                    {c.envios} envios · {c.aulas} aulas · {c.certificados} cert.
                  </span>
                  <span>{c.registros} registros</span>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => navigate("/app/academia/clientes", { state: { escopo: "equipe" } })}
            className="mt-4 w-full rounded-control border border-slate-300 bg-white px-4 py-[11px] text-sm font-bold text-slate-700"
          >
            Ver registros da equipe
          </button>
          <Link to="/app/academia" className="mt-3 flex min-h-11 items-center justify-center text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
            Voltar ao Início
          </Link>
        </>
      )}
    </div>
  );
}

function Numero({ v, r }) {
  return (
    <div className="rounded-card border border-slate-200/70 bg-white px-3 py-2.5">
      <b className="block text-[22px] leading-tight text-charcoal tabular-nums">{v}</b>
      <span className="text-xs text-graytext">{r}</span>
    </div>
  );
}

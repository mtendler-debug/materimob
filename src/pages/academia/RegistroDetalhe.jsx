import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAcessoCanal } from "../../lib/AcessoCanal";
import { linkWhatsapp } from "../../lib/academiaUtil";
import {
  diasRestantes,
  EXPLICACAO,
  estaVivo,
  mascaraCpf,
  situacaoEfetiva,
  STATUS_REGISTRO,
  TEXTO_EVENTO,
  TOM_STATUS,
} from "../../lib/registros";

const PERFIL_LABELS = { investidor: "Investidor", moradia: "Moradia", estudante: "Estudante", outro: "Outro" };

// Acompanhar um registro: situação em palavras simples, linha do tempo e os
// dados que o próprio corretor informou.
export default function RegistroDetalhe() {
  const { id } = useParams();
  const { acesso } = useAcessoCanal();
  const navigate = useNavigate();
  const [r, setR] = useState(undefined);
  const [eventos, setEventos] = useState([]);

  useEffect(() => {
    if (acesso?.status !== "liberado") return;
    (async () => {
      let achado = (await supabase.rpc("pc_meus_registros", { p_escopo: "meus" })).data?.find((x) => x.id === id);
      if (!achado && acesso.papel === "gestor") {
        achado = (await supabase.rpc("pc_meus_registros", { p_escopo: "equipe" })).data?.find((x) => x.id === id);
      }
      setR(achado ?? null);
      if (achado) {
        const { data } = await supabase.rpc("pc_eventos_do_registro", { p_registro: id });
        setEventos(data ?? []);
      }
    })();
  }, [id, acesso?.status, acesso?.papel]);

  if (acesso === undefined || r === undefined) return <p className="p-6 text-sm text-muted">Carregando…</p>;
  if (acesso?.status !== "liberado") return <Navigate to="/app/academia" replace />;
  if (r === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-graytext">Este registro não está disponível.</p>
        <Link to="/app/academia/clientes" className="mt-3 inline-flex min-h-9 items-center text-body-sm font-semibold text-brand hover:underline">
          Ver clientes registrados
        </Link>
      </div>
    );
  }

  const s = situacaoEfetiva(r);
  const vivo = estaVivo(s);
  const dias = diasRestantes(r);
  const ate = new Date(r.valido_ate).toLocaleDateString("pt-BR");
  const zap = linkWhatsapp(r.cliente_telefone);
  const linhas = [
    ["WhatsApp", zap ? <a href={zap} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">{r.cliente_telefone}</a> : r.cliente_telefone],
    r.cliente_email && ["E-mail", r.cliente_email],
    mascaraCpf(r.cpf_final) && ["CPF", mascaraCpf(r.cpf_final)],
    ["Origem", [r.cidade_origem, r.uf_origem].filter(Boolean).join(" / ") || "Não informada"],
    ["Perfil", PERFIL_LABELS[r.perfil] ?? "Não informado"],
    ["Registrado em", new Date(r.registrado_em).toLocaleDateString("pt-BR")],
    !r.e_meu && r.corretor_nome && ["Corretor", r.corretor_nome],
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-xl px-4 py-5 pb-24 md:pb-10">
      <Link to="/app/academia/clientes" className="inline-flex min-h-9 items-center text-body-sm font-semibold text-graytext transition-colors hover:text-charcoal">
        ← Clientes registrados
      </Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold leading-tight text-charcoal">{r.cliente_nome}</h1>
        <span className={`whitespace-nowrap rounded-full border px-2 py-px text-[11.5px] font-semibold ${TOM_STATUS[s]}`}>{STATUS_REGISTRO[s]}</span>
      </div>
      <div className="mt-0.5 text-sm text-graytext">{r.projeto}</div>

      <p className="mt-3 rounded-control bg-slate-100 px-3 py-2.5 text-[13px] text-slate-700">
        {EXPLICACAO[s]}
        {vivo && (
          <b>
            {" "}
            Vale até {ate} ({dias} {dias === 1 ? "dia" : "dias"}).
          </b>
        )}
        {s === "registrado" && r.protocolo && <> Protocolo {r.protocolo}.</>}
      </p>

      {r.alerta && s !== "venda" && (
        <p className="mt-3 rounded-card border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          <b>Alerta de elegibilidade</b>
          <br />
          {r.alerta}
        </p>
      )}

      <h2 className="mb-2 mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Linha do tempo</h2>
      <ul className="ml-1.5 border-l-2 border-slate-200/70">
        {eventos.map((e, i) => (
          <li key={i} className="relative pb-3 pl-4 text-[13px] text-slate-700">
            <span
              className={`absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full ${
                e.tipo === "venda" ? "bg-emerald-800" : ["conflito", "expirado", "cancelado"].includes(e.tipo) ? "bg-rose-700" : "bg-brand"
              }`}
            />
            {e.descricao || TEXTO_EVENTO[e.tipo] || e.tipo}
            <small className="block text-[11.5px] text-muted">{new Date(e.criado_em).toLocaleDateString("pt-BR")}</small>
          </li>
        ))}
      </ul>

      <h2 className="mb-1.5 mt-4 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Dados do cliente</h2>
      <dl className="divide-y divide-slate-100 rounded-card border border-slate-200/70 bg-white px-3.5 text-[13px]">
        {linhas.map(([rotulo, valor]) => (
          <div key={rotulo} className="flex justify-between gap-3 py-2">
            <dt className="flex-none text-graytext">{rotulo}</dt>
            <dd className="text-right font-semibold text-charcoal">{valor}</dd>
          </div>
        ))}
      </dl>

      {s === "expirado" && (
        <button
          onClick={() =>
            navigate("/app/academia/clientes/novo", {
              state: {
                prefill: {
                  nome: r.cliente_nome,
                  zap: r.cliente_telefone,
                  cidade: r.cidade_origem ?? "",
                  uf: r.uf_origem ?? "",
                  perfil: r.perfil ?? "",
                  projeto: r.empreendimento_id,
                },
              },
            })
          }
          className="mt-4 w-full min-h-11 rounded-control bg-brand px-4 py-[11px] text-sm font-bold text-white"
        >
          Registrar de novo
        </button>
      )}
    </div>
  );
}

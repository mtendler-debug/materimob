import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export const STATUS_REGISTRO_LABELS = {
  pendente: "Pendente",
  registrado: "Registrado",
  conflito: "Em conflito",
  visita: "Visita",
  proposta: "Proposta",
  venda: "Venda",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

const TABS = [
  { key: "pendentes", label: "Pendentes" },
  { key: "vigentes", label: "Vigentes" },
  { key: "conflito", label: "Em conflito" },
  { key: "vencendo", label: "Vencendo em 15 dias" },
  { key: "todos", label: "Todos" },
];

export default function Registros() {
  const [registros, setRegistros] = useState(null);
  const [tab, setTab] = useState("pendentes");

  async function load() {
    const { data } = await supabase
      .from("pc_registros_cliente")
      .select(
        "*, pc_parceiras(nome_fantasia), pc_parceira_corretores(nome), pc_empreendimentos(nome)",
      )
      .order("registrado_em", { ascending: false });
    setRegistros(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const em15dias = new Date();
  em15dias.setDate(em15dias.getDate() + 15);

  const visiveis = (registros ?? []).filter((r) => {
    if (tab === "pendentes") return r.status === "pendente";
    if (tab === "conflito") return r.status === "conflito";
    if (tab === "vigentes") return ["registrado", "visita", "proposta"].includes(r.status);
    if (tab === "vencendo")
      return (
        ["pendente", "registrado", "visita", "proposta"].includes(r.status) &&
        r.valido_ate &&
        new Date(r.valido_ate) <= em15dias
      );
    return true;
  });

  return (
    <div>
      <div className="mt-4 flex flex-wrap gap-1 border-b border-rule">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 border-b-2 px-3 pb-2 text-sm font-bold ${
              tab === t.key ? "border-gold text-charcoal" : "border-transparent text-graytext hover:text-charcoal"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {registros === null && <p className="text-sm text-muted">Carregando…</p>}
        {registros && visiveis.length === 0 && <p className="text-sm text-muted">Nada aqui.</p>}
        {visiveis.map((r) => (
          <RegistroCard key={r.id} registro={r} todos={registros} onChange={load} />
        ))}
      </div>
    </div>
  );
}

function RegistroCard({ registro: r, todos, onChange }) {
  const [busy, setBusy] = useState(false);

  async function validar() {
    setBusy(true);
    await supabase.from("pc_registros_cliente").update({ status: "registrado" }).eq("id", r.id);
    await supabase.from("pc_registro_eventos").insert({
      owner_id: r.owner_id,
      registro_id: r.id,
      tipo: "validado",
      criado_por: "marcos",
    });
    setBusy(false);
    onChange();
  }

  async function marcarProtocolo() {
    const protocolo = window.prompt("Número do protocolo na incorporadora:");
    if (!protocolo || !protocolo.trim()) return;
    setBusy(true);
    await supabase
      .from("pc_registros_cliente")
      .update({
        protocolo_incorporadora: protocolo.trim(),
        registrado_na_incorporadora_em: new Date().toISOString(),
      })
      .eq("id", r.id);
    setBusy(false);
    onChange();
  }

  async function avancar(novoStatus) {
    if (!window.confirm(`Avançar este registro para "${STATUS_REGISTRO_LABELS[novoStatus]}"?`)) return;
    setBusy(true);
    await supabase.from("pc_registros_cliente").update({ status: novoStatus }).eq("id", r.id);
    await supabase.from("pc_registro_eventos").insert({
      owner_id: r.owner_id,
      registro_id: r.id,
      tipo: novoStatus,
      criado_por: "marcos",
    });
    setBusy(false);
    onChange();
  }

  async function cancelar() {
    const nota = window.prompt("Motivo do cancelamento (obrigatório):");
    if (!nota || !nota.trim()) return;
    setBusy(true);
    await supabase.from("pc_registros_cliente").update({ status: "cancelado" }).eq("id", r.id);
    await supabase.from("pc_registro_eventos").insert({
      owner_id: r.owner_id,
      registro_id: r.id,
      tipo: "cancelado",
      descricao: nota.trim(),
      criado_por: "marcos",
    });
    setBusy(false);
    onChange();
  }

  async function resolverConflito(vencedorId) {
    const nota = window.prompt("Nota sobre a decisão (obrigatório):");
    if (!nota || !nota.trim()) return;
    setBusy(true);
    const perdedorId = vencedorId === r.id ? r.conflito_com_registro_id : r.id;
    await supabase.from("pc_registros_cliente").update({ status: "registrado" }).eq("id", vencedorId);
    await supabase
      .from("pc_registros_cliente")
      .update({ status: "cancelado" })
      .eq("id", perdedorId);
    await supabase.from("pc_registro_eventos").insert([
      { owner_id: r.owner_id, registro_id: vencedorId, tipo: "validado", descricao: nota.trim(), criado_por: "marcos" },
      { owner_id: r.owner_id, registro_id: perdedorId, tipo: "cancelado", descricao: nota.trim(), criado_por: "marcos" },
    ]);
    setBusy(false);
    onChange();
  }

  const conflitante = r.status === "conflito" ? todos.find((x) => x.id === r.conflito_com_registro_id) : null;

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-serif font-semibold text-charcoal">
            {r.cliente_nome} {r.cliente_cpf_final && <span className="text-xs text-graytext">CPF ***{r.cliente_cpf_final}</span>}
          </p>
          <p className="text-xs text-graytext">{r.cliente_telefone}</p>
        </div>
        <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
          {STATUS_REGISTRO_LABELS[r.status] ?? r.status}
        </span>
      </div>

      <p className="mt-2 text-xs text-graytext">
        {r.pc_parceiras?.nome_fantasia}
        {r.pc_parceira_corretores?.nome ? ` · corretor ${r.pc_parceira_corretores.nome}` : ""}
        {r.pc_empreendimentos?.nome ? ` · ${r.pc_empreendimentos.nome}` : ""}
        {r.perfil ? ` · ${r.perfil}` : ""}
      </p>

      {r.elegibilidade_alerta && (
        <p className="mt-2 rounded-[9px] bg-light p-2 text-xs text-[#B26A00]">⚠ {r.elegibilidade_alerta}</p>
      )}

      <p className="mt-2 text-xs text-graytext">
        Validade: {r.valido_ate ? new Date(r.valido_ate).toLocaleDateString("pt-BR") : "—"} ·{" "}
        {r.protocolo_incorporadora ? (
          <span>protocolo na incorporadora: {r.protocolo_incorporadora}</span>
        ) : (
          <b className="text-[#B34A2E]">não registrado na incorporadora</b>
        )}
      </p>

      {conflitante && (
        <div className="mt-2 rounded-[9px] border border-rule bg-light p-3 text-xs">
          <p className="font-bold text-charcoal">Conflita com um registro já vigente:</p>
          <p className="text-graytext">
            {conflitante.cliente_nome} · {conflitante.pc_parceiras?.nome_fantasia} ·{" "}
            {new Date(conflitante.registrado_em).toLocaleDateString("pt-BR")}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => resolverConflito(r.id)}
              disabled={busy}
              className="rounded-[8px] bg-charcoal px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Este prevalece
            </button>
            <button
              onClick={() => resolverConflito(conflitante.id)}
              disabled={busy}
              className="rounded-[8px] border-[1.5px] border-rule px-3 py-1.5 text-[11px] font-bold text-charcoal"
            >
              O outro prevalece
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {r.status === "pendente" && (
          <ActionButton onClick={validar} disabled={busy} label="Validar" />
        )}
        {!r.protocolo_incorporadora && ["pendente", "registrado", "visita", "proposta"].includes(r.status) && (
          <ActionButton onClick={marcarProtocolo} disabled={busy} label="Marcar registrado na incorporadora" />
        )}
        {r.status === "registrado" && <ActionButton onClick={() => avancar("visita")} disabled={busy} label="Avançar p/ visita" />}
        {r.status === "visita" && <ActionButton onClick={() => avancar("proposta")} disabled={busy} label="Avançar p/ proposta" />}
        {r.status === "proposta" && <ActionButton onClick={() => avancar("venda")} disabled={busy} label="Avançar p/ venda" />}
        {!["cancelado", "venda", "expirado"].includes(r.status) && (
          <button onClick={cancelar} disabled={busy} className="text-xs font-bold text-[#B34A2E] underline">
            cancelar
          </button>
        )}
      </div>
    </div>
  );
}

function ActionButton({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-[8px] border-[1.5px] border-rule bg-white px-3 py-1.5 text-[11.5px] font-bold text-charcoal hover:border-gold disabled:opacity-50"
    >
      {label}
    </button>
  );
}

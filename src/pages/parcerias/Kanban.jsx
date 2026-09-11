import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { supabase } from "../../lib/supabase";
import { STATUS_FUNIL_LABELS, PrioridadeChip } from "./Parceiras";

const STATUS_FUNIL_COLORS = {
  nao_contatado: "#9A9A9A",
  contato_iniciado: "#1565C0",
  reuniao_agendada: "#1565C0",
  em_negociacao: "#B26A00",
  parceria_firmada: "#2E7D32",
  sem_interesse: "#B34A2E",
  pausado: "#5C5C5C",
};

const COLUNAS = Object.keys(STATUS_FUNIL_LABELS);

export default function Kanban() {
  const [parceiras, setParceiras] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [pendente, setPendente] = useState(null); // { parceira, novoStatus }

  async function load() {
    const { data } = await supabase
      .from("pc_parceiras")
      .select("id, nome_fantasia, cidade, praca, segmento_foco, prioridade, status_funil, responsavel_nome, responsavel_telefone, ultimo_contato_em, validado")
      .order("nome_fantasia");
    setParceiras(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  if (!parceiras) return <p className="mt-4 text-sm text-muted">Carregando…</p>;

  const visiveis = parceiras.filter((p) => p.validado);
  const invalidadas = parceiras.filter((p) => !p.validado);
  const active = parceiras.find((p) => p.id === activeId);

  function handleDragStart(e) {
    setActiveId(e.active.id);
  }

  function handleDragEnd(e) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const parceira = parceiras.find((p) => p.id === active.id);
    if (parceira && parceira.status_funil !== over.id) {
      setPendente({ parceira, novoStatus: over.id });
    }
  }

  return (
    <div>
      {invalidadas.length > 0 && (
        <div className="mt-4 rounded-[12px] border-[1.5px] border-gold bg-light p-3 text-sm text-charcoal">
          <b>{invalidadas.length}</b> parceira(s) aguardam validação e não aparecem aqui —{" "}
          <Link to="/app/parcerias/parceiras" className="underline">
            ver na lista
          </Link>
          .
        </div>
      )}

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="mt-4 flex gap-3 overflow-x-auto pb-4">
          {COLUNAS.map((status) => (
            <Coluna
              key={status}
              status={status}
              parceiras={visiveis.filter((p) => p.status_funil === status)}
            />
          ))}
        </div>

        <DragOverlay>{active ? <Cartao parceira={active} overlay /> : null}</DragOverlay>
      </DndContext>

      {pendente && (
        <ModalMudarStatus
          parceira={pendente.parceira}
          novoStatus={pendente.novoStatus}
          onCancel={() => setPendente(null)}
          onDone={() => {
            setPendente(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Coluna({ status, parceiras }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const cor = STATUS_FUNIL_COLORS[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[264px] shrink-0 flex-col overflow-hidden rounded-[16px] border transition-colors ${
        isOver ? "border-gold" : "border-rule"
      }`}
      style={{ background: isOver ? `${cor}14` : "#FBFAF8" }}
    >
      <div className="h-[3px] shrink-0" style={{ background: cor }} />
      <div className="flex items-center gap-[7px] px-3 pt-[10px] pb-[9px]">
        <p className="text-[11px] font-bold uppercase tracking-[.09em] text-graytext">
          {STATUS_FUNIL_LABELS[status]}
        </p>
        <span
          className="ml-auto rounded-full px-[8px] py-[1px] text-[10.5px] font-bold"
          style={{ background: `${cor}1F`, color: cor }}
        >
          {parceiras.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 px-2 pb-2">
        {parceiras.map((p) => (
          <Cartao key={p.id} parceira={p} />
        ))}
        {parceiras.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-rule py-6 text-center text-[11px] text-muted">
            arraste aqui
          </div>
        )}
      </div>
    </div>
  );
}

function diasSemContato(data) {
  if (!data) return null;
  const dias = Math.floor((Date.now() - new Date(data).getTime()) / (1000 * 60 * 60 * 24));
  return dias;
}

const PRIORIDADE_ACCENT = { alta: "#2E7D32", media: "#B26A00", baixa: "#C9C4B8" };

function Cartao({ parceira: p, overlay }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: p.id, disabled: overlay });
  const dias = diasSemContato(p.ultimo_contato_em);
  const accent = PRIORIDADE_ACCENT[p.prioridade] ?? "transparent";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ borderLeftColor: accent }}
      className={`group rounded-[12px] border border-l-[3px] bg-white p-3 transition-all ${
        overlay
          ? "rotate-[1.5deg] border-gold"
          : `cursor-grab border-rule active:cursor-grabbing ${isDragging ? "opacity-30" : "hover:border-gold"}`
      }`}
    >
      <Link
        to={`/app/parcerias/parceiras/${p.id}`}
        onClick={(e) => (isDragging || overlay) && e.preventDefault()}
        className="font-serif block text-[14.5px] font-semibold leading-tight text-charcoal group-hover:underline"
      >
        {p.nome_fantasia}
      </Link>
      <p className="mt-[3px] text-[11.5px] text-graytext">
        {[p.cidade, p.praca].filter(Boolean).join(" · ") || "—"}
      </p>

      {p.segmento_foco && (
        <p className="mt-[7px] line-clamp-2 text-[11.5px] leading-snug text-graytext">{p.segmento_foco}</p>
      )}

      <div className="mt-[9px] flex flex-wrap items-center gap-[6px]">
        <PrioridadeChip prioridade={p.prioridade} />
        {dias !== null && (
          <span
            className={`rounded-full px-[8px] py-[2px] text-[10px] font-bold ${
              dias > 14 ? "bg-[#F1E4E0] text-[#B34A2E]" : "bg-light text-graytext"
            }`}
          >
            {dias === 0 ? "contato hoje" : `${dias}d sem contato`}
          </span>
        )}
      </div>

      {(p.responsavel_nome || p.responsavel_telefone) && (
        <p className="mt-[7px] truncate text-[10.5px] text-muted">
          {[p.responsavel_nome, p.responsavel_telefone].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function ModalMudarStatus({ parceira, novoStatus, onCancel, onDone }) {
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmar() {
    if (!nota.trim()) return setError("Escreva uma observação explicando a mudança.");
    setBusy(true);
    setError("");
    const { error: updateError } = await supabase
      .from("pc_parceiras")
      .update({ status_funil: novoStatus })
      .eq("id", parceira.id);
    if (updateError) {
      setBusy(false);
      return setError(updateError.message);
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("pc_parceira_observacoes").insert({
      owner_id: user.id,
      parceira_id: parceira.id,
      texto: `Status alterado para "${STATUS_FUNIL_LABELS[novoStatus]}". ${nota.trim()}`,
    });
    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-[16px] border border-rule bg-white p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[.09em] text-graytext">{parceira.nome_fantasia}</p>
        <h3 className="font-serif mt-1 text-[17px] font-semibold text-charcoal">
          Mover para "{STATUS_FUNIL_LABELS[novoStatus]}"
        </h3>
        <label className="mt-3 mb-[6px] block text-[13px] font-semibold text-charcoal">
          O que motivou a mudança (obrigatório)
        </label>
        <textarea
          autoFocus
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={3}
          className="w-full rounded-[9px] border border-rule bg-white p-3 text-sm"
        />
        {error && <p className="mt-2 text-xs text-[#B34A2E]">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={confirmar}
            disabled={busy}
            className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Salvando…" : "Confirmar"}
          </button>
          <button onClick={onCancel} className="rounded-[10px] px-4 py-2 text-sm font-bold text-graytext underline">
            cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  useLeadsWithOpportunities,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  OPP_TYPE_LABELS,
  OPP_TYPE_COLORS,
  OPP_STAGE_ATIVA,
  brl,
} from "../../lib/crm";

const COR_ETAPA = { lead: "#94a3b8", qualificacao: "#0284c7", visita: "#6366f1", proposta: "#d97706", fechamento: "#10b981" };

function iniciais(nome) {
  return (nome || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export default function Pipeline() {
  const { leads, error, reload } = useLeadsWithOpportunities();
  const [menuId, setMenuId] = useState(null);

  // O menu "⋯" fecha ao clicar fora ou apertar Esc.
  useEffect(() => {
    if (!menuId) return;
    const fechar = () => setMenuId(null);
    const tecla = (e) => e.key === "Escape" && fechar();
    document.addEventListener("click", fechar);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("click", fechar);
      document.removeEventListener("keydown", tecla);
    };
  }, [menuId]);

  async function moverEtapa(leadId, stage) {
    await supabase.from("av_leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", leadId);
    reload();
  }

  if (error) return <p className="text-sm text-danger-text">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over) return;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.stage !== over.id) moverEtapa(lead.id, over.id);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="-mx-4 grid snap-x snap-proximity grid-cols-[repeat(5,82%)] gap-3 overflow-x-auto px-4 pb-10 md:-mx-7 md:grid-cols-[repeat(5,minmax(220px,1fr))] md:px-7">
        {LEAD_STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            leads={leads.filter((l) => l.stage === stage)}
            menuId={menuId}
            setMenuId={setMenuId}
            onMover={(leadId, destino) => {
              setMenuId(null);
              moverEtapa(leadId, destino);
            }}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ stage, leads, menuId, setMenuId, onMover }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const volume = leads
    .flatMap((l) => l.av_opportunities ?? [])
    .filter((o) => OPP_STAGE_ATIVA(o.stage))
    .reduce((s, o) => s + (o.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[420px] snap-start rounded-[20px] border-2 p-2.5 transition-all duration-200 ease-out ${
        isOver ? "border-sky-300 bg-brand-soft" : "border-transparent bg-light"
      }`}
    >
      <div className="flex items-center gap-2 px-2 pt-1.5 pb-3">
        <i className="h-2 w-2 rounded-full" style={{ background: COR_ETAPA[stage] }} />
        <b className="text-body-sm text-charcoal">{LEAD_STAGE_LABELS[stage]}</b>
        <small className="ml-auto text-right text-caption leading-tight text-graytext">
          {leads.length} lead(s)
          <br />
          {brl(volume)}
        </small>
      </div>
      <div className="space-y-2">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} menuAberto={menuId === l.id} setMenuId={setMenuId} onMover={onMover} />
        ))}
        {leads.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-slate-300 px-2 py-5 text-center text-caption text-muted">
            Solte um lead aqui
          </div>
        )}
      </div>
    </div>
  );
}

function LeadCard({ lead, menuAberto, setMenuId, onMover }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;
  const opps = lead.av_opportunities ?? [];
  const total = opps.reduce((s, o) => s + (o.value ?? 0), 0);
  const cruzada = opps.some((o) => o.type === "compra") && opps.some((o) => o.type === "venda");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`relative cursor-grab rounded-2xl bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,.05)] transition-shadow duration-200 hover:shadow-soft ${isDragging ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-brand-soft text-xs font-semibold text-sky-800">
          {iniciais(lead.av_clients?.name)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/app/crm/leads/${lead.id}`}
            onClick={(e) => isDragging && e.preventDefault()}
            className="block truncate text-body-sm leading-tight font-semibold text-charcoal hover:underline"
          >
            {lead.av_clients?.name}
          </Link>
          {lead.av_clients?.phone && <p className="truncate text-caption text-graytext">{lead.av_clients.phone}</p>}
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setMenuId(menuAberto ? null : lead.id);
          }}
          aria-label={`Mover ${lead.av_clients?.name}`}
          aria-expanded={menuAberto}
          className="grid h-9 w-9 flex-none place-items-center rounded-[10px] text-muted transition-all duration-200 hover:bg-light hover:text-charcoal"
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="5" r="1.3" />
            <circle cx="12" cy="12" r="1.3" />
            <circle cx="12" cy="19" r="1.3" />
          </svg>
        </button>
      </div>

      {opps.length > 0 && (
        <>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {opps.map((o) => (
              <span
                key={o.id}
                className="rounded-full px-2 py-px text-[11.5px] font-semibold"
                style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
              >
                {OPP_TYPE_LABELS[o.type]}
              </span>
            ))}
            {cruzada && <span className="rounded-full bg-orange-100 px-2 py-px text-[11.5px] font-semibold text-orange-800">2 negócios</span>}
          </div>
          <div className="mt-2 flex justify-between text-[12.5px]">
            <span className="text-muted">{opps.length} oportunidade(s)</span>
            <span className="font-semibold text-slate-700 tabular-nums">{brl(total)}</span>
          </div>
        </>
      )}

      {menuAberto && (
        <div
          role="menu"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-12 right-1.5 z-20 min-w-[190px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-float"
        >
          <p className="mx-3 mt-1 mb-0.5 text-[11px] font-semibold tracking-[.08em] text-muted uppercase">Mover para</p>
          {LEAD_STAGES.map((s) => (
            <button
              key={s}
              disabled={s === lead.stage}
              onClick={() => onMover(lead.id, s)}
              className={`flex min-h-[42px] w-full items-center rounded-[10px] px-3 text-left text-body-sm font-medium ${
                s === lead.stage ? "cursor-default text-muted" : "text-slate-700 hover:bg-light"
              }`}
            >
              {LEAD_STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

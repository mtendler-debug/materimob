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

export default function Pipeline() {
  const { leads, error, reload } = useLeadsWithOpportunities();

  async function moverEtapa(leadId, stage) {
    await supabase.from("av_leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", leadId);
    reload();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!leads) return <p className="text-sm text-muted">Carregando…</p>;

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over) return;
    const lead = leads.find((l) => l.id === active.id);
    if (lead && lead.stage !== over.id) moverEtapa(lead.id, over.id);
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-3 overflow-x-auto sm:grid-cols-5">
        {LEAD_STAGES.map((stage) => (
          <Column key={stage} stage={stage} leads={leads.filter((l) => l.stage === stage)} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ stage, leads }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const volume = leads
    .flatMap((l) => l.av_opportunities ?? [])
    .filter((o) => OPP_STAGE_ATIVA(o.stage))
    .reduce((s, o) => s + (o.value ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] rounded-[14px] border bg-light p-2 ${isOver ? "border-2 border-gold" : "border-rule"}`}
    >
      <div className="mb-2 px-1">
        <p className="text-[11px] font-bold uppercase tracking-[.1em] text-graytext">{LEAD_STAGE_LABELS[stage]}</p>
        <p className="text-[10.5px] text-muted">
          {leads.length} lead(s) · {brl(volume)}
        </p>
      </div>
      <div className="space-y-2">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-[10px] border border-rule bg-white p-2 ${isDragging ? "opacity-60" : ""}`}
    >
      <Link to={`/app/crm/leads/${lead.id}`} onClick={(e) => isDragging && e.preventDefault()} className="font-serif text-sm font-semibold text-charcoal hover:underline">
        {lead.av_clients?.name}
      </Link>
      {lead.av_clients?.phone && <p className="text-xs text-graytext">{lead.av_clients.phone}</p>}
      {(lead.av_opportunities ?? []).length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {lead.av_opportunities.map((o) => (
            <span
              key={o.id}
              className="rounded-full px-[7px] py-[1px] text-[9.5px] font-bold"
              style={{ background: OPP_TYPE_COLORS[o.type].bg, color: OPP_TYPE_COLORS[o.type].color }}
            >
              {OPP_TYPE_LABELS[o.type]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

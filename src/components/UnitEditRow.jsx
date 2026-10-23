import { useState } from "react";
import { ImageUploader } from "./ImageUploader";
import { classesCampo } from "./ui/Input";
import Button from "./ui/Button";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

const STATUS_LABELS = { reservada: "Reservada", vendida: "Vendida" };
const STATUS_CLASSES = {
  reservada: "bg-warning-bg text-warning-text",
  vendida: "bg-danger-bg text-danger-text",
};

// Linha de unidade que abre pra edição — antes disso, nome e valor eram
// fixos assim que cadastrados; a única forma de corrigir era apagar e
// recriar. onSave/onRemove são as mesmas chamadas Supabase que cada tela
// já tinha, só faltava o gatilho de edição. Fotos e condições de
// pagamento são próprias da unidade — ficam em branco por padrão e usam
// as do empreendimento quando não preenchidas (ver PropertyMedia).
// onMarkSold/onRelease são opcionais — Portfolio.jsx e SelectionDetail.jsx
// passam versões diferentes (dono edita a unidade compartilhada direto;
// corretor confirma só a própria reserva via RPC) — ver cada tela.
// canConfirmSale deixa a decisão de "pode confirmar venda agora" pra
// quem chama; sem ele, cai no padrão antigo (status === "reservada").
// onToggleVisited é só do roteiro do corretor — portfólio não tem esse
// conceito.
export function UnitEditRow({ unit, onSave, onRemove, onMarkSold, onRelease, canConfirmSale, onToggleVisited }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const [value, setValue] = useState(unit.table_value ?? "");
  const [photoUrls, setPhotoUrls] = useState(unit.photo_urls ?? []);
  const [paymentTerms, setPaymentTerms] = useState(unit.payment_terms ?? "");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(unit.id, {
      name: name.trim(),
      table_value: value === "" ? null : Number(value),
      photo_urls: photoUrls,
      payment_terms: paymentTerms.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  }

  function cancelar() {
    setName(unit.name);
    setValue(unit.table_value ?? "");
    setPhotoUrls(unit.photo_urls ?? []);
    setPaymentTerms(unit.payment_terms ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-200/70 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${classesCampo} min-w-[160px] flex-1`}
          />
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Valor de tabela"
            className={`${classesCampo} w-36`}
          />
        </div>
        <div className="mt-2">
          <ImageUploader label="Fotos desta unidade" value={photoUrls} onChange={setPhotoUrls} multiple={true} />
        </div>
        <label className="mt-3 mb-1.5 block text-caption font-medium text-graytext">
          Condições de pagamento desta unidade
        </label>
        <textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          rows={2}
          placeholder="Deixe em branco pra usar a condição geral do empreendimento"
          className={`${classesCampo} min-h-[72px] py-2.5`}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={salvar} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancelar}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  const podeConfirmar = onMarkSold && (canConfirmSale ?? unit.status === "reservada");

  return (
    <div className="flex min-h-11 items-center justify-between gap-2 border-t border-slate-100 text-sm text-graytext first:border-0">
      <span className="flex min-w-0 items-center gap-2">
        {onToggleVisited && (
          <input
            type="checkbox"
            checked={!!unit.visited}
            onChange={(e) => onToggleVisited(unit.id, e.target.checked)}
            title="Unidade visitada"
            className="h-[15px] w-[15px] shrink-0 accent-[#0284C7]"
          />
        )}
        <button type="button" onClick={() => setEditing(true)} className="truncate text-left hover:underline">
          {unit.name}
          {(unit.photo_urls?.length > 0 || unit.payment_terms) && (
            <span className="ml-1 text-xs" title="Tem fotos ou condições de pagamento próprias">
              •
            </span>
          )}
        </button>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {unit.table_value != null && <span>{brl(unit.table_value)}</span>}
        {unit.status && unit.status !== "disponivel" && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${STATUS_CLASSES[unit.status]}`}
          >
            {STATUS_LABELS[unit.status]}
            {unit.reserved_for ? ` · ${unit.reserved_for}` : ""}
          </span>
        )}
        <button type="button" onClick={() => setEditing(true)} className="min-h-9 rounded-[9px] px-2 text-xs font-medium text-graytext hover:bg-light hover:text-charcoal">
          editar
        </button>
        {onRemove && (
          <button type="button" onClick={() => onRemove(unit.id)} className="min-h-9 rounded-[9px] px-2 text-xs font-medium text-graytext hover:bg-danger-bg hover:text-danger-text">
            ×
          </button>
        )}
        {podeConfirmar && (
          <button type="button" onClick={() => onMarkSold(unit.id)} className="min-h-9 rounded-[9px] px-2 text-xs font-medium text-success-text hover:bg-success-bg">
            confirmar venda
          </button>
        )}
        {podeConfirmar && onRelease && (
          <button type="button" onClick={() => onRelease(unit.id)} className="min-h-9 rounded-[9px] px-2 text-xs font-medium text-graytext hover:bg-danger-bg hover:text-danger-text">
            desfazer reserva
          </button>
        )}
      </span>
    </div>
  );
}

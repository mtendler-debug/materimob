import { useState } from "react";

function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

// Linha de unidade que abre pra edição — antes disso, nome e valor eram
// fixos assim que cadastrados; a única forma de corrigir era apagar e
// recriar. onSave/onRemove são as mesmas chamadas Supabase que cada tela
// já tinha, só faltava o gatilho de edição.
export function UnitEditRow({ unit, onSave, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(unit.name);
  const [value, setValue] = useState(unit.table_value ?? "");
  const [saving, setSaving] = useState(false);

  async function salvar() {
    if (!name.trim()) return;
    setSaving(true);
    await onSave(unit.id, { name: name.trim(), table_value: value === "" ? null : Number(value) });
    setSaving(false);
    setEditing(false);
  }

  function cancelar() {
    setName(unit.name);
    setValue(unit.table_value ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2 py-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[160px] flex-1 rounded border border-rule px-2 py-1 text-sm"
        />
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valor de tabela"
          className="w-32 rounded border border-rule px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={saving}
          className="rounded bg-charcoal px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving ? "Salvando…" : "salvar"}
        </button>
        <button type="button" onClick={cancelar} className="text-xs font-bold text-graytext underline">
          cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between text-sm text-graytext">
      <button type="button" onClick={() => setEditing(true)} className="text-left hover:underline">
        {unit.name}
      </button>
      <span className="flex items-center gap-2">
        {unit.table_value != null && <span>{brl(unit.table_value)}</span>}
        <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-graytext underline">
          editar
        </button>
        {onRemove && (
          <button type="button" onClick={() => onRemove(unit.id)} className="text-xs font-bold text-[#B34A2E]">
            ×
          </button>
        )}
      </span>
    </div>
  );
}

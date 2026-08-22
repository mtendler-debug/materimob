import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Seletor de modelos de critérios reutilizáveis: o corretor monta a lista de
// critérios que quiser (no bloco de notas dele, se preferir) e salva aqui
// como modelo, pra reaproveitar em outras seleções sem digitar de novo.
export function CriteriaPresets({ criteriaText, onApply }) {
  const [presets, setPresets] = useState([]);
  const [selected, setSelected] = useState("");
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase
      .from("av_criteria_presets")
      .select("id, name, criteria, user_id")
      .order("name");
    setPresets(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function apply(id) {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    if (criteriaText.trim() && !window.confirm(`Substituir os critérios atuais pelos do modelo "${preset.name}"?`)) {
      return;
    }
    onApply(preset.criteria.join("\n"));
    setSelected(id);
    setMsg("");
  }

  async function saveAsNew() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const criteria = criteriaText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!criteria.length) {
      setMsg("Escreva os critérios antes de salvar como modelo.");
      return;
    }
    const { error } = await supabase.from("av_criteria_presets").insert({ name: trimmed, criteria });
    if (error) {
      setMsg("Erro: " + error.message);
      return;
    }
    setMsg(`Modelo "${trimmed}" salvo.`);
    setNaming(false);
    setName("");
    load();
  }

  async function remove() {
    const preset = presets.find((p) => p.id === selected);
    if (!preset) return;
    if (!window.confirm(`Excluir o modelo "${preset.name}"?`)) return;
    await supabase.from("av_criteria_presets").delete().eq("id", preset.id);
    setSelected("");
    load();
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <select
        value={selected}
        onChange={(e) => (e.target.value ? apply(e.target.value) : setSelected(""))}
        className="rounded-[9px] border-[1.5px] border-rule px-2 py-1.5 text-xs text-charcoal"
      >
        <option value="">Usar modelo salvo…</option>
        {presets.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {!p.user_id ? " (modelo do sistema)" : ""}
          </option>
        ))}
      </select>

      {selected && presets.find((p) => p.id === selected)?.user_id && (
        <button type="button" onClick={remove} className="text-xs font-bold text-[#B34A2E]">
          excluir modelo
        </button>
      )}

      {naming ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveAsNew()}
            placeholder="Nome do modelo"
            className="rounded-[9px] border-[1.5px] border-rule px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={saveAsNew}
            className="rounded-[9px] bg-charcoal px-2 py-1 text-xs font-bold text-white"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={() => {
              setNaming(false);
              setName("");
            }}
            className="text-xs text-graytext"
          >
            cancelar
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="text-xs text-graytext underline">
          + salvar critérios atuais como modelo
        </button>
      )}

      {msg && <span className="text-xs text-graytext">{msg}</span>}
    </div>
  );
}

import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { storageKeyFor } from "../lib/storage";

// Upload de imagem pro bucket público "imoveis" — usado tanto pra uma
// planta única (multiple=false) quanto pra uma galeria de fotos
// (multiple=true, value é um array). Quem chama decide como salvar a(s)
// URL(s) nova(s); este componente só cuida do upload em si.
export function ImageUploader({ label, value, onChange, multiple }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  async function enviar(file) {
    setBusy(true);
    setError("");
    const path = storageKeyFor(user.id, file);
    const { error: upError } = await supabase.storage.from("imoveis").upload(path, file);
    if (upError) {
      setBusy(false);
      setError("Erro ao enviar: " + upError.message);
      return;
    }
    const { data } = supabase.storage.from("imoveis").getPublicUrl(path);
    setBusy(false);
    if (multiple) {
      onChange([...(value ?? []), data.publicUrl]);
    } else {
      onChange(data.publicUrl);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function handlePick(e) {
    const file = e.target.files?.[0];
    if (file) enviar(file);
  }

  function remover(url) {
    if (multiple) {
      onChange((value ?? []).filter((u) => u !== url));
    } else {
      onChange(null);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-caption font-medium text-graytext">{label}</label>
      <div className="flex flex-wrap items-center gap-2.5">
        {!multiple && value && (
          <div className="relative">
            <img src={value} alt={label} className="h-16 w-16 rounded-xl border border-slate-200/70 object-cover" />
            <button
              type="button"
              onClick={() => remover(value)}
              className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-xs font-bold text-white shadow-soft transition-all duration-200 hover:bg-slate-700"
            >
              ×
            </button>
          </div>
        )}
        {multiple &&
          (value ?? []).map((url) => (
            <div key={url} className="relative">
              <img src={url} alt={label} className="h-16 w-16 rounded-xl border border-slate-200/70 object-cover" />
              <button
                type="button"
                onClick={() => remover(url)}
                className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-xs font-bold text-white shadow-soft transition-all duration-200 hover:bg-slate-700"
              >
                ×
              </button>
            </div>
          ))}
        {(multiple || !value) && (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 text-lg text-graytext transition-all duration-200 hover:border-brand hover:bg-brand-soft hover:text-sky-800">
            {busy ? "…" : "+"}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={handlePick}
              className="hidden"
            />
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-caption text-danger-text">{error}</p>}
    </div>
  );
}

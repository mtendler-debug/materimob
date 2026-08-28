import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

// Sobe book/tabela (PDF ou imagem) e deixa a Edge Function extract-book
// ler o material com IA — o rascunho volta pra revisão aqui, nada é
// salvo até a pessoa confirmar. Um único componente serve tanto pra
// lançamento quanto pra portfólio: quem chama passa `kind` e os campos
// de dono a mesclar no insert (mesmo padrão do `dono` que Portfolio.jsx
// já usa pra decidir organization_id vs. user_id).
export function BookImporter({ kind, ownerFields, onImported }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState("");
  const [fileUrls, setFileUrls] = useState([]);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  async function handlePick(e) {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (const file of files) {
        const path = `${user.id}/${Date.now()}-${file.name}`;
        const { error: upError } = await supabase.storage.from("books").upload(path, file);
        if (upError) throw upError;
        const { data } = supabase.storage.from("books").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setFileUrls(urls);
      setUploading(false);
      setExtracting(true);
      const { data: result, error: fnError } = await supabase.functions.invoke("extract-book", {
        body: { file_urls: urls },
      });
      setExtracting(false);
      if (fnError || result?.error) {
        setError(result?.error || fnError.message);
        // mesmo com erro na extração, os arquivos já subiram — deixa a
        // pessoa preencher na mão em vez de travar sem nenhum rascunho.
        setDraft({ name: "", address: "", summary: "", payment_terms: "", condo_value: "", iptu_value: "", units: [] });
        return;
      }
      const d = result.data;
      setDraft({
        name: d.name ?? "",
        address: d.address ?? "",
        summary: d.summary ?? "",
        payment_terms: d.payment_terms ?? "",
        condo_value: d.condo_value ?? "",
        iptu_value: d.iptu_value ?? "",
        units: (d.units ?? []).map((u) => ({ name: u.name ?? "", table_value: u.table_value ?? "" })),
      });
    } catch (err) {
      setUploading(false);
      setExtracting(false);
      setError("Erro ao enviar arquivo: " + err.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function updateDraft(campo, valor) {
    setDraft((d) => ({ ...d, [campo]: valor }));
  }
  function updateUnit(i, campo, valor) {
    setDraft((d) => ({ ...d, units: d.units.map((u, idx) => (idx === i ? { ...u, [campo]: valor } : u)) }));
  }
  function removeUnit(i) {
    setDraft((d) => ({ ...d, units: d.units.filter((_, idx) => idx !== i) }));
  }
  function addUnit() {
    setDraft((d) => ({ ...d, units: [...d.units, { name: "", table_value: "" }] }));
  }

  async function confirmar() {
    if (!draft.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");
    const tabela = kind === "launch" ? "av_launches" : "av_portfolio_properties";
    const { data: inserted, error: insertError } = await supabase
      .from(tabela)
      .insert({
        ...ownerFields,
        name: draft.name.trim(),
        address: draft.address.trim() || null,
        summary: draft.summary.trim() || null,
        payment_terms: draft.payment_terms.trim() || null,
        condo_value: draft.condo_value === "" ? null : Number(draft.condo_value),
        iptu_value: draft.iptu_value === "" ? null : Number(draft.iptu_value),
        book_urls: fileUrls,
      })
      .select("id")
      .single();
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }
    const unidades = draft.units
      .filter((u) => u.name.trim())
      .map((u) => ({
        [kind === "launch" ? "launch_id" : "portfolio_property_id"]: inserted.id,
        name: u.name.trim(),
        table_value: u.table_value === "" ? null : Number(u.table_value),
      }));
    if (unidades.length) {
      const { error: unitError } = await supabase
        .from(kind === "launch" ? "av_launch_units" : "av_portfolio_units")
        .insert(unidades);
      if (unitError) {
        setSaving(false);
        setError(unitError.message);
        return;
      }
    }
    setSaving(false);
    setShow(false);
    setDraft(null);
    setFileUrls([]);
    onImported();
  }

  function cancelar() {
    setShow(false);
    setDraft(null);
    setFileUrls([]);
    setError("");
  }

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="rounded-[9px] border-[1.5px] border-rule px-3 py-1.5 text-sm font-bold text-charcoal hover:border-gold"
      >
        Importar do book
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[14px] border border-rule bg-white p-4">
      {!draft && (
        <>
          <p className="text-sm text-graytext">
            Envie o book, a tabela de preços ou fotos de páginas (PDF ou imagem) — a IA lê o
            material e monta um rascunho do cadastro pra você revisar antes de salvar.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              disabled={uploading || extracting}
              onChange={handlePick}
              className="text-sm text-graytext"
            />
            <button type="button" onClick={cancelar} className="text-xs font-bold text-graytext underline">
              cancelar
            </button>
          </div>
          {uploading && <p className="mt-2 text-sm text-muted">Enviando arquivo(s)…</p>}
          {extracting && <p className="mt-2 text-sm text-muted">Lendo o material…</p>}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}

      {draft && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Rascunho extraído — revise antes de salvar</p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

          <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Nome</label>
          <input
            value={draft.name}
            onChange={(e) => updateDraft("name", e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />

          <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Endereço</label>
          <input
            value={draft.address}
            onChange={(e) => updateDraft("address", e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />

          <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Resumo</label>
          <input
            value={draft.summary}
            onChange={(e) => updateDraft("summary", e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />

          <label className="mt-3 block text-[11.5px] font-bold text-graytext uppercase">Condições de pagamento</label>
          <textarea
            value={draft.payment_terms}
            onChange={(e) => updateDraft("payment_terms", e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />

          <div className="mt-3 flex flex-wrap gap-4">
            <div>
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Condomínio</label>
              <input
                type="number"
                value={draft.condo_value}
                onChange={(e) => updateDraft("condo_value", e.target.value)}
                className="mt-1 w-40 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-graytext uppercase">IPTU</label>
              <input
                type="number"
                value={draft.iptu_value}
                onChange={(e) => updateDraft("iptu_value", e.target.value)}
                className="mt-1 w-40 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
          </div>

          <label className="mt-4 block text-[11.5px] font-bold text-graytext uppercase">Unidades</label>
          <div className="mt-1 space-y-2">
            {draft.units.map((u, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[160px] flex-1">
                  <input
                    value={u.name}
                    onChange={(e) => updateUnit(i, "name", e.target.value)}
                    placeholder="403 · Sereine · 216 m²"
                    className="w-full rounded border border-rule px-2 py-1 text-sm"
                  />
                </div>
                <input
                  type="number"
                  value={u.table_value}
                  onChange={(e) => updateUnit(i, "table_value", e.target.value)}
                  placeholder="Valor de tabela"
                  className="w-32 rounded border border-rule px-2 py-1 text-sm"
                />
                <button type="button" onClick={() => removeUnit(i)} className="text-xs font-bold text-[#B34A2E]">
                  ×
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addUnit} className="mt-2 text-xs font-bold text-graytext underline">
            + unidade
          </button>

          {fileUrls.length > 0 && (
            <p className="mt-3 text-xs text-graytext">
              Documentos enviados:{" "}
              {fileUrls.map((url, i) => (
                <span key={url}>
                  {i > 0 && ", "}
                  <a href={url} target="_blank" rel="noreferrer" className="underline">
                    arquivo {i + 1}
                  </a>
                </span>
              ))}
            </p>
          )}

          <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
            <button
              type="button"
              onClick={confirmar}
              disabled={saving}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Confirmar e criar"}
            </button>
            <button type="button" onClick={cancelar} className="text-sm text-graytext underline">
              cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

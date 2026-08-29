import { useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { ImageUploader } from "./ImageUploader";

// Assistente em etapas pra abastecer o cadastro a partir de material que o
// corretor já tem: 1) book (a IA lê e monta nome/endereço/unidades),
// 2) plantas/fotos (upload direto, sem IA), 3) tabela de preços separada
// (a IA lê de novo e cruza com as unidades já criadas, sobrescrevendo o
// valor de tabela — ou criando unidade nova se não achar correspondência).
// O imóvel/lançamento já é salvo ao final da etapa 1; as etapas seguintes
// vão fazendo update incremental nesse mesmo registro.
export function BookImporter({ kind, ownerFields, onImported }) {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState("pick"); // pick|extracting|review|ask-media|media|ask-table|pick-table|extracting-table|reconcile|done
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [bookUrls, setBookUrls] = useState([]);
  const [draft, setDraft] = useState(null);

  const [propertyId, setPropertyId] = useState(null);
  const [existingUnits, setExistingUnits] = useState([]);

  const [floorPlanUrl, setFloorPlanUrl] = useState(null);
  const [photoUrls, setPhotoUrls] = useState([]);

  const [tableDraftUnits, setTableDraftUnits] = useState([]);
  const [tableAppliedCount, setTableAppliedCount] = useState(0);

  const bookFileRef = useRef(null);
  const tableFileRef = useRef(null);

  const propertyTable = kind === "launch" ? "av_launches" : "av_portfolio_properties";
  const unitsTable = kind === "launch" ? "av_launch_units" : "av_portfolio_units";
  const unitFk = kind === "launch" ? "launch_id" : "portfolio_property_id";

  function reset() {
    setStep("pick");
    setError("");
    setBookUrls([]);
    setDraft(null);
    setPropertyId(null);
    setExistingUnits([]);
    setFloorPlanUrl(null);
    setPhotoUrls([]);
    setTableDraftUnits([]);
    setTableAppliedCount(0);
  }

  function cancelar() {
    setShow(false);
    reset();
  }

  async function uploadToBooks(files) {
    const urls = [];
    for (const file of files) {
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upError } = await supabase.storage.from("books").upload(path, file);
      if (upError) throw upError;
      const { data } = supabase.storage.from("books").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handlePickBook(e) {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;
    setError("");
    setBusy(true);
    try {
      const urls = await uploadToBooks(files);
      setBookUrls(urls);
      setStep("extracting");
      const { data: result, error: fnError } = await supabase.functions.invoke("extract-book", {
        body: { file_urls: urls },
      });
      if (fnError || result?.error) {
        setError(result?.error || fnError.message);
        setDraft({ name: "", address: "", summary: "", payment_terms: "", condo_value: "", iptu_value: "", units: [] });
        setStep("review");
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
      setStep("review");
    } catch (err) {
      setError("Erro ao enviar arquivo: " + err.message);
      setStep("pick");
    } finally {
      setBusy(false);
      if (bookFileRef.current) bookFileRef.current.value = "";
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

  async function confirmarBook() {
    if (!draft.name.trim()) {
      setError("Nome é obrigatório.");
      return;
    }
    setBusy(true);
    setError("");
    const { data: inserted, error: insertError } = await supabase
      .from(propertyTable)
      .insert({
        ...ownerFields,
        name: draft.name.trim(),
        address: draft.address.trim() || null,
        summary: draft.summary.trim() || null,
        payment_terms: draft.payment_terms.trim() || null,
        condo_value: draft.condo_value === "" ? null : Number(draft.condo_value),
        iptu_value: draft.iptu_value === "" ? null : Number(draft.iptu_value),
        book_urls: bookUrls,
      })
      .select("id")
      .single();
    if (insertError) {
      setBusy(false);
      setError(insertError.message);
      return;
    }
    const unidades = draft.units
      .filter((u) => u.name.trim())
      .map((u) => ({
        [unitFk]: inserted.id,
        name: u.name.trim(),
        table_value: u.table_value === "" ? null : Number(u.table_value),
      }));
    let insertedUnits = [];
    if (unidades.length) {
      const { data, error: unitError } = await supabase.from(unitsTable).insert(unidades).select("id, name, table_value");
      if (unitError) {
        setBusy(false);
        setError(unitError.message);
        return;
      }
      insertedUnits = data;
    }
    setBusy(false);
    setPropertyId(inserted.id);
    setExistingUnits(insertedUnits);
    setStep("ask-media");
    onImported();
  }

  async function handleMediaContinue() {
    setBusy(true);
    setError("");
    const { error: updError } = await supabase
      .from(propertyTable)
      .update({ floor_plan_url: floorPlanUrl, photo_urls: photoUrls })
      .eq("id", propertyId);
    setBusy(false);
    if (updError) {
      setError(updError.message);
      return;
    }
    setStep("ask-table");
    onImported();
  }

  function guessMatch(extractedName, units) {
    const num = extractedName.match(/\d+/)?.[0];
    if (!num) return "new";
    const found = units.find((u) => u.name.match(/\d+/)?.[0] === num);
    return found ? found.id : "new";
  }

  async function handlePickTable(e) {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;
    setError("");
    setBusy(true);
    try {
      const urls = await uploadToBooks(files);
      setStep("extracting-table");
      const { data: result, error: fnError } = await supabase.functions.invoke("extract-book", {
        body: { file_urls: urls },
      });
      if (fnError || result?.error) {
        setError(result?.error || fnError.message);
        setStep("ask-table");
        return;
      }
      const rows = (result.data.units ?? []).map((u) => ({
        name: u.name ?? "",
        table_value: u.table_value ?? "",
        target: guessMatch(u.name ?? "", existingUnits),
      }));
      setTableDraftUnits(rows);
      setStep("reconcile");
    } catch (err) {
      setError("Erro ao enviar arquivo: " + err.message);
      setStep("ask-table");
    } finally {
      setBusy(false);
      if (tableFileRef.current) tableFileRef.current.value = "";
    }
  }

  function updateTableTarget(i, target) {
    setTableDraftUnits((rows) => rows.map((r, idx) => (idx === i ? { ...r, target } : r)));
  }

  async function aplicarTabela() {
    setBusy(true);
    setError("");
    const toUpdate = tableDraftUnits.filter((r) => r.target !== "new" && r.name.trim());
    const toCreate = tableDraftUnits.filter((r) => r.target === "new" && r.name.trim());
    for (const row of toUpdate) {
      const { error: updError } = await supabase
        .from(unitsTable)
        .update({ table_value: row.table_value === "" ? null : Number(row.table_value) })
        .eq("id", row.target);
      if (updError) {
        setBusy(false);
        setError(updError.message);
        return;
      }
    }
    if (toCreate.length) {
      const { error: insError } = await supabase.from(unitsTable).insert(
        toCreate.map((row) => ({
          [unitFk]: propertyId,
          name: row.name.trim(),
          table_value: row.table_value === "" ? null : Number(row.table_value),
        })),
      );
      if (insError) {
        setBusy(false);
        setError(insError.message);
        return;
      }
    }
    setBusy(false);
    setTableAppliedCount(toCreate.length);
    setStep("done");
    onImported();
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
    <div className="mt-2 rounded-[14px] border border-rule bg-white p-5">
      <StepIndicator step={step} />

      {step === "pick" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 1 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Envie o book</h3>
          <p className="mt-1 max-w-[56ch] text-sm text-graytext">
            PDF ou fotos das páginas — nome, endereço, resumo, condições de pagamento e as unidades da tabela, se
            estiverem no texto.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-[1.5px] border-dashed border-rule px-6 py-8 text-center hover:border-gold hover:bg-[#fbfaf8]">
            <span className="text-sm font-bold text-charcoal">
              {busy ? "Enviando…" : "Escolher arquivo ou arrastar aqui"}
            </span>
            <span className="text-xs text-muted">PDF, PNG, JPG ou WEBP · até 6 arquivos</span>
            <input
              ref={bookFileRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              disabled={busy}
              onChange={handlePickBook}
              className="hidden"
            />
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button type="button" onClick={cancelar} className="mt-3 text-xs font-bold text-graytext underline">
            cancelar
          </button>
        </>
      )}

      {step === "extracting" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 1 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Lendo o material</h3>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-rule border-t-gold" />
            <p className="text-sm text-graytext">Extraindo dados do book…</p>
          </div>
        </>
      )}

      {step === "review" && draft && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 1 de 4 · rascunho extraído</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Revise antes de criar</h3>
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

          <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
            <button
              type="button"
              onClick={confirmarBook}
              disabled={busy}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Confirmar e criar imóvel"}
            </button>
            <button type="button" onClick={cancelar} className="text-sm text-graytext underline">
              cancelar
            </button>
          </div>
        </>
      )}

      {step === "ask-media" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">
            Etapa 2 de 4 · {draft?.name} criado ✓
          </p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Você tem plantas ou fotos?</h3>
          <p className="mt-1 text-sm text-graytext">
            Anexe agora ou pule — dá pra adicionar depois direto no cadastro do imóvel.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ChoiceButton
              title="Sim, tenho arquivos"
              subtitle="Planta e/ou fotos do empreendimento"
              onClick={() => setStep("media")}
            />
            <ChoiceButton title="Não, pular" subtitle="Seguir pra próxima etapa" onClick={() => setStep("ask-table")} />
          </div>
        </>
      )}

      {step === "media" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 2 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Plantas e fotos</h3>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-6">
            <ImageUploader label="Planta do imóvel" value={floorPlanUrl} onChange={setFloorPlanUrl} multiple={false} />
            <ImageUploader label="Fotos" value={photoUrls} onChange={setPhotoUrls} multiple={true} />
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
            <button
              type="button"
              onClick={handleMediaContinue}
              disabled={busy}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Continuar"}
            </button>
            <button type="button" onClick={() => setStep("ask-table")} className="text-sm text-graytext underline">
              pular
            </button>
          </div>
        </>
      )}

      {step === "ask-table" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 3 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Tem uma tabela de preços separada?</h3>
          <p className="mt-1 max-w-[56ch] text-sm text-graytext">
            Uma tabela costuma vir mais atualizada que o texto do book — os valores dela substituem os que já estão
            nas unidades.
          </p>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <ChoiceButton
              title="Sim, tenho tabela"
              subtitle="PDF ou foto da planilha de preços"
              onClick={() => setStep("pick-table")}
            />
            <ChoiceButton
              title="Não, os valores já estão certos"
              subtitle="Seguir pra conclusão"
              onClick={() => setStep("done")}
            />
          </div>
        </>
      )}

      {step === "pick-table" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 3 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Envie a tabela de preços</h3>
          <p className="mt-1 text-sm text-graytext">
            A IA lê a tabela e sugere o cruzamento com as unidades já cadastradas.
          </p>
          <label className="mt-4 flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-[1.5px] border-dashed border-rule px-6 py-8 text-center hover:border-gold hover:bg-[#fbfaf8]">
            <span className="text-sm font-bold text-charcoal">
              {busy ? "Enviando…" : "Escolher arquivo ou arrastar aqui"}
            </span>
            <span className="text-xs text-muted">PDF, PNG, JPG ou WEBP</span>
            <input
              ref={tableFileRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              disabled={busy}
              onChange={handlePickTable}
              className="hidden"
            />
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}

      {step === "extracting-table" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 3 de 4</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Lendo a tabela</h3>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-rule border-t-gold" />
            <p className="text-sm text-graytext">Extraindo valores…</p>
          </div>
        </>
      )}

      {step === "reconcile" && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-[.08em] text-gold">Etapa 3 de 4 · tabela lida</p>
          <h3 className="mt-1 font-serif text-lg font-semibold text-charcoal">Confira o cruzamento</h3>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-light px-3.5 py-2.5 text-xs text-graytext">
            <span>ⓘ</span>
            <span>
              O valor da tabela substitui o valor atual da unidade. Ajuste o destino de cada linha antes de aplicar.
            </span>
          </div>
          <div className="mt-3 divide-y divide-rule">
            {tableDraftUnits.map((row, i) => (
              <div key={i} className="grid grid-cols-[1.3fr_auto_1.4fr] items-center gap-3 py-3">
                <div>
                  <p className="text-sm font-bold text-charcoal">{row.name}</p>
                  <p className="text-xs tabular-nums text-graytext">
                    {row.table_value === "" ? "—" : `R$ ${Number(row.table_value).toLocaleString("pt-BR")}`}
                  </p>
                </div>
                <span className="text-muted">→</span>
                <select
                  value={row.target}
                  onChange={(e) => updateTableTarget(i, e.target.value)}
                  className="w-full rounded-[8px] border-[1.5px] border-rule px-2.5 py-2 text-sm"
                >
                  {existingUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                  <option value="new">+ criar nova unidade</option>
                </select>
              </div>
            ))}
            {tableDraftUnits.length === 0 && (
              <p className="py-3 text-sm text-muted">Nenhuma unidade encontrada na tabela.</p>
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-rule pt-3">
            <button
              type="button"
              onClick={aplicarTabela}
              disabled={busy}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Aplicando…" : "Aplicar tabela"}
            </button>
            <button type="button" onClick={() => setStep("done")} className="text-sm text-graytext underline">
              pular
            </button>
          </div>
        </>
      )}

      {step === "done" && (
        <div className="py-2 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E3F0E4] text-2xl text-[#2E7D32]">
            ✓
          </div>
          <h3 className="mt-4 font-serif text-lg font-semibold text-charcoal">{draft?.name} importado</h3>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-graytext">
            Já está disponível, pronto pra entrar num roteiro.
          </p>
          <div className="mt-5 flex justify-center gap-8">
            <Stat n={existingUnits.length + tableAppliedCount} label="unidades" />
            <Stat n={photoUrls.length} label="fotos" />
            <Stat n={floorPlanUrl ? 1 : 0} label="planta" />
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <button
              type="button"
              onClick={cancelar}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90"
            >
              Concluir
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-[10px] border-[1.5px] border-rule px-4 py-2 text-sm font-bold text-charcoal hover:border-gold"
            >
              Importar outro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const STEP_LABELS = [
  { n: 1, label: "Book", of: ["pick", "extracting", "review"] },
  { n: 2, label: "Fotos", of: ["ask-media", "media"] },
  { n: 3, label: "Tabela", of: ["ask-table", "pick-table", "extracting-table", "reconcile"] },
  { n: 4, label: "Concluído", of: ["done"] },
];

function StepIndicator({ step }) {
  const current = STEP_LABELS.find((s) => s.of.includes(step))?.n ?? 1;
  return (
    <div className="mb-5 flex items-center">
      {STEP_LABELS.map((s, i) => (
        <div key={s.n} className="flex items-center">
          {i > 0 && <div className={`mx-2.5 h-px w-9 ${s.n <= current ? "bg-charcoal" : "bg-rule"}`} />}
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full border-[1.5px] text-[11.5px] font-bold ${
                s.n < current
                  ? "border-charcoal bg-charcoal text-white"
                  : s.n === current
                    ? "border-gold bg-gold text-white"
                    : "border-rule bg-white text-muted"
              }`}
            >
              {s.n}
            </div>
            <span className={`text-xs font-bold ${s.n <= current ? "text-charcoal" : "text-muted"}`}>{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChoiceButton({ title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-[12px] border-[1.5px] border-rule bg-white px-4 py-4 text-left hover:border-gold hover:bg-[#fbfaf8]"
    >
      <p className="text-sm font-bold text-charcoal">{title}</p>
      <p className="mt-0.5 text-xs text-graytext">{subtitle}</p>
    </button>
  );
}

function Stat({ n, label }) {
  return (
    <div className="text-center">
      <p className="font-serif text-xl font-semibold text-charcoal">{n}</p>
      <p className="text-[11px] uppercase tracking-[.06em] text-graytext">{label}</p>
    </div>
  );
}

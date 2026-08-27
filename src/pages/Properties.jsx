import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization } from "../lib/useOrganization";
import { importarPortfolio, importarLancamento } from "../lib/importar";
import { loadCatalogItems } from "../lib/catalogo";
import { generateToken } from "../lib/token";
import { CatalogBrowser } from "../components/CatalogBrowser";

// Uma busca só sobre tudo que existe na plataforma — o corretor não
// precisa entender a diferença entre "catálogo" e "empreendimento", ele
// quer achar o que mostrar pro cliente.
export default function Properties() {
  const { org, loading: loadingOrg } = useOrganization();
  const [picksResolvidos, setPicksResolvidos] = useState([]);

  useEffect(() => {
    if (!org || org.tipo !== "imobiliaria") {
      setPicksResolvidos([]);
      return;
    }
    Promise.all([
      supabase
        .from("av_team_picks")
        .select("id, portfolio_property_id, launch_id, note, position")
        .eq("organization_id", org.id)
        .order("position"),
      loadCatalogItems(),
    ]).then(([{ data: picks }, items]) => {
      const resolvidos = (picks ?? [])
        .map((p) => {
          const item = items.find((it) =>
            p.portfolio_property_id ? it.kind === "portfolio" && it.id === p.portfolio_property_id : it.kind === "lancamento" && it.id === p.launch_id,
          );
          return item ? { ...item, note: p.note } : null;
        })
        .filter(Boolean);
      setPicksResolvidos(resolvidos);
    });
  }, [org]);

  if (loadingOrg) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-serif text-[27px] font-semibold text-charcoal">Imóveis</h1>
        <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-graytext">
          Tudo que está publicado na plataforma — portfólio e lançamentos juntos. Ache o que
          mostrar pro cliente e adicione direto num roteiro.
        </p>

        {picksResolvidos.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              Seleção da {org.name}
            </h2>
            <div className="mb-6 space-y-3">
              {picksResolvidos.map((it) => (
                <div key={`pick-${it.kind}-${it.id}`} className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${it.color || "#A68A5B"}` }}>
                  <p className="font-serif font-semibold text-charcoal">{it.name}</p>
                  {it.orgName && <p className="text-xs text-graytext">{it.orgName}</p>}
                  {it.note && (
                    <p className="mt-2 rounded-[9px] bg-light p-2 text-xs text-graytext">
                      <b className="text-charcoal">Nota do time:</b> {it.note}
                    </p>
                  )}
                  <RoteiroAction item={it} />
                </div>
              ))}
            </div>
          </>
        )}

        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">Buscar</h2>
        <CatalogBrowser renderAction={(item) => <RoteiroAction item={item} />} />
      </div>
    </div>
  );
}

function RoteiroAction({ item }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => setShow((v) => !v)} className="text-xs font-bold text-graytext underline">
        {show ? "Fechar" : "Adicionar ao roteiro"}
      </button>
      {show && <AddToRoteiro item={item} onDone={() => setShow(false)} />}
    </div>
  );
}

function AddToRoteiro({ item, onDone }) {
  const navigate = useNavigate();
  const [selections, setSelections] = useState(null);
  const [modo, setModo] = useState("existente"); // existente | novo
  const [selectionId, setSelectionId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase
      .from("av_selections")
      .select("id, title, client_name")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSelections(data ?? []);
        if (data?.length) setSelectionId(data[0].id);
        else setModo("novo");
      });
  }, []);

  async function adicionar(alvoSelectionId, position) {
    if (item.kind === "portfolio") {
      return importarPortfolio(alvoSelectionId, item.raw, position);
    }
    const disponiveis = item.raw.units.filter((u) => u.status === "disponivel");
    return importarLancamento(alvoSelectionId, item.raw, disponiveis, position);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");

    let alvoId = selectionId;
    let position = 0;

    if (modo === "novo") {
      if (!clientName.trim()) {
        setBusy(false);
        setError("Nome do cliente é obrigatório.");
        return;
      }
      const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
        p_name: clientName.trim(),
        p_phone: clientPhone.trim() || null,
        p_email: null,
      });
      if (clientError) {
        setBusy(false);
        setError("Erro ao vincular cliente: " + clientError.message);
        return;
      }
      const camposLancamento =
        item.kind === "lancamento"
          ? { criteria: item.raw.criteria, milestones: item.raw.milestones, launch_id: item.id }
          : {};
      const { data: selection, error: selError } = await supabase
        .from("av_selections")
        .insert({
          title: item.name,
          subtitle: item.summary,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          client_id: clientId,
          ...camposLancamento,
          token_form: generateToken(),
          token_panel: generateToken(),
        })
        .select("id")
        .single();
      if (selError) {
        setBusy(false);
        setError(selError.message);
        return;
      }
      alvoId = selection.id;
    } else {
      if (!alvoId) {
        setBusy(false);
        setError("Escolha um roteiro.");
        return;
      }
      const { count } = await supabase
        .from("av_properties")
        .select("id", { count: "exact", head: true })
        .eq("selection_id", alvoId);
      position = count ?? 0;
    }

    const { error: importError } = await adicionar(alvoId, position);
    setBusy(false);
    if (importError) {
      setError(importError.message);
      return;
    }
    navigate(`/app/selections/${alvoId}`);
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-[11px] bg-bg p-3">
      {selections?.length > 0 && (
        <div className="flex overflow-hidden rounded-[9px] border-[1.5px] border-rule">
          <button
            type="button"
            onClick={() => setModo("existente")}
            className={`flex-1 px-2 py-1.5 text-xs font-bold ${modo === "existente" ? "bg-charcoal text-white" : "text-graytext"}`}
          >
            Roteiro existente
          </button>
          <button
            type="button"
            onClick={() => setModo("novo")}
            className={`flex-1 px-2 py-1.5 text-xs font-bold ${modo === "novo" ? "bg-charcoal text-white" : "text-graytext"}`}
          >
            Novo roteiro
          </button>
        </div>
      )}

      {modo === "existente" ? (
        <select
          value={selectionId}
          onChange={(e) => setSelectionId(e.target.value)}
          className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        >
          {selections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.client_name} · {s.title}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-2">
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nome do cliente"
            className="min-w-[140px] flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <input
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="Telefone (opcional)"
            className="min-w-[140px] flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Adicionando…" : "Adicionar"}
      </button>
    </form>
  );
}

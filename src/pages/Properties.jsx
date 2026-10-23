import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization } from "../lib/useOrganization";
import { importarPortfolio, importarLancamento } from "../lib/importar";
import { loadCatalogItems } from "../lib/catalogo";
import { generateToken } from "../lib/token";
import { CatalogBrowser } from "../components/CatalogBrowser";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

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

  if (loadingOrg) return <div className="p-6 text-body-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1040px]">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Imóveis</h1>
        <p className="mt-1.5 max-w-[60ch] text-base text-graytext">
          Tudo que está publicado na plataforma, portfólio e lançamentos juntos. Ache o que mostrar ao cliente e adicione
          direto a um roteiro.
        </p>

        {picksResolvidos.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">Seleção da {org.name}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {picksResolvidos.map((it) => (
                <div key={`pick-${it.kind}-${it.id}`} className="grid gap-2 rounded-card border border-slate-200/70 bg-white p-4">
                  <div className="flex items-center gap-3.5">
                    <span
                      className="h-16 w-16 flex-none rounded-xl"
                      style={{ background: `linear-gradient(135deg, ${it.color || "#0284C7"}, ${it.color || "#0284C7"}cc)` }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-charcoal">{it.name}</p>
                      {it.orgName && (
                        <p className="text-caption text-graytext">
                          {it.orgName} · {it.kind === "lancamento" ? "lançamento" : "pronto"}
                        </p>
                      )}
                    </div>
                  </div>
                  {it.note && (
                    <p className="rounded-[10px] bg-bg px-2.5 py-2 text-caption text-graytext">
                      <b className="text-slate-700">Nota do time:</b> {it.note}
                    </p>
                  )}
                  <RoteiroAction item={it} />
                </div>
              ))}
            </div>
          </section>
        )}

        <h2 className="mt-8 mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">Buscar</h2>
        <CatalogBrowser renderAction={(item) => <RoteiroAction item={item} />} />
      </div>
    </div>
  );
}

function RoteiroAction({ item }) {
  const [show, setShow] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setShow(true)}>
        + Adicionar ao roteiro
      </Button>
      <Modal
        open={show}
        onClose={() => setShow(false)}
        title="Adicionar ao roteiro"
      >
        <p className="-mt-1 mb-4 text-body-sm text-graytext">
          {item.name}
          {item.kind === "lancamento" ? " · só as unidades disponíveis entram" : ""}
        </p>
        <AddToRoteiro item={item} onDone={() => setShow(false)} />
      </Modal>
    </>
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
    <form onSubmit={submit} className="space-y-3">
      {selections?.length > 0 && (
        <div className="grid grid-cols-2 gap-[3px] rounded-control bg-light p-[3px]">
          {[
            ["existente", "Roteiro existente"],
            ["novo", "Novo roteiro"],
          ].map(([v, rotulo]) => (
            <button
              key={v}
              type="button"
              onClick={() => setModo(v)}
              aria-pressed={modo === v}
              className={`min-h-10 rounded-[9px] text-[13px] font-semibold transition-all duration-200 ${
                modo === v ? "bg-white text-charcoal shadow-sm" : "text-graytext hover:text-charcoal"
              }`}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      {modo === "existente" ? (
        <select value={selectionId} onChange={(e) => setSelectionId(e.target.value)} aria-label="Roteiro" className={classesCampo}>
          {selections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.client_name} · {s.title}
            </option>
          ))}
        </select>
      ) : (
        <div className="space-y-3">
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" aria-label="Nome do cliente" />
          <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Telefone (opcional)" aria-label="Telefone" />
        </div>
      )}

      {error && <p className="text-body-sm text-danger-text">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Adicionando…" : "Adicionar"}
        </Button>
      </div>
    </form>
  );
}

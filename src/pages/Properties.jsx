import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization } from "../lib/useOrganization";
import { importarPortfolio, importarLancamento } from "../lib/importar";
import { generateToken } from "../lib/token";

// Uma busca só sobre tudo que existe na plataforma — o corretor não
// precisa entender a diferença entre "catálogo" e "empreendimento", ele
// quer achar o que mostrar pro cliente.
export default function Properties() {
  const { org, memberships, loading: loadingOrg } = useOrganization();
  const [items, setItems] = useState(null);
  const [teamPicks, setTeamPicks] = useState(null);
  const [texto, setTexto] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [orgFiltro, setOrgFiltro] = useState("");
  const [somente, setSomente] = useState("todos"); // todos | lancamento | portfolio

  async function load() {
    const [{ data: portfolioData }, { data: launchData }] = await Promise.all([
      supabase.from("av_portfolio_properties").select("*, av_portfolio_units(*), organizations(id,name,tipo)").order("name"),
      supabase.from("av_launches").select("*, av_launch_units(*), organizations(id,name,tipo)").order("created_at", { ascending: false }),
    ]);

    const portfolioItems = (portfolioData ?? []).map((p) => ({
      kind: "portfolio",
      id: p.id,
      name: p.name,
      address: p.address,
      summary: p.summary,
      color: p.color,
      orgId: p.organizations?.id,
      orgName: p.organizations?.name,
      units: (p.av_portfolio_units ?? []).map((u) => ({ id: u.id, name: u.name, table_value: u.table_value })),
      raw: { ...p, units: p.av_portfolio_units },
    }));
    const launchItems = (launchData ?? []).map((l) => ({
      kind: "lancamento",
      id: l.id,
      name: l.name,
      address: l.address,
      summary: l.summary,
      color: l.color,
      orgId: l.organizations?.id,
      orgName: l.organizations?.name,
      units: (l.av_launch_units ?? []).map((u) => ({ id: u.id, name: u.name, table_value: u.table_value, status: u.status })),
      raw: { ...l, units: l.av_launch_units },
    }));
    setItems([...launchItems, ...portfolioItems]);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!org || org.tipo !== "imobiliaria") {
      setTeamPicks(null);
      return;
    }
    supabase
      .from("av_team_picks")
      .select("id, portfolio_property_id, launch_id, note, position")
      .eq("organization_id", org.id)
      .order("position")
      .then(({ data }) => setTeamPicks(data ?? []));
  }, [org]);

  const organizacoes = useMemo(() => {
    if (!items) return [];
    const map = new Map();
    for (const it of items) if (it.orgId && !map.has(it.orgId)) map.set(it.orgId, it.orgName);
    return [...map.entries()];
  }, [items]);

  function minValue(item) {
    const valores = item.units.map((u) => u.table_value).filter((v) => v != null);
    return valores.length ? Math.min(...valores) : null;
  }

  const filtrados = useMemo(() => {
    if (!items) return null;
    const q = texto.trim().toLowerCase();
    const max = valorMax ? Number(valorMax) : null;
    return items.filter((it) => {
      if (somente !== "todos" && it.kind !== somente) return false;
      if (orgFiltro && it.orgId !== orgFiltro) return false;
      if (max != null) {
        const v = minValue(it);
        if (v == null || v > max) return false;
      }
      if (q) {
        const alvo = `${it.name} ${it.address ?? ""} ${it.orgName ?? ""}`.toLowerCase();
        if (!alvo.includes(q)) return false;
      }
      return true;
    });
  }, [items, texto, valorMax, orgFiltro, somente]);

  const picksResolvidos = useMemo(() => {
    if (!teamPicks || !items) return [];
    return teamPicks
      .map((p) => {
        const item = items.find((it) =>
          p.portfolio_property_id ? it.kind === "portfolio" && it.id === p.portfolio_property_id : it.kind === "lancamento" && it.id === p.launch_id,
        );
        return item ? { ...item, note: p.note } : null;
      })
      .filter(Boolean);
  }, [teamPicks, items]);

  if (loadingOrg || items === null) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-charcoal">Imóveis</h1>
        <p className="text-sm text-graytext">
          Tudo que está publicado na plataforma — portfólio e lançamentos juntos. Ache o que
          mostrar pro cliente e adicione direto num roteiro.
        </p>

        {picksResolvidos.length > 0 && (
          <>
            <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
              Seleção da {org.name}
            </h2>
            <div className="space-y-3">
              {picksResolvidos.map((it) => (
                <PropertyCard key={`pick-${it.kind}-${it.id}`} item={it} note={it.note} />
              ))}
            </div>
          </>
        )}

        <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">
          Buscar
        </h2>
        <div className="rounded-[14px] border border-rule bg-white p-3">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Nome, endereço ou organização"
            className="w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={orgFiltro}
              onChange={(e) => setOrgFiltro(e.target.value)}
              className="rounded-[9px] border-[1.5px] border-rule px-2 py-1.5 text-sm"
            >
              <option value="">Todas as organizações</option>
              {organizacoes.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              value={valorMax}
              onChange={(e) => setValorMax(e.target.value)}
              placeholder="Valor máximo"
              className="w-36 rounded-[9px] border-[1.5px] border-rule px-2 py-1.5 text-sm"
            />
            <div className="flex overflow-hidden rounded-[9px] border-[1.5px] border-rule">
              {[
                ["todos", "Tudo"],
                ["lancamento", "Só lançamentos"],
                ["portfolio", "Só prontos"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSomente(value)}
                  className={`px-2 py-1.5 text-xs font-bold ${somente === value ? "bg-charcoal text-white" : "text-graytext"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {filtrados?.length === 0 && <p className="text-sm text-muted">Nenhum imóvel encontrado com esses filtros.</p>}
          {filtrados?.map((it) => (
            <PropertyCard key={`${it.kind}-${it.id}`} item={it} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ item, note }) {
  const [show, setShow] = useState(false);
  const total = item.units.length;
  const disponiveis = item.kind === "lancamento" ? item.units.filter((u) => u.status === "disponivel").length : total;

  return (
    <div className="rounded-[14px] border border-rule bg-white p-4" style={{ borderLeft: `5px solid ${item.color || "#A68A5B"}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-charcoal">{item.name}</p>
          {item.orgName && (
            <p className="text-xs text-graytext">
              {item.orgId ? (
                <Link to={`/app/organizacoes/${item.orgId}`} className="underline">
                  {item.orgName}
                </Link>
              ) : (
                item.orgName
              )}
              {item.kind === "lancamento" ? " · lançamento" : " · pronto"}
            </p>
          )}
          {item.address && <p className="mt-1 text-sm text-graytext">{item.address}</p>}
        </div>
        {total > 0 && (
          <span className="rounded-full bg-light px-[10px] py-1 text-[10.5px] font-bold text-graytext">
            {item.kind === "lancamento" ? `${disponiveis}/${total} disponível(is)` : `${total} unidade(s)`}
          </span>
        )}
      </div>

      {note && (
        <p className="mt-2 rounded-[9px] bg-light p-2 text-xs text-graytext">
          <b className="text-charcoal">Nota do time:</b> {note}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setShow((v) => !v)} className="text-xs font-bold text-graytext underline">
          {show ? "Fechar" : "Adicionar ao roteiro"}
        </button>
      </div>

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

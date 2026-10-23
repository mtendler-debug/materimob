import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadCatalogItems } from "../lib/catalogo";
import { estiloCapa } from "../lib/capa";
import { useCapasAcademia } from "../lib/capasAcademia";

function minValue(item) {
  const valores = item.units.map((u) => u.table_value).filter((v) => v != null);
  return valores.length ? Math.min(...valores) : null;
}

// Busca só sobre tudo que existe na plataforma (portfólio + lançamentos) —
// usado por /app/imoveis (adicionar a um roteiro) e /app/time (curadoria da
// imobiliária). `renderAction` decide o que aparece em cada card; a busca e
// os filtros são os mesmos nos dois lugares.
export function CatalogBrowser({ renderAction, gridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" }) {
  const [items, setItems] = useState(null);
  const capaAcademia = useCapasAcademia();
  const [texto, setTexto] = useState("");
  const [valorMax, setValorMax] = useState("");
  const [orgFiltro, setOrgFiltro] = useState("");
  const [somente, setSomente] = useState("todos"); // todos | lancamento | portfolio

  useEffect(() => {
    loadCatalogItems().then(setItems);
  }, []);

  const organizacoes = useMemo(() => {
    if (!items) return [];
    const map = new Map();
    for (const it of items) if (it.orgId && !map.has(it.orgId)) map.set(it.orgId, it.orgName);
    return [...map.entries()];
  }, [items]);

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

  if (items === null) return <p className="text-body-sm text-muted">Carregando…</p>;

  const chipBase = "inline-flex min-h-9 items-center rounded-full border px-3.5 text-[13px] font-semibold transition-all duration-200 ease-out";

  return (
    <div>
      <label className="flex min-h-[46px] items-center gap-2 rounded-control border border-slate-200 bg-white px-3.5 text-muted transition-all duration-200 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] flex-none" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nome, endereço ou organização"
          aria-label="Buscar imóvel"
          className="w-full min-w-0 bg-transparent text-body-sm text-charcoal outline-none placeholder:text-muted"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {[
          ["todos", "Tudo"],
          ["lancamento", "Lançamentos"],
          ["portfolio", "Prontos"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setSomente(value)}
            aria-pressed={somente === value}
            className={`${chipBase} ${
              somente === value
                ? "border-charcoal bg-charcoal text-white"
                : "border-slate-200 bg-white text-graytext hover:border-slate-300 hover:text-charcoal"
            }`}
          >
            {label}
          </button>
        ))}
        <select
          value={orgFiltro}
          onChange={(e) => setOrgFiltro(e.target.value)}
          aria-label="Organização"
          className={`${chipBase} border-slate-200 bg-white text-graytext`}
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
          aria-label="Valor máximo"
          className={`${chipBase} w-36 border-slate-200 bg-white text-charcoal placeholder:font-medium placeholder:text-muted`}
        />
      </div>

      <p className="mt-6 mb-3 text-caption font-semibold tracking-[.08em] text-muted uppercase">
        {filtrados?.length ?? 0} imóve{filtrados?.length === 1 ? "l" : "is"}
      </p>

      {filtrados?.length === 0 && (
        <div className="py-14 text-center text-graytext">
          <b className="mb-1.5 block text-body text-charcoal">
            {items?.length === 0 && !texto && !valorMax && !orgFiltro && somente === "todos"
              ? "Ainda não há imóveis publicados"
              : "Nenhum imóvel encontrado"}
          </b>
          <p className="text-body-sm">
            {items?.length === 0 && !texto && !valorMax && !orgFiltro && somente === "todos"
              ? "Cadastre os seus em Meu estoque."
              : "Tire um filtro ou mude a busca."}
          </p>
        </div>
      )}
      <div className={gridClass}>
        {filtrados?.map((it) => (
          <CatalogCard key={`${it.kind}-${it.id}`} item={it} capaAlt={capaAcademia(it.name)} action={renderAction?.(it)} />
        ))}
      </div>
    </div>
  );
}

const brl = (v) => "R$ " + Number(v).toLocaleString("pt-BR");

export function CatalogCard({ item, action, capaAlt }) {
  const total = item.units.length;
  const disponiveis = item.kind === "lancamento" ? item.units.filter((u) => u.status === "disponivel").length : total;
  const menor = minValue(item);
  const cor = item.color || "#0284C7";

  return (
    <article className="flex min-w-0 flex-row gap-3 rounded-[20px] border border-slate-200/70 bg-white p-2.5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-soft sm:flex-col">
      <div
        className="relative flex w-24 flex-none items-end overflow-hidden rounded-[14px] p-2.5 sm:h-[132px] sm:w-auto"
        style={estiloCapa(cor, item.raw?.photo_urls, capaAlt)}
      >
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/35" />
        <span className="relative hidden rounded-full bg-slate-900/35 px-2.5 py-0.5 text-caption font-semibold text-white backdrop-blur-md sm:inline">
          {item.kind === "lancamento" ? "Lançamento" : "Pronto"}
        </span>
      </div>
      <div className="grid min-w-0 flex-1 content-start gap-1 sm:px-2 sm:pb-1.5">
        <h3 className="text-body font-semibold tracking-tight text-charcoal">{item.name}</h3>
        {item.orgName && (
          <p className="text-body-sm text-graytext">
            {item.orgId ? (
              <Link to={`/app/organizacoes/${item.orgId}`} className="hover:underline">
                {item.orgName}
              </Link>
            ) : (
              item.orgName
            )}
            <span className="sm:hidden">{item.kind === "lancamento" ? " · lançamento" : " · pronto"}</span>
          </p>
        )}
        {item.address && <p className="text-body-sm text-graytext">{item.address}</p>}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {menor != null ? (
            <div>
              <small className="block text-[11px] text-muted">a partir de</small>
              <span className="font-bold tracking-tight text-charcoal tabular-nums">{brl(menor)}</span>
            </div>
          ) : (
            <span />
          )}
          {total > 0 && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-caption font-semibold ${
                item.kind === "lancamento" ? "bg-brand-soft text-sky-800" : "bg-light text-graytext"
              }`}
            >
              {item.kind === "lancamento" ? `${disponiveis}/${total} disponíveis` : `${total} unidade${total > 1 ? "s" : ""}`}
            </span>
          )}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </article>
  );
}

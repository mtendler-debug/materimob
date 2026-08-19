import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadCatalogItems } from "../lib/catalogo";

function minValue(item) {
  const valores = item.units.map((u) => u.table_value).filter((v) => v != null);
  return valores.length ? Math.min(...valores) : null;
}

// Busca só sobre tudo que existe na plataforma (portfólio + lançamentos) —
// usado por /app/imoveis (adicionar a um roteiro) e /app/time (curadoria da
// imobiliária). `renderAction` decide o que aparece em cada card; a busca e
// os filtros são os mesmos nos dois lugares.
export function CatalogBrowser({ renderAction }) {
  const [items, setItems] = useState(null);
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

  if (items === null) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div>
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
          <CatalogCard key={`${it.kind}-${it.id}`} item={it} action={renderAction?.(it)} />
        ))}
      </div>
    </div>
  );
}

function CatalogCard({ item, action }) {
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

      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

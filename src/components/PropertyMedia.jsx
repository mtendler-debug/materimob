// Planta + fotos + condições de pagamento de um imóvel, só leitura —
// usado nas telas do cliente final (PublicForm, PublicPanel). Não mostra
// nada se o imóvel não tiver nenhum desses três campos preenchidos.
function brl(n) {
  return n == null ? null : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

export function PropertyMedia({ property }) {
  const fotos = property.photo_urls ?? [];
  const temAlgo =
    property.floor_plan_url ||
    fotos.length > 0 ||
    property.payment_terms ||
    property.condo_value != null ||
    property.iptu_value != null;
  if (!temAlgo) return null;

  return (
    <div className="mt-3 space-y-2">
      {fotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {fotos.map((url) => (
            <img
              key={url}
              src={url}
              alt="Foto do imóvel"
              className="h-24 w-32 shrink-0 rounded-[9px] border border-rule object-cover"
            />
          ))}
        </div>
      )}
      {property.floor_plan_url && (
        <div>
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-graytext">Planta</p>
          <img
            src={property.floor_plan_url}
            alt="Planta do imóvel"
            className="max-h-64 w-auto rounded-[9px] border border-rule object-contain"
          />
        </div>
      )}
      {property.payment_terms && (
        <div className="rounded-[9px] bg-light p-3 text-[13px] whitespace-pre-line text-graytext">
          <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.06em] text-graytext">
            Condições de pagamento
          </p>
          {property.payment_terms}
        </div>
      )}
      {(property.condo_value != null || property.iptu_value != null) && (
        <div className="flex gap-4 text-[13px] text-graytext">
          {property.condo_value != null && (
            <span>
              <b className="text-charcoal">{brl(property.condo_value)}</b> condomínio
            </span>
          )}
          {property.iptu_value != null && (
            <span>
              <b className="text-charcoal">{brl(property.iptu_value)}</b> IPTU
            </span>
          )}
        </div>
      )}
    </div>
  );
}

import { Suspense, lazy } from "react";

// O mapa (Leaflet) é a peça mais pesada das telas que o usam: ~150 KB.
// Carregado à parte, só baixa quando o mapa aparece — o painel público do
// cliente abre sem esperar por ele. Mesma interface de components/Map.
const MapaLeaflet = lazy(() => import("./Map").then((m) => ({ default: m.Map })));

export function Map(props) {
  return (
    <Suspense fallback={<div className="rounded-[12px] bg-light" style={{ height: props.height ?? 320 }} />}>
      <MapaLeaflet {...props} />
    </Suspense>
  );
}

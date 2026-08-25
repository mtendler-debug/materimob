import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Mapa genérico com pinos — Leaflet puro, sem react-leaflet, pra não
// empilhar mais uma dependência. Pino é um L.divIcon (ponto colorido
// via CSS), não o marker padrão do Leaflet — o marker padrão quebra sob
// bundler porque referencia caminho de imagem que o Vite não resolve
// sozinho; div+CSS evita esse problema conhecido de vez.
function pinIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color || "#a68a5b"};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function Map({ pins, height = 320 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    mapRef.current = L.map(containerRef.current).setView([-14.235, -51.925], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = (pins ?? [])
      .filter((p) => p.lat != null && p.lng != null)
      .map((p) => {
        const marker = L.marker([p.lat, p.lng], { icon: pinIcon(p.color) }).addTo(map);
        if (p.label) marker.bindTooltip(p.label);
        return marker;
      });
    if (markersRef.current.length > 0) {
      const bounds = L.latLngBounds(markersRef.current.map((m) => m.getLatLng()));
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
    }
  }, [pins]);

  return <div ref={containerRef} style={{ height, borderRadius: 14 }} />;
}

// Edge Function pública (sem login): proxy pro Nominatim (OpenStreetMap)
// pra transformar endereço em coordenada. Fica no backend, não no
// browser, por dois motivos: a política de uso do Nominatim pede um
// User-Agent identificando a aplicação (mais fácil de garantir aqui do
// que confiar no header de cada navegador), e só chama quando alguém
// salva um endereço — nunca em lote — então o limite de 1 req/s da
// política nunca chega perto de estourar no volume de uso de hoje.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address) return json({ error: "endereço obrigatório" }, 400);

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "MaterImob/1.0 (https://materimob.com.br)" },
  });
  if (!res.ok) return json({ error: "erro ao consultar geocodificação" }, 502);

  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) {
    return json({ error: "endereço não encontrado" }, 404);
  }

  const lat = parseFloat(results[0].lat);
  const lng = parseFloat(results[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return json({ error: "coordenada inválida" }, 502);
  }

  return json({ lat, lng });
});

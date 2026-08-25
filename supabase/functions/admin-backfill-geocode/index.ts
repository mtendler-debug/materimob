// Edge Function autenticada (só platform_admin): geocodifica em lote
// tudo que já tem endereço mas ainda não tem coordenada — dado de
// antes da funcionalidade de mapas existir, que só ganha
// latitude/longitude ao ser criado ou ter o endereço editado de novo.
// Roda uma geocodificação de cada vez com pausa entre chamadas pra
// respeitar o limite de 1 req/s do Nominatim (mesma regra de
// geocode-address, aqui controlada manualmente porque é um lote numa
// função só, não uma chamada por ação de usuário).
import { createClient } from "npm:@supabase/supabase-js@2";

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

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const res = await fetch(url, { headers: { "User-Agent": "MaterImob/1.0 (https://materimob.com.br)" } });
  if (!res.ok) return null;
  const results = await res.json();
  if (!Array.isArray(results) || results.length === 0) return null;
  const lat = parseFloat(results[0].lat);
  const lng = parseFloat(results[0].lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mesmo fallback de geocode-address: CEP colado no final do endereço
// ("... São Paulo - SP, 04606-004") sozinho já derruba a busca do
// Nominatim, mesmo quando o resto do endereço é encontrável sem ele.
async function geocodeComFallback(address: string): Promise<{ lat: number; lng: number } | null> {
  const direto = await geocode(address);
  if (direto) return direto;

  const semCep = address.replace(/,?\s*\d{5}-?\d{3}\s*$/, "").trim();
  if (semCep && semCep !== address) {
    await sleep(1100);
    return await geocode(semCep);
  }
  return null;
}

const TABELAS = ["av_launches", "av_portfolio_properties", "av_properties", "organizations", "profiles"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "não autenticado" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: caller },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !caller) return json({ error: "não autenticado" }, 401);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: isAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!isAdmin) return json({ error: "acesso restrito ao time da plataforma" }, 403);

  let processados = 0;
  let geocodificados = 0;
  let semResultado = 0;

  for (const tabela of TABELAS) {
    const { data: linhas, error: selectError } = await admin
      .from(tabela)
      .select("id, address")
      .not("address", "is", null)
      .neq("address", "")
      .is("latitude", null);
    if (selectError || !linhas) continue;

    for (const linha of linhas) {
      processados++;
      const coords = await geocodeComFallback(linha.address);
      if (coords) {
        await admin.from(tabela).update({ latitude: coords.lat, longitude: coords.lng }).eq("id", linha.id);
        geocodificados++;
      } else {
        semResultado++;
      }
      await sleep(1100);
    }
  }

  return json({ processados, geocodificados, sem_resultado: semResultado });
});

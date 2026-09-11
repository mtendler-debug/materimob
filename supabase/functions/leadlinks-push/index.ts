// Proxy fino pro endpoint unificado de leads do Leadlinks (CRM de WhatsApp
// que o Marcos já usa em paralelo). Existe só pra manter a LEADLINKS_API_KEY
// fora do bundle do navegador — o corpo da chamada é repassado como está
// pro Leadlinks, sem lógica própria. verify_jwt fica ligado (padrão): só
// corretor logado no MaterImob pode disparar isso.
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const res = await fetch("https://api.leadlinks.app/public/tracking/create-lead", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("LEADLINKS_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return json(data, res.status);
});

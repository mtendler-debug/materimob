// Proxy fino pro endpoint unificado de leads do Leadlinks (CRM de WhatsApp
// que o Marcos já usa em paralelo). Existe só pra manter a LEADLINKS_API_KEY
// fora do bundle do navegador — o corpo da chamada é repassado como está
// pro Leadlinks, sem lógica própria. verify_jwt fica ligado (padrão), mas
// isso só garante "alguém logado" — e qualquer pessoa cria conta. O Leadlinks
// é a conta pessoal do Marcos, então a função confere que quem chama é o dono
// do canal (pc_sou_dono_do_canal: admin da plataforma + pc_config, hoje só
// ele); lead de qualquer outro corretor nunca sai do MaterImob.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "não autenticado" }, 401);
  const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: souDono, error: donoError } = await callerClient.rpc("pc_sou_dono_do_canal");
  if (donoError || souDono !== true) return json({ ignorado: true }, 200);

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

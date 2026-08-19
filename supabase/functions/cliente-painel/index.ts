// Edge Function pública (sem login): devolve, a partir do token
// permanente do cliente, a lista de todos os roteiros já criados pra ele
// — de qualquer corretor, de qualquer incorporadora — em vez de um
// roteiro isolado. É a "home" do cliente na plataforma.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "método não permitido" }, 405);

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return json({ error: "token obrigatório" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: client } = await admin
    .from("av_clients")
    .select("id, name")
    .eq("token", token)
    .maybeSingle();

  if (!client) return json({ error: "link inválido" }, 404);

  const { data: selections } = await admin
    .from("av_selections")
    .select("id, title, subtitle, token_form, token_panel, archived, created_at")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  return json({
    client: { name: client.name },
    selections: selections ?? [],
  });
});

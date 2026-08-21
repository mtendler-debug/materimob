// Edge Function pública (sem login): devolve o questionário de uma seleção
// a partir do token_form. Nunca aceita user_id/selection_id vindos do
// cliente — os dois são sempre derivados do token.
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

  const { data: selection, error: selError } = await admin
    .from("av_selections")
    .select("id, title, subtitle, criteria, archived")
    .eq("token_form", token)
    .maybeSingle();

  if (selError) return json({ error: "erro ao buscar seleção" }, 500);
  if (!selection) return json({ error: "link inválido" }, 404);
  if (selection.archived) return json({ error: "atendimento encerrado" }, 403);

  const { data: properties, error: propError } = await admin
    .from("av_properties")
    .select(
      "id, name, color, stage, address, summary, extra_criteria, questions, floor_plan_url, photo_urls, payment_terms, position, units:av_units(id, name, table_value, position)",
    )
    .eq("selection_id", selection.id)
    .order("position")
    .order("position", { foreignTable: "av_units" });

  if (propError) return json({ error: "erro ao buscar imóveis" }, 500);

  return json({
    title: selection.title,
    subtitle: selection.subtitle,
    criteria: selection.criteria,
    properties: properties ?? [],
  });
});

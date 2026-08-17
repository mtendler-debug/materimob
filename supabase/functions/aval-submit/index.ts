// Edge Function pública (sem login): grava uma avaliação a partir do
// token_form. user_id e selection_id vêm sempre do token, nunca do corpo.
// property_id/unit_id são conferidos contra a seleção antes de gravar.
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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const {
    token,
    property_id,
    unit_id,
    evaluator_name,
    evaluator_role,
    scores,
    overall_score,
    strengths,
    concerns,
    flagged,
  } = body as Record<string, unknown>;

  if (!token || !property_id || !evaluator_name) {
    return json({ error: "campos obrigatórios: token, property_id, evaluator_name" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: selection } = await admin
    .from("av_selections")
    .select("id, user_id, archived")
    .eq("token_form", token)
    .maybeSingle();

  if (!selection) return json({ error: "link inválido" }, 404);
  if (selection.archived) return json({ error: "atendimento encerrado" }, 403);

  const { data: property } = await admin
    .from("av_properties")
    .select("id, selection_id")
    .eq("id", property_id)
    .maybeSingle();

  if (!property || property.selection_id !== selection.id) {
    return json({ error: "imóvel não pertence a esta seleção" }, 400);
  }

  if (unit_id) {
    const { data: unit } = await admin
      .from("av_units")
      .select("id, property_id")
      .eq("id", unit_id)
      .maybeSingle();
    if (!unit || unit.property_id !== property_id) {
      return json({ error: "unidade não pertence a este imóvel" }, 400);
    }
  }

  const { data: inserted, error } = await admin
    .from("av_evaluations")
    .insert({
      user_id: selection.user_id,
      selection_id: selection.id,
      property_id,
      unit_id: unit_id ?? null,
      evaluator_name,
      evaluator_role: evaluator_role ?? null,
      scores: scores ?? {},
      overall_score: overall_score ?? null,
      strengths: strengths ?? null,
      concerns: concerns ?? null,
      flagged: flagged ?? [],
    })
    .select("id")
    .single();

  if (error) return json({ error: "erro ao gravar avaliação" }, 500);
  return json({ id: inserted.id }, 201);
});

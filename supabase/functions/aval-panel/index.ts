// Edge Function pública (sem login): devolve o consolidado de uma seleção
// a partir do token_panel — imóveis, avaliações, propostas e o ranking.
// Seleção arquivada continua respondendo aqui (só o formulário fecha).
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

// nota geral × 0,6 + (média dos critérios × 2) × 0,4 — critérios em 1..5,
// convertidos para 0..10 antes de entrar na conta.
function scoreDaAvaliacao(ev: { overall_score: number | null; scores: Record<string, number> | null }) {
  if (ev.overall_score == null) return null;
  const valores = Object.values(ev.scores ?? {}).filter((v) => typeof v === "number");
  const mediaCriterios = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;
  return ev.overall_score * 0.6 + mediaCriterios * 2 * 0.4;
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
    .select("id, title, subtitle, criteria, milestones, archived")
    .eq("token_panel", token)
    .maybeSingle();

  if (selError) return json({ error: "erro ao buscar seleção" }, 500);
  if (!selection) return json({ error: "link inválido" }, 404);

  const [{ data: properties }, { data: evaluations }, { data: proposals }] = await Promise.all([
    admin
      .from("av_properties")
      .select(
        "id, name, color, stage, address, summary, extra_criteria, questions, phases, position, units:av_units(id, name, table_value, position)",
      )
      .eq("selection_id", selection.id)
      .order("position")
      .order("position", { foreignTable: "av_units" }),
    admin
      .from("av_evaluations")
      .select(
        "id, property_id, unit_id, evaluator_name, evaluator_role, scores, overall_score, strengths, concerns, flagged, created_at",
      )
      .eq("selection_id", selection.id)
      .order("created_at"),
    admin
      .from("av_proposals")
      .select("id, property_id, unit_id, proposer_name, value, table_value, note, buy_intent, created_at")
      .eq("selection_id", selection.id)
      .order("created_at"),
  ]);

  const porImovel = new Map<string, number[]>();
  for (const ev of evaluations ?? []) {
    const score = scoreDaAvaliacao(ev);
    if (score == null) continue;
    const lista = porImovel.get(ev.property_id) ?? [];
    lista.push(score);
    porImovel.set(ev.property_id, lista);
  }

  const ranking = (properties ?? [])
    .filter((p) => porImovel.has(p.id))
    .map((p) => {
      const notas = porImovel.get(p.id)!;
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;
      return {
        property_id: p.id,
        name: p.name,
        score: Math.round(media * 100) / 100,
        evaluations_count: notas.length,
      };
    })
    .sort((a, b) => b.score - a.score);

  const semAvaliacao = (properties ?? [])
    .filter((p) => !porImovel.has(p.id))
    .map((p) => ({ property_id: p.id, name: p.name }));

  return json({
    title: selection.title,
    subtitle: selection.subtitle,
    criteria: selection.criteria,
    milestones: selection.milestones,
    archived: selection.archived,
    properties: properties ?? [],
    evaluations: evaluations ?? [],
    proposals: proposals ?? [],
    ranking,
    unrated: semAvaliacao,
  });
});

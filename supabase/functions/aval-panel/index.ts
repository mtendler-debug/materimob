// Edge Function pública (sem login): devolve o consolidado de uma seleção
// a partir do token_panel — ranking, comparativo, propostas e cronograma.
// Seleção arquivada continua respondendo aqui (só o formulário fecha).
//
// A agregação replica exatamente a função aggregate() do sistema anterior
// (api.mjs): score = notaMedia×0,6 + (mediaCriterios×2)×0,4, calculado a
// partir das MÉDIAS agregadas por imóvel — não da média dos scores
// individuais, que dá um número diferente quando há mais de uma avaliação.
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

function avg(nums: (number | null | undefined)[]) {
  const v = nums.filter((n): n is number => typeof n === "number" && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
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
      .order("created_at", { ascending: false }),
  ]);

  const props = properties ?? [];
  const evals = evaluations ?? [];
  const criteria = selection.criteria ?? [];

  const porProjeto = props.map((p) => {
    const mine = evals.filter((e) => e.property_id === p.id);
    const allCriteria = [...criteria, ...(p.extra_criteria ?? [])];
    const medias = allCriteria.map((c) => ({
      criterio: c,
      media: avg(mine.map((e) => (e.scores as Record<string, number> | null)?.[c])),
    }));
    const mediaCriterios = avg(medias.map((m) => m.media));
    const notaMedia = avg(mine.map((e) => e.overall_score));

    const grupos = new Map<string, typeof mine>();
    for (const e of mine) {
      const k = e.unit_id ?? "";
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push(e);
    }
    const unitById: Record<string, { id: string; name: string; table_value: number | null }> =
      Object.fromEntries((p.units ?? []).map((u) => [u.id, u]));
    const porUnidade = [...grupos.entries()]
      .map(([uid, lista]) => {
        const un = unitById[uid];
        return {
          unit_id: uid || null,
          name: un ? un.name : "Empreendimento em geral",
          table_value: un ? (un.table_value ?? null) : null,
          evaluations_count: lista.length,
          overall_avg: avg(lista.map((e) => e.overall_score)),
        };
      })
      .sort((a, b) => (b.overall_avg ?? 0) - (a.overall_avg ?? 0));

    const comentarios = mine
      .filter((e) => e.strengths || e.concerns)
      .map((e) => ({
        evaluator_name: e.evaluator_name,
        evaluator_role: e.evaluator_role,
        overall_score: e.overall_score,
        strengths: e.strengths,
        concerns: e.concerns,
        unit_name: e.unit_id ? unitById[e.unit_id]?.name : null,
        created_at: e.created_at,
      }));

    return {
      property: p,
      avaliacoes: mine.length,
      notaMedia,
      mediaCriterios,
      medias,
      porUnidade,
      comentarios,
    };
  });

  const ranking = porProjeto
    .filter((x) => x.avaliacoes > 0 && x.notaMedia != null)
    .map((x) => {
      const critEm10 = x.mediaCriterios != null ? x.mediaCriterios * 2 : x.notaMedia!;
      const score = x.notaMedia! * 0.6 + critEm10 * 0.4;
      return {
        property_id: x.property.id,
        name: x.property.name,
        color: x.property.color,
        score: Math.round(score * 100) / 100,
        notaMedia: Math.round(x.notaMedia! * 10) / 10,
        mediaCriterios: x.mediaCriterios != null ? Math.round(x.mediaCriterios * 10) / 10 : null,
        avaliacoes: x.avaliacoes,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, posicao: i + 1 }));

  const unrated = porProjeto
    .filter((x) => x.avaliacoes === 0)
    .map((x) => ({ property_id: x.property.id, name: x.property.name }));

  const avaliadores = new Set(
    evals.map((e) => (e.evaluator_name || "").trim().toLowerCase()).filter(Boolean),
  );

  return json({
    title: selection.title,
    subtitle: selection.subtitle,
    criteria,
    milestones: selection.milestones,
    archived: selection.archived,
    properties: props,
    ranking,
    unrated,
    comparativo: porProjeto.map((x) => ({
      property_id: x.property.id,
      name: x.property.name,
      color: x.property.color,
      medias: x.medias,
      mediaCriterios: x.mediaCriterios,
    })),
    porUnidade: porProjeto
      .filter((x) => x.porUnidade.filter((u) => u.evaluations_count > 0).length >= 2)
      .map((x) => ({
        property_id: x.property.id,
        name: x.property.name,
        color: x.property.color,
        units: x.porUnidade,
      })),
    comentarios: porProjeto
      .filter((x) => x.comentarios.length > 0)
      .map((x) => ({
        property_id: x.property.id,
        name: x.property.name,
        color: x.property.color,
        comentarios: x.comentarios,
      })),
    proposals: proposals ?? [],
    totalAvaliacoes: evals.length,
    totalAvaliadores: avaliadores.size,
  });
});

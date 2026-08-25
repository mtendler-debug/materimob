// Edge Function pública (sem login): grava uma proposta a partir do
// token_panel. table_value é copiado da unidade no momento da proposta —
// nunca recalculado depois, para o deságio histórico não se reescrever.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const id = url.searchParams.get("id");
    if (!token || !id) return json({ error: "parâmetros obrigatórios: token, id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: selection } = await admin
      .from("av_selections")
      .select("id, archived")
      .eq("token_panel", token)
      .maybeSingle();

    if (!selection) return json({ error: "link inválido" }, 404);
    if (selection.archived) return json({ error: "atendimento encerrado" }, 403);

    const { error } = await admin
      .from("av_proposals")
      .delete()
      .eq("id", id)
      .eq("selection_id", selection.id);

    if (error) return json({ error: "erro ao remover proposta" }, 500);
    return json({ ok: true });
  }

  if (req.method !== "POST") return json({ error: "método não permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }

  const { token, property_id, unit_id, proposer_name, value, note, buy_intent } = body;

  if (!token || !property_id || !proposer_name || typeof value !== "number") {
    return json({ error: "campos obrigatórios: token, property_id, proposer_name, value" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: selection } = await admin
    .from("av_selections")
    .select("id, user_id, archived")
    .eq("token_panel", token)
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

  let tableValue: number | null = null;
  let launchReservation: { ok: boolean; message: string } | null = null;
  let portfolioReservation: { ok: boolean; message: string } | null = null;
  if (unit_id) {
    const { data: unit } = await admin
      .from("av_units")
      .select("id, property_id, table_value, launch_unit_id, portfolio_unit_id")
      .eq("id", unit_id)
      .maybeSingle();
    if (!unit || unit.property_id !== property_id) {
      return json({ error: "unidade não pertence a este imóvel" }, 400);
    }
    tableValue = unit.table_value;

    // Unidade de um lançamento: interesse confirmado tenta reservar no
    // estoque compartilhado. A função é atômica — se outro corretor
    // reservou um segundo antes, essa chamada falha e avisamos aqui,
    // em vez de deixar a proposta parecer válida sobre uma unidade que
    // já não está mais disponível.
    if (buy_intent && unit.launch_unit_id) {
      const { error: reserveError } = await admin.rpc("reserve_launch_unit", {
        unit_id: unit.launch_unit_id,
        client_name: proposer_name,
        corretor_id: selection.user_id,
      });
      launchReservation = reserveError
        ? { ok: false, message: "Essa unidade acabou de ser reservada por outro atendimento." }
        : { ok: true, message: "Unidade reservada no lançamento." };
    }

    // Mesma lógica pra unidade de portfólio (imóvel pronto, fora de
    // lançamento) — reserve_portfolio_unit é o espelho atômico de
    // reserve_launch_unit.
    if (buy_intent && unit.portfolio_unit_id) {
      const { error: reserveError } = await admin.rpc("reserve_portfolio_unit", {
        unit_id: unit.portfolio_unit_id,
        client_name: proposer_name,
        corretor_id: selection.user_id,
      });
      portfolioReservation = reserveError
        ? { ok: false, message: "Essa unidade acabou de ser reservada por outro atendimento." }
        : { ok: true, message: "Unidade reservada no portfólio." };
    }
  }

  const { data: inserted, error } = await admin
    .from("av_proposals")
    .insert({
      user_id: selection.user_id,
      selection_id: selection.id,
      property_id,
      unit_id: unit_id ?? null,
      proposer_name,
      value,
      table_value: tableValue,
      note: note ?? null,
      buy_intent: !!buy_intent,
    })
    .select("id, table_value")
    .single();

  if (error) return json({ error: "erro ao gravar proposta" }, 500);

  const desagio = inserted.table_value ? (1 - value / inserted.table_value) * 100 : null;
  return json(
    { id: inserted.id, desagio, launch_reservation: launchReservation, portfolio_reservation: portfolioReservation },
    201,
  );
});

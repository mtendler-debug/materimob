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
    .select("id, title, subtitle, token_form, token_panel, archived, created_at, user_id")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false });

  const list = selections ?? [];
  const userIds = [...new Set(list.map((s) => s.user_id))];

  // Nome da organização de cada corretor (quando ele pertence a uma) —
  // mais reconhecível pro cliente do que um e-mail solto. Isso é o próprio
  // corretor que está atendendo esse cliente, então mostrar essa
  // informação pra ele não tem nada a ver com a privacidade entre
  // corretores concorrentes que vale no painel da incorporadora.
  const { data: memberships } = userIds.length
    ? await admin
        .from("organization_members")
        .select("user_id, organizations(name)")
        .in("user_id", userIds)
    : { data: [] };
  const orgByUser = new Map((memberships ?? []).map((m) => [m.user_id, m.organizations?.name ?? null]));

  const emailByUser = new Map();
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    emailByUser.set(id, data?.user?.email ?? null);
  }

  return json({
    client: { name: client.name },
    selections: list.map((s) => ({
      ...s,
      user_id: undefined,
      corretor_email: emailByUser.get(s.user_id) ?? null,
      corretor_org: orgByUser.get(s.user_id) ?? null,
    })),
  });
});

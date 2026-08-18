// Edge Function autenticada (exige login — verify_jwt padrão, sem override
// no config.toml): aceita um convite de organização. O usuário vem sempre
// do JWT de quem está logado, nunca do corpo da requisição — impede que
// alguém aceite um convite em nome de outra pessoa.
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !user) return json({ error: "não autenticado" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  const { token } = body;
  if (!token) return json({ error: "token obrigatório" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: invite } = await admin
    .from("organization_invites")
    .select("id, organization_id, role, email, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return json({ error: "convite inválido" }, 404);
  if (invite.accepted_at) return json({ error: "convite já foi utilizado" }, 409);

  const { error: memberError } = await admin.from("organization_members").upsert(
    { organization_id: invite.organization_id, user_id: user.id, role: invite.role },
    { onConflict: "organization_id,user_id" },
  );
  if (memberError) return json({ error: "erro ao entrar na organização" }, 500);

  await admin.from("organization_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", invite.organization_id)
    .maybeSingle();

  return json({ ok: true, organization_id: invite.organization_id, organization_name: org?.name ?? null, role: invite.role });
});

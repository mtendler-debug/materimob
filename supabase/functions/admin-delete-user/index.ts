// Edge Function autenticada (exige login): exclui uma conta da
// plataforma. Só quem já é platform_admin pode chamar — a checagem usa
// is_platform_admin() com o client service_role, nunca confia em nada
// vindo do corpo da requisição além do id alvo. Nunca apaga a própria
// conta por aqui (mesma trava que já existia no toggle de admin do
// front, replicada no backend pra não depender só do client).
//
// Usa supabase.auth.admin.deleteUser — nunca "delete from auth.users"
// direto — a Admin API cuida de sessões/tokens/identidades junto. As
// FKs em auth.users já foram ajustadas (migrations_admin_usuarios.sql):
// dado pessoal do usuário (roteiros, avaliações, propostas, portfólio
// próprio) cascateia; autoria em recurso compartilhado (organização,
// lançamento) vira null, sem apagar o recurso.
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
    data: { user: caller },
    error: userError,
  } = await callerClient.auth.getUser();
  if (userError || !caller) return json({ error: "não autenticado" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  const targetUserId = body.target_user_id;
  if (!targetUserId || typeof targetUserId !== "string") {
    return json({ error: "target_user_id obrigatório" }, 400);
  }
  if (targetUserId === caller.id) {
    return json({ error: "você não pode excluir a própria conta por aqui" }, 400);
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: isAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!isAdmin) return json({ error: "acesso restrito ao time da plataforma" }, 403);

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});

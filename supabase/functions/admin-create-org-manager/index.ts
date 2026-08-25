// Edge Function autenticada (exige login): cria uma organização nova
// (imobiliária ou incorporadora) junto com a conta do primeiro gestor
// dela — pessoa que ainda não tem cadastro. Só platform_admin chama.
//
// Cria a conta via admin.inviteUserByEmail (nunca uma senha provisória
// que o admin manuseia — a pessoa define a própria senha pelo link do
// e-mail). O trigger handle_new_user já cria a linha em profiles a
// partir do raw_user_meta_data enviado aqui. Depois cria a organização
// com created_by = a conta nova — o trigger on_organization_created já
// adiciona essa pessoa como diretor sozinho, sem eu tocar em
// organization_members. Se a criação da organização falhar, desfaz a
// conta pra não deixar usuário órfão sem organização nenhuma.
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
  const orgName = typeof body.org_name === "string" ? body.org_name.trim() : "";
  const orgTipo = body.org_tipo;
  const managerEmail = typeof body.manager_email === "string" ? body.manager_email.trim() : "";
  const managerName = typeof body.manager_name === "string" ? body.manager_name.trim() : "";
  const origin = typeof body.origin === "string" ? body.origin : supabaseUrl;

  if (!orgName) return json({ error: "nome da organização obrigatório" }, 400);
  if (orgTipo !== "imobiliaria" && orgTipo !== "incorporadora") {
    return json({ error: "tipo precisa ser imobiliaria ou incorporadora" }, 400);
  }
  if (!managerEmail) return json({ error: "e-mail do gestor obrigatório" }, 400);
  if (!managerName) return json({ error: "nome do gestor obrigatório" }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: isAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (!isAdmin) return json({ error: "acesso restrito ao time da plataforma" }, 403);

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(managerEmail, {
    data: { full_name: managerName, account_type: orgTipo },
    redirectTo: `${origin}/entrar`,
  });
  if (inviteError || !invited?.user) {
    return json({ error: inviteError?.message ?? "erro ao convidar o gestor" }, 500);
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, tipo: orgTipo, created_by: invited.user.id })
    .select("id, name, tipo")
    .single();

  if (orgError) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return json({ error: "erro ao criar organização: " + orgError.message }, 500);
  }

  return json({ ok: true, organization: org, manager: { id: invited.user.id, email: managerEmail } });
});

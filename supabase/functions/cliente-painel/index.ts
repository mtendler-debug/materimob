// Edge Function pública (sem login): devolve, a partir do token
// permanente do cliente, a lista de roteiros dele — a "home" do cliente.
//
// Dois tipos de token:
//  - av_client_relations.token (o atual): um por corretor+cliente. Mostra só
//    os roteiros daquele corretor — um corretor nunca vê, pelo próprio link, o
//    que outro corretor montou pro mesmo cliente.
//  - av_clients.token (o antigo, compartilhado): continua funcionando para
//    quem já recebeu o link, mostrando os roteiros de todos os corretores como
//    antes. Desde 2026-10-21 nenhum corretor consegue mais ler esse token, e o
//    app só distribui o link por corretor.
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

  const { data: relacao } = await admin
    .from("av_client_relations")
    .select("user_id, client_id")
    .eq("token", token)
    .maybeSingle();

  const { data: client } = relacao
    ? await admin.from("av_clients").select("id, name").eq("id", relacao.client_id).maybeSingle()
    : await admin.from("av_clients").select("id, name").eq("token", token).maybeSingle();

  if (!client) return json({ error: "link inválido" }, 404);

  let query = admin
    .from("av_selections")
    .select("id, title, subtitle, token_form, token_panel, archived, created_at, user_id")
    .eq("client_id", client.id);
  if (relacao) query = query.eq("user_id", relacao.user_id);
  const { data: selections } = await query.order("created_at", { ascending: false });

  const list = selections ?? [];
  const userIds = [...new Set([...list.map((s) => s.user_id), ...(relacao ? [relacao.user_id] : [])])];

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

  // O cliente vê o nome do corretor, não o e-mail — só cai pro e-mail se a
  // pessoa nunca preencheu o próprio perfil.
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] };
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const nomeCorretor = (id: string) => nameByUser.get(id) || emailByUser.get(id) || null;

  return json({
    client: { name: client.name },
    // Presente só no link por corretor: a página diz de quem são os imóveis.
    corretor: relacao ? { nome: nomeCorretor(relacao.user_id) } : null,
    selections: list.map((s) => ({
      ...s,
      user_id: undefined,
      corretor_nome: nomeCorretor(s.user_id),
      corretor_org: orgByUser.get(s.user_id) ?? null,
    })),
  });
});

// Leitura pública (sem login) pro formulário de registro por token:
// dados da parceira, corretores dela e empreendimentos/unidades
// disponíveis. pc_parceiras/pc_parceira_corretores/pc_empreendimentos só
// têm RLS por owner_id — o visitante anônimo não tem outro jeito de ler
// isso, daí a função com service role, igual aval-form.
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

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return json({ error: "token obrigatório" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: parceira } = await admin
    .from("pc_parceiras")
    .select("id, owner_id, nome_fantasia, status, token_ativo")
    .eq("token_registro", token)
    .maybeSingle();

  if (!parceira) return json({ error: "link inválido" }, 404);
  if (!parceira.token_ativo || parceira.status !== "ativa") {
    return json({ error: "link não está mais ativo" }, 403);
  }

  const [{ data: corretores }, { data: empreendimentos }] = await Promise.all([
    admin
      .from("pc_parceira_corretores")
      .select("id, nome")
      .eq("parceira_id", parceira.id)
      .eq("ativo", true)
      .order("nome"),
    admin
      .from("pc_empreendimentos")
      .select(
        "id, nome, pc_unidades(id, identificacao, tipologia, metragem_privativa, valor_total, enquadramento, disponivel, destaque_rede)",
      )
      .eq("owner_id", parceira.owner_id)
      .eq("ativo", true)
      .order("nome"),
  ]);

  return json({
    parceira: { id: parceira.id, nome_fantasia: parceira.nome_fantasia },
    corretores: corretores ?? [],
    empreendimentos: (empreendimentos ?? []).map((e) => ({
      ...e,
      pc_unidades: (e.pc_unidades ?? []).filter((u: { disponivel: boolean }) => u.disponivel),
    })),
  });
});

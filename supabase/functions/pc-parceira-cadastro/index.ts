// Autocadastro público de parceira (imobiliária ou corretor autônomo),
// sem login, sem token — um único link que o Marcos compartilha
// amplamente. Nasce sempre com validado=false e status_funil
// 'nao_contatado'; nunca entra direto como parceira ativa
// (03-Cadastro-Parceiras-Regras.md, seção 3).
//
// Diferente de pc-registro-cliente (que é por parceira específica via
// token_registro), aqui ainda não existe "a parceira" — é ela mesma se
// cadastrando. Sem um jeito de saber de qual corretor/owner do
// MaterImob é essa ficha, resolve pelo e-mail em PC_OWNER_EMAIL — hoje
// só o Marcos usa o módulo Parcerias; se isso crescer pra vários donos,
// o link passa a precisar de um identificador próprio por owner.
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
    nome_fantasia,
    cidade,
    creci_juridico,
    segmento_foco,
    responsavel_nome,
    responsavel_telefone,
    responsavel_email,
  } = body as Record<string, unknown>;

  if (!nome_fantasia || !cidade || !segmento_foco || !responsavel_nome) {
    return json(
      { error: "campos obrigatórios: nome_fantasia, cidade, segmento_foco, responsavel_nome" },
      400,
    );
  }

  const ownerEmail = Deno.env.get("PC_OWNER_EMAIL");
  if (!ownerEmail) return json({ error: "cadastro indisponível no momento" }, 500);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: users } = await admin.auth.admin.listUsers();
  const owner = users?.users.find((u) => u.email === ownerEmail);
  if (!owner) return json({ error: "cadastro indisponível no momento" }, 500);

  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);

  const { error: insertError } = await admin.from("pc_parceiras").insert({
    owner_id: owner.id,
    nome_fantasia,
    cidade,
    creci_juridico: creci_juridico ?? null,
    segmento_foco,
    responsavel_nome,
    responsavel_telefone: responsavel_telefone ?? null,
    responsavel_email: responsavel_email ?? null,
    status_funil: "nao_contatado",
    origem: "Autocadastro",
    validado: false,
    token_registro: token,
  });

  if (insertError) return json({ error: "erro ao enviar cadastro: " + insertError.message }, 500);

  return json({ ok: true }, 201);
});

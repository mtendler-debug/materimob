// Servidor MCP do Materimob — expõe o fluxo do Avaliador (identificar
// cliente pelo telefone, ver roteiro, responder critérios, ver
// resultado) pra um agente de IA externo (o "Corretor de Imóveis
// Virtual" no Console da Anthropic, futuramente ligado ao WhatsApp).
//
// Autenticação própria, separada do login normal do corretor: toda
// chamada precisa de `Authorization: Bearer <MCP_ACCESS_TOKEN>` — o
// agente não é um usuário do Materimob, não tem JWT do Supabase.
//
// `identify_client`/`list_roteiros` são lógica nova (não existia jeito
// de ir de telefone → cliente). `get_roteiro`/`submit_evaluation`/
// `get_result` reaproveitam via fetch interno as funções públicas que
// já existem (`aval-form`/`aval-submit`/`aval-panel`) — a validação de
// propriedade/arquivamento e a fórmula de ranking continuam existindo
// só naquele lugar, não duplicadas aqui.
import { createClient } from "npm:@supabase/supabase-js@2";
import { McpServer } from "npm:@modelcontextprotocol/sdk@1.25.3/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "npm:@modelcontextprotocol/sdk@1.25.3/server/webStandardStreamableHttp.js";
import { z } from "npm:zod@^4.1.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
}

// Chama uma das funções aval-* públicas já existentes, servidor a
// servidor — reaproveita a lógica delas em vez de duplicar.
async function callFn(name: string, init: RequestInit & { query?: Record<string, string> } = {}) {
  const url = new URL(`${SUPABASE_URL}/functions/v1/${name}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
    body: init.body,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function digitsOnly(s: string) {
  return (s ?? "").replace(/\D/g, "");
}
function suffix(s: string, n: number) {
  return digitsOnly(s).slice(-n);
}

function textResult(obj: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj) }], isError };
}

async function identifyClient(phone: string) {
  const incoming8 = suffix(phone, 8);
  if (!incoming8) return { found: false as const };

  const { data: clients } = await admin()
    .from("av_clients")
    .select("id, name, phone")
    .not("phone", "is", null)
    .neq("phone", "");

  const matches = (clients ?? []).filter((c) => suffix(c.phone ?? "", 8) === incoming8);
  if (matches.length === 0) return { found: false as const };
  if (matches.length === 1) return { found: true as const, client_id: matches[0].id, name: matches[0].name };

  // Mais de um candidato com os mesmos 8 dígitos finais — tenta
  // desempatar com os 10 (inclui DDD). Se ainda ficar ambíguo, falha
  // fechado: melhor "não encontrado" do que mostrar o roteiro de uma
  // pessoa pra outra.
  const incoming10 = suffix(phone, 10);
  const narrowed = matches.filter((c) => suffix(c.phone ?? "", 10) === incoming10);
  if (narrowed.length === 1) return { found: true as const, client_id: narrowed[0].id, name: narrowed[0].name };
  return { found: false as const, ambiguous: true as const };
}

async function listRoteiros(clientId: string) {
  const { data: rows } = await admin()
    .from("av_selections")
    .select("token_form, title, subtitle, created_at, user_id")
    .eq("client_id", clientId)
    .eq("archived", false)
    .order("created_at", { ascending: false });

  const selections = rows ?? [];
  const userIds = [...new Set(selections.map((r) => r.user_id))];
  let corretorNomes: Record<string, string | null> = {};
  if (userIds.length) {
    const { data: profiles } = await admin().from("profiles").select("id, full_name").in("id", userIds);
    corretorNomes = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  }

  return {
    roteiros: selections.map((r) => ({
      token_form: r.token_form,
      title: r.title,
      subtitle: r.subtitle,
      corretor_nome: corretorNomes[r.user_id] ?? null,
      created_at: r.created_at,
    })),
  };
}

async function getRoteiro(tokenForm: string) {
  const { ok, status, data } = await callFn("aval-form", { query: { token: tokenForm } });
  if (!ok) return { error: data.error ?? "erro ao buscar roteiro", status };

  const criteria: string[] = data.criteria ?? [];
  const unitCriteria: string[] = data.unit_criteria ?? [];
  const properties = (data.properties ?? []).map((p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    address: p.address,
    summary: p.summary,
    questions: p.questions ?? [],
    criteria: [...criteria, ...((p.extra_criteria as string[]) ?? [])],
    units: ((p.units as Record<string, unknown>[]) ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      criteria: [...unitCriteria, ...((p.extra_unit_criteria as string[]) ?? [])],
    })),
  }));

  return { title: data.title, subtitle: data.subtitle, properties };
}

async function submitEvaluation(input: {
  token_form: string;
  property_id: string;
  unit_id?: string;
  evaluator_name: string;
  scores: Record<string, number>;
  overall_score: number;
  strengths?: string;
  concerns?: string;
  flagged?: string[];
}) {
  const { ok, status, data } = await callFn("aval-submit", {
    method: "POST",
    body: JSON.stringify({
      token: input.token_form,
      property_id: input.property_id,
      unit_id: input.unit_id ?? null,
      evaluator_name: input.evaluator_name,
      evaluator_role: "cliente",
      scores: input.scores,
      overall_score: input.overall_score,
      strengths: input.strengths ?? null,
      concerns: input.concerns ?? null,
      flagged: input.flagged ?? [],
    }),
  });
  if (!ok) return { error: data.error ?? "erro ao gravar avaliação", status };
  return { id: data.id };
}

async function getResult(tokenForm: string) {
  const { data: selection } = await admin()
    .from("av_selections")
    .select("token_panel")
    .eq("token_form", tokenForm)
    .maybeSingle();
  if (!selection) return { error: "roteiro não encontrado", status: 404 };

  const { ok, status, data } = await callFn("aval-panel", { query: { token: selection.token_panel } });
  if (!ok) return { error: data.error ?? "erro ao buscar resultado", status };

  return {
    title: data.title,
    totalAvaliacoes: data.totalAvaliacoes,
    ranking: (data.ranking ?? []).map((r: Record<string, unknown>) => ({
      name: r.name,
      posicao: r.posicao,
      score: r.score,
      notaMedia: r.notaMedia,
      avaliacoes: r.avaliacoes,
    })),
  };
}

function buildServer() {
  const server = new McpServer({ name: "materimob-avaliador", version: "1.0.0" });

  server.registerTool(
    "identify_client",
    {
      title: "Identificar cliente pelo telefone",
      description:
        "Encontra o cliente do Materimob a partir do número de telefone que está conversando (formato E.164, ex.: +5511999998888). Não cria cliente novo.",
      inputSchema: { phone: z.string() },
    },
    async ({ phone }) => textResult(await identifyClient(phone)),
  );

  server.registerTool(
    "list_roteiros",
    {
      title: "Listar roteiros do cliente",
      description: "Lista os roteiros (avaliações de imóveis) ativos de um cliente já identificado.",
      inputSchema: { client_id: z.string() },
    },
    async ({ client_id }) => textResult(await listRoteiros(client_id)),
  );

  server.registerTool(
    "get_roteiro",
    {
      title: "Ver imóveis e critérios do roteiro",
      description:
        "Devolve os imóveis de um roteiro e os critérios que o cliente deve avaliar em cada um (geral e por unidade).",
      inputSchema: { token_form: z.string() },
    },
    async ({ token_form }) => textResult(await getRoteiro(token_form)),
  );

  server.registerTool(
    "submit_evaluation",
    {
      title: "Registrar avaliação do cliente",
      description:
        "Grava a avaliação que o cliente deu a um imóvel (ou unidade): nota de 1 a 5 por critério, nota geral de 1 a 10, pontos fortes e fracos.",
      inputSchema: {
        token_form: z.string(),
        property_id: z.string(),
        unit_id: z.string().optional(),
        evaluator_name: z.string(),
        scores: z.record(z.string(), z.number()),
        overall_score: z.number(),
        strengths: z.string().optional(),
        concerns: z.string().optional(),
        flagged: z.array(z.string()).optional(),
      },
    },
    async (input) => {
      const result = await submitEvaluation(input);
      return textResult(result, Boolean((result as { error?: string }).error));
    },
  );

  server.registerTool(
    "get_result",
    {
      title: "Ver resultado do roteiro",
      description: "Devolve o ranking dos imóveis do roteiro com base nas avaliações já registradas.",
      inputSchema: { token_form: z.string() },
    },
    async ({ token_form }) => textResult(await getResult(token_form)),
  );

  return server;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expected = Deno.env.get("MCP_ACCESS_TOKEN");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return new Response(JSON.stringify({ error: "não autorizado" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  for (const [k, v] of Object.entries(corsHeaders)) res.headers.set(k, v);
  return res;
});

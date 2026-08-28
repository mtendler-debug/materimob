// Edge Function autenticada (qualquer corretor logado, sem checagem de
// papel/organização): recebe URLs de book/tabela já enviados pro bucket
// "books", manda o material pra API da Claude e devolve um rascunho
// estruturado (nome, endereço, resumo, condições, unidades) pro
// frontend pré-preencher o cadastro de lançamento/imóvel — quem decide
// o que salvar é sempre a pessoa, revisando antes de confirmar. Esta
// função não toca o banco: não precisa de service_role, só confirma
// que quem chamou está autenticado.
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

// Evita estourar a pilha do jeito ingênuo (String.fromCharCode(...array)
// com um array grande) — converte em pedaços.
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function toContentBlock(mediaType: string, base64: string) {
  if (mediaType === "application/pdf") {
    return { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
  }
  if (mediaType === "image/png" || mediaType === "image/jpeg" || mediaType === "image/webp") {
    return { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } };
  }
  return null;
}

const EXTRACTION_TOOL = {
  name: "salvar_dados_extraidos",
  description: "Salva os dados estruturados extraídos do book/tabela de um empreendimento ou imóvel imobiliário.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "Nome do empreendimento ou imóvel" },
      address: { type: "string", description: "Endereço completo, se aparecer no material" },
      summary: {
        type: "string",
        description: "Resumo: construtora/incorporadora, arquitetura, metragens, vagas de garagem",
      },
      payment_terms: {
        type: "string",
        description: "Condições de pagamento descritas no material (entrada, parcelas, financiamento)",
      },
      condo_value: { type: "number", description: "Valor do condomínio mensal, se houver" },
      iptu_value: { type: "number", description: "Valor do IPTU, se houver" },
      units: {
        type: "array",
        description: "Unidades listadas na tabela de preços, uma por linha",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Identificação da unidade (número, tipologia, metragem)" },
            table_value: { type: "number", description: "Valor de tabela dessa unidade" },
          },
          required: ["name"],
        },
      },
    },
    required: ["name"],
  },
};

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

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return json({ error: "Extração de book não está configurada (falta ANTHROPIC_API_KEY)." }, 500);
  }

  const { file_urls } = await req.json().catch(() => ({}));
  if (!Array.isArray(file_urls) || file_urls.length === 0) {
    return json({ error: "Nenhum arquivo enviado." }, 400);
  }
  if (file_urls.length > 6) {
    return json({ error: "Envie no máximo 6 arquivos por vez." }, 400);
  }

  const blocks = [];
  for (const url of file_urls) {
    const fileRes = await fetch(url);
    if (!fileRes.ok) return json({ error: `Não consegui baixar um dos arquivos enviados.` }, 400);
    const mediaType = fileRes.headers.get("content-type") || "application/octet-stream";
    const bytes = new Uint8Array(await fileRes.arrayBuffer());
    const base64 = bytesToBase64(bytes);
    const block = toContentBlock(mediaType, base64);
    if (!block) return json({ error: `Tipo de arquivo não suportado: ${mediaType}.` }, 400);
    blocks.push(block);
  }

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      system:
        "Você extrai dados estruturados de materiais imobiliários brasileiros (books de lançamento, tabelas de preço, fichas de imóvel) para cadastro num sistema. Seja fiel ao material — nunca invente números, endereços ou unidades que não estejam explícitos. Use null para o que não encontrar.",
      messages: [
        {
          role: "user",
          content: [
            ...blocks,
            {
              type: "text",
              text: "Leia o material anexado (book e/ou tabela de preços de um empreendimento ou imóvel imobiliário) e extraia os dados pedidos na ferramenta salvar_dados_extraidos.",
            },
          ],
        },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "salvar_dados_extraidos" },
    }),
  });

  if (!anthropicRes.ok) {
    const errBody = await anthropicRes.text();
    return json({ error: "Erro ao consultar a IA: " + errBody.slice(0, 300) }, 502);
  }

  const result = await anthropicRes.json();
  const toolUse = (result.content ?? []).find((c: { type: string }) => c.type === "tool_use");
  if (!toolUse) {
    return json({ error: "A IA não retornou dados estruturados. Tente novamente ou preencha manualmente." }, 502);
  }

  return json({ data: toolUse.input });
});

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

// Fase 1 ("Porteiro e eco"): recebe webhook do WhatsApp, valida, grava em
// `mensagens`, e roteia — sem nenhuma chamada à Claude API ainda (isso é
// Fase 2). Responde 200 rápido; nada aqui deve esperar rede lenta.

function admin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function digitsOnly(s) {
  return (s || "").replace(/\D/g, "");
}

function isMarcos(fromDigits) {
  const marcos = digitsOnly(process.env.MARCOS_TELEFONE);
  return marcos.length >= 8 && fromDigits.slice(-8) === marcos.slice(-8);
}

function validSignature(rawBody, signatureHeader) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function ensureConversa(db, telefone, userId) {
  await db
    .from("conversas_agente")
    .upsert({ telefone, user_id: userId }, { onConflict: "telefone", ignoreDuplicates: true });
}

async function handleComando(db, telefone, userId, texto) {
  const arg = texto.trim().toLowerCase().replace(/^#mater\s*/, "");
  if (arg === "on") {
    await db
      .from("conversas_agente")
      .update({ agente_ativo: true, estado: "ativo" })
      .eq("telefone", telefone)
      .eq("user_id", userId);
  } else if (arg === "off") {
    await db
      .from("conversas_agente")
      .update({ agente_ativo: false, estado: "pausado" })
      .eq("telefone", telefone)
      .eq("user_id", userId);
  }
}

async function processMessage(db, userId, msg) {
  const from = digitsOnly(msg.from);
  const direcao = isMarcos(from) ? "marcos_app" : "cliente";
  const texto = msg.text?.body ?? null;

  await ensureConversa(db, from, userId);

  const { error } = await db.from("mensagens").insert({
    telefone: from,
    user_id: userId,
    direcao,
    wa_message_id: msg.id,
    tipo: msg.type,
    conteudo: texto,
  });
  // wa_message_id é unique — erro de conflito aqui é deduplicação
  // funcionando, não uma falha real.
  if (error && error.code !== "23505") {
    console.error("insert mensagem falhou", error);
  }

  await db
    .from("conversas_agente")
    .update({ ultima_mensagem_em: new Date().toISOString() })
    .eq("telefone", from)
    .eq("user_id", userId);

  if (direcao === "marcos_app") {
    await db
      .from("conversas_agente")
      .update({ ultimo_humano_em: new Date().toISOString() })
      .eq("telefone", from)
      .eq("user_id", userId);
    return;
  }

  if (texto && texto.trim().toLowerCase().startsWith("#mater")) {
    await handleComando(db, from, userId, texto);
    return;
  }

  // Mensagem de cliente: só fica gravada. O Porteiro (decidir se/como
  // responder via Claude API) é Fase 2 — de propósito, nada responde aqui.
}

async function processPayload(payload) {
  const userId = process.env.MARCOS_USER_ID;
  const db = admin();
  const entries = payload.entry ?? [];
  for (const entry of entries) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        await processMessage(db, userId, msg);
      }
    }
  }
}

export default async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();

  if (!validSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Responde já — o processamento não pode segurar o 200.
  processPayload(payload).catch((err) =>
    console.error("whatsapp webhook: falha ao processar", err)
  );

  return new Response("EVENT_RECEIVED", { status: 200 });
};

export const config = { path: "/api/whatsapp" };

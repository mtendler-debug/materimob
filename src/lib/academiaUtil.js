import { supabase } from "./supabase";

// Atividade do corretor (alimenta a linha do tempo e, depois, a gamificação).
// Nunca atrapalha a tela: se falhar, segue em silêncio.
export function registrarAtividade(tipo, empreendimentoId, detalhe) {
  supabase
    .rpc("pc_registrar_atividade", { p_tipo: tipo, p_empreendimento: empreendimentoId ?? null, p_detalhe: detalhe ?? null })
    .then(
      () => {},
      () => {},
    );
}

// Baixa um arquivo do Storage. Se o navegador não deixar (ou o arquivo vier de
// outra origem sem CORS), abre numa aba nova, de onde dá para salvar.
export async function baixar(url, nome) {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("falhou");
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nome || nomeArquivo(url);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export function nomeArquivo(url) {
  return decodeURIComponent((url ?? "").split("?")[0].split("/").pop() || "arquivo");
}

export function linkWhatsapp(telefone, texto) {
  const d = (telefone ?? "").replace(/\D/g, "");
  if (!d) return null;
  const numero = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}

// A ficha é um texto simples: "## título", "- item" e parágrafos.
export function blocosDaFicha(texto) {
  const blocos = [];
  for (const bruta of (texto ?? "").split("\n")) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (linha.startsWith("## ")) blocos.push({ tipo: "titulo", texto: linha.slice(3) });
    else if (linha.startsWith("- ")) {
      const ultimo = blocos[blocos.length - 1];
      if (ultimo?.tipo === "lista") ultimo.itens.push(linha.slice(2));
      else blocos.push({ tipo: "lista", itens: [linha.slice(2)] });
    } else blocos.push({ tipo: "paragrafo", texto: linha });
  }
  return blocos;
}

export function haQuanto(iso) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return "agora há pouco";
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

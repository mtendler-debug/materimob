// Texto de cada tipo de atividade, para a linha do tempo. "projeto" é o nome do
// empreendimento e "detalhe" o que a função gravou (título, opção, cliente...).
export function descreverAtividade(a) {
  const p = a.projeto ? ` ${a.projeto}` : "";
  const d = a.detalhe;
  switch (a.tipo) {
    case "abriu_projeto": return `abriu o projeto${p}`;
    case "abriu_book": return `abriu o book do projeto${p}`;
    case "abriu_tabela": return `abriu a tabela de preços do projeto${p}`;
    case "abriu_video": return `assistiu ao vídeo do projeto${p}`;
    case "baixou_arte": return `baixou um card${d ? ` (${d})` : ""} do projeto${p}`;
    case "baixou_foto": return `baixou uma foto do projeto${p}`;
    case "baixou_lamina": return `baixou a lâmina do projeto${p}`;
    case "baixou_guia": return `abriu o guia do kit do projeto${p}`;
    case "copiou_texto": return `copiou um texto${p ? ` do projeto${p}` : ""}`;
    case "usou_argumento": return `usou o argumento${d ? ` "${d}"` : ""}`;
    case "enviou_kit": return `enviou o kit do projeto${p}${d ? ` (${d})` : ""}`;
    case "cliente_abriu": return `teve um cliente abrindo o link do projeto${p}`;
    case "concluiu_aula": return `concluiu a aula${d ? ` "${d}"` : ""}`;
    case "fez_quiz": return `fez o quiz${d ? ` "${d}"` : ""}`;
    case "certificou": return `recebeu o certificado${d ? ` "${d}"` : ""}`;
    case "registro_criado": return `registrou o cliente${d ? ` ${d}` : ""}${p ? ` no projeto${p}` : ""}`;
    case "registro_registrado": return `teve o registro${d ? ` de ${d}` : ""} confirmado na incorporadora`;
    case "registro_conflito": return `teve o registro${d ? ` de ${d}` : ""} em conflito`;
    case "registro_visita": return `levou${d ? ` ${d}` : " um cliente"} para visita${p ? ` no projeto${p}` : ""}`;
    case "registro_proposta": return `enviou proposta${d ? ` para ${d}` : ""}${p ? ` no projeto${p}` : ""}`;
    case "registro_venda": return `fechou venda${d ? ` com ${d}` : ""}${p ? ` no projeto${p}` : ""}`;
    case "registro_expirado": return `teve o registro${d ? ` de ${d}` : ""} expirado`;
    case "registro_cancelado": return `teve o registro${d ? ` de ${d}` : ""} cancelado`;
    default: return a.tipo;
  }
}

export const PAPEL_LABELS = { corretor: "Corretor", gestor: "Gestor" };

export function diasDesde(iso) {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
}

export function ultimoAcessoTexto(iso) {
  const d = diasDesde(iso);
  return d === null ? "nunca" : d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
}

// Parado: liberado que não abre o app há mais de 7 dias (ou nunca abriu).
export function estaParado(iso) {
  const d = diasDesde(iso);
  return d === null || d > 7;
}

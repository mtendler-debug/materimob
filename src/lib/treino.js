// Situação de uma trilha para quem está logado, a partir da linha de pc_minha_academia.
export function situacaoTrilha(a) {
  if (!a) return { rotulo: "Não iniciada", tom: "bg-slate-100 text-slate-600 border-slate-200" };
  if (a.certificado) return { rotulo: "Certificado", tom: "bg-emerald-100 text-emerald-800 border-emerald-300" };
  if (a.aulas_feitas === 0 && a.melhor_nota == null) return { rotulo: "Não iniciada", tom: "bg-slate-100 text-slate-600 border-slate-200" };
  if (a.aulas_total > 0 && a.aulas_feitas === a.aulas_total && a.tem_quiz) {
    return { rotulo: a.melhor_nota == null ? "Falta o quiz" : "Quiz pendente", tom: "bg-amber-100 text-amber-800 border-amber-300" };
  }
  return { rotulo: "Em andamento", tom: "bg-sky-100 text-sky-800 border-sky-300" };
}

export function tituloCurto(titulo) {
  return (titulo ?? "").replace(/^Nível \d+ · |^Produto · /, "");
}

// Trilha de produto (ligada a um empreendimento) já traz o nome do projeto no título.
export function rotuloTrilha(trilha) {
  return trilha.empreendimento_id ? "Produto" : `Nível ${trilha.nivel}`;
}

export function semAcento(texto) {
  return (texto ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

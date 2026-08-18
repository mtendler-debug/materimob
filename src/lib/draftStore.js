// Rascunho local do formulário de avaliação — sobrevive sem internet.
// Mesma chave de composição do sistema anterior: projetoId::unidadeId.
export function draftKey(token) {
  return `aval_materimob_${token || "padrao"}`;
}

export function evalKey(propertyId, unitId) {
  return `${propertyId}::${unitId || ""}`;
}

export function loadDraft(token) {
  try {
    return JSON.parse(localStorage.getItem(draftKey(token))) || {};
  } catch {
    return {};
  }
}

export function saveDraft(token, draft) {
  try {
    localStorage.setItem(draftKey(token), JSON.stringify(draft));
  } catch {
    // localStorage indisponível (modo privado, cota cheia) — segue sem rascunho.
  }
}

// Mesma lógica de agregação usada pela Edge Function aval-panel (painel
// público do cliente) — reimplementada aqui pro corretor ver o mesmo
// dashboard/ranking direto na tela dele, sem precisar abrir o link do
// cliente. score = notaMedia×0,6 + (mediaCriterios×2)×0,4, calculado a
// partir das MÉDIAS agregadas por imóvel, não da média dos scores
// individuais.

export function avg(nums) {
  const v = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

export function aggregateSelection({ properties, evaluations, criteria }) {
  const porProjeto = properties.map((p) => {
    const mine = evaluations.filter((e) => e.property_id === p.id);
    const allCriteria = [...(criteria ?? []), ...(p.extra_criteria ?? [])];
    const medias = allCriteria.map((c) => ({
      criterio: c,
      media: avg(mine.map((e) => (e.scores || {})[c])),
    }));
    const mediaCriterios = avg(medias.map((m) => m.media));
    const notaMedia = avg(mine.map((e) => e.overall_score));

    const comentarios = mine
      .filter((e) => e.strengths || e.concerns)
      .map((e) => ({
        evaluator_name: e.evaluator_name,
        evaluator_role: e.evaluator_role,
        overall_score: e.overall_score,
        strengths: e.strengths,
        concerns: e.concerns,
        created_at: e.created_at,
      }));

    return { property: p, avaliacoes: mine.length, notaMedia, mediaCriterios, medias, comentarios };
  });

  const ranking = porProjeto
    .filter((x) => x.avaliacoes > 0 && x.notaMedia != null)
    .map((x) => {
      const critEm10 = x.mediaCriterios != null ? x.mediaCriterios * 2 : x.notaMedia;
      const score = x.notaMedia * 0.6 + critEm10 * 0.4;
      return {
        property_id: x.property.id,
        name: x.property.name,
        color: x.property.color,
        score: Math.round(score * 100) / 100,
        notaMedia: Math.round(x.notaMedia * 10) / 10,
        mediaCriterios: x.mediaCriterios != null ? Math.round(x.mediaCriterios * 10) / 10 : null,
        avaliacoes: x.avaliacoes,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, posicao: i + 1 }));

  const unrated = porProjeto
    .filter((x) => x.avaliacoes === 0)
    .map((x) => ({ property_id: x.property.id, name: x.property.name }));

  const avaliadores = new Set(
    evaluations.map((e) => (e.evaluator_name || "").trim().toLowerCase()).filter(Boolean),
  );

  return {
    ranking,
    unrated,
    comparativo: porProjeto.map((x) => ({
      property_id: x.property.id,
      name: x.property.name,
      color: x.property.color,
      medias: x.medias,
      mediaCriterios: x.mediaCriterios,
    })),
    comentarios: porProjeto
      .filter((x) => x.comentarios.length > 0)
      .map((x) => ({
        property_id: x.property.id,
        name: x.property.name,
        color: x.property.color,
        comentarios: x.comentarios,
      })),
    totalAvaliacoes: evaluations.length,
    totalAvaliadores: avaliadores.size,
  };
}

export function aggregateProposals(proposals) {
  const desagios = proposals
    .map((x) => (x.table_value ? (1 - x.value / x.table_value) * 100 : null))
    .filter((v) => v != null);
  const mediaDesagio = desagios.length ? desagios.reduce((a, b) => a + b, 0) / desagios.length : null;
  const maior = proposals.length ? proposals.slice().sort((a, b) => b.value - a.value)[0] : null;
  const comInteresse = proposals.filter((x) => x.buy_intent).length;
  return { total: proposals.length, comInteresse, maiorValor: maior?.value ?? null, mediaDesagio };
}

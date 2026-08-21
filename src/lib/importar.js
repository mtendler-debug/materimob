import { supabase } from "./supabase";

// Copia um imóvel do portfólio compartilhado (de qualquer organização) pra
// dentro de uma seleção já existente. Usado pela importação manual em
// SelectionDetail e pela busca unificada de imóveis (/app/imoveis).
export async function importarPortfolio(selectionId, item, position) {
  const { data: inserted, error } = await supabase
    .from("av_properties")
    .insert({
      selection_id: selectionId,
      name: item.name,
      color: item.color,
      address: item.address,
      summary: item.summary,
      extra_criteria: item.extra_criteria,
      questions: item.questions,
      floor_plan_url: item.floor_plan_url,
      photo_urls: item.photo_urls,
      payment_terms: item.payment_terms,
      position,
    })
    .select("id")
    .single();
  if (error) return { error };

  if (item.units?.length) {
    const { error: unitError } = await supabase
      .from("av_units")
      .insert(item.units.map((u) => ({ property_id: inserted.id, name: u.name, table_value: u.table_value })));
    if (unitError) return { error: unitError };
  }
  return { data: inserted };
}

// Copia um lançamento (e as unidades ainda disponíveis) pra dentro de uma
// seleção já existente. launch_unit_id liga a unidade do roteiro de volta
// ao estoque vivo do lançamento — o painel do cliente usa isso pra saber
// se a unidade já foi vendida em outro atendimento (ver aval-panel).
export async function importarLancamento(selectionId, launch, unidadesDisponiveis, position) {
  const { data: inserted, error } = await supabase
    .from("av_properties")
    .insert({
      selection_id: selectionId,
      name: launch.name,
      color: launch.color,
      address: launch.address,
      summary: launch.summary,
      extra_criteria: launch.extra_criteria,
      questions: launch.questions,
      floor_plan_url: launch.floor_plan_url,
      photo_urls: launch.photo_urls,
      payment_terms: launch.payment_terms,
      position,
    })
    .select("id")
    .single();
  if (error) return { error };

  if (unidadesDisponiveis.length) {
    const { error: unitError } = await supabase.from("av_units").insert(
      unidadesDisponiveis.map((u) => ({
        property_id: inserted.id,
        name: u.name,
        table_value: u.table_value,
        launch_unit_id: u.id,
      })),
    );
    if (unitError) return { error: unitError };
  }
  return { data: inserted };
}

import { supabase } from "./supabase";

// Copia um imóvel do portfólio compartilhado (de qualquer organização) pra
// dentro de uma seleção já existente. Usado pela importação manual em
// SelectionDetail e pela busca unificada de imóveis (/app/imoveis).
export async function importarPortfolio(selectionId, item, position) {
  const { data: inserted, error } = await supabase
    .from("av_properties")
    .insert({
      selection_id: selectionId,
      source_portfolio_property_id: item.id,
      name: item.name,
      color: item.color,
      address: item.address,
      summary: item.summary,
      extra_criteria: item.extra_criteria,
      extra_unit_criteria: item.extra_unit_criteria,
      questions: item.questions,
      floor_plan_url: item.floor_plan_url,
      photo_urls: item.photo_urls,
      payment_terms: item.payment_terms,
      condo_value: item.condo_value,
      iptu_value: item.iptu_value,
      position,
    })
    .select("id")
    .single();
  if (error) return { error };

  if (item.units?.length) {
    const { error: unitError } = await supabase
      .from("av_units")
      .insert(
        item.units.map((u) => ({
          property_id: inserted.id,
          name: u.name,
          table_value: u.table_value,
          photo_urls: u.photo_urls,
          payment_terms: u.payment_terms,
        })),
      );
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
      extra_unit_criteria: launch.extra_unit_criteria,
      questions: launch.questions,
      floor_plan_url: launch.floor_plan_url,
      photo_urls: launch.photo_urls,
      payment_terms: launch.payment_terms,
      condo_value: launch.condo_value,
      iptu_value: launch.iptu_value,
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
        photo_urls: u.photo_urls,
        payment_terms: u.payment_terms,
        launch_unit_id: u.id,
      })),
    );
    if (unitError) return { error: unitError };
  }
  return { data: inserted };
}

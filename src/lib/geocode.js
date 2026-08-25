import { supabase } from "./supabase";

// Endereço não encontrado, ou instável, nunca pode travar o salvamento
// do formulário que chamou isso — por isso sempre devolve null em vez
// de lançar erro.
export async function geocodeAddress(address) {
  if (!address?.trim()) return null;
  try {
    const { data, error } = await supabase.functions.invoke("geocode-address", {
      body: { address: address.trim() },
    });
    if (error || data?.error) return null;
    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

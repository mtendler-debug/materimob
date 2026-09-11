// CPF nunca fica em texto claro no banco — hash SHA-256 dos 11 dígitos,
// calculado aqui antes de qualquer chamada à API ou ao Supabase.
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

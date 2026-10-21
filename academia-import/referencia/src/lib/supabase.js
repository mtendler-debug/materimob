import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configurado = Boolean(url && key);
export const supabase = configurado
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Executa uma chamada e lança erro legível
export async function q(promise) {
  const { data, error } = await promise;
  if (error) throw error;
  return data;
}
export const rpc = (fn, args) => q(supabase.rpc(fn, args));

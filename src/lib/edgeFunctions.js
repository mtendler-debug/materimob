import { supabase } from "./supabase";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// `auth: true` inclui o token da sessão logada, pra funções que
// diferenciam chamada autenticada (o próprio corretor) de anônima (ex.:
// pc-registro-cliente, que serve tanto o registro interno quanto o
// formulário público por token).
export async function callFunction(name, { method = "GET", params, body, auth = false } = {}) {
  let url = `${FUNCTIONS_URL}/${name}`;
  if (params) url += `?${new URLSearchParams(params)}`;

  const headers = {
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  };
  if (auth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Erro na requisição");
    err.status = res.status;
    throw err;
  }
  return data;
}

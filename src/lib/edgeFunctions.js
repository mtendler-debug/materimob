const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function callFunction(name, { method = "GET", params, body } = {}) {
  let url = `${FUNCTIONS_URL}/${name}`;
  if (params) url += `?${new URLSearchParams(params)}`;

  const res = await fetch(url, {
    method,
    headers: {
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
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

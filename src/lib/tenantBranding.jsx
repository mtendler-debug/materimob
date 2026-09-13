import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Primeiros pedaços de caminho que já são rota de verdade — nunca tratar
// como slug de organização. Mesma lista do lado do banco
// (valida_subdominio_reservado), duplicada aqui só porque o front decide
// antes de perguntar ao banco.
const RESERVADOS = new Set(["app", "admin", "entrar", "convite", "c", "r", "cliente", "registrar", "parceria"]);

// "materimob.com.br/chaincorp" -> "chaincorp". Resolvido uma vez, no
// carregamento da página — não muda mais se o usuário navegar dentro do
// app depois (evita a marca sumir no meio de um redirecionamento interno
// pra /app). Nunca lança erro: pior caso é não personalizar.
function slugAtual() {
  const primeiroPedaco = window.location.pathname.split("/")[1]?.toLowerCase();
  if (!primeiroPedaco) return null;
  return RESERVADOS.has(primeiroPedaco) ? null : primeiroPedaco;
}

const TenantBrandingContext = createContext(null);

// undefined = ainda resolvendo, null = endereço padrão (sem marca),
// objeto = { id, name, nome_exibicao, logo_url, cor_primaria, cor_secundaria }.
export function TenantBrandingProvider({ children }) {
  const [branding, setBranding] = useState(undefined);

  useEffect(() => {
    const slug = slugAtual();
    if (!slug) {
      setBranding(null);
      return;
    }
    supabase
      .rpc("organization_branding", { p_slug: slug })
      .then(({ data, error }) => setBranding(!error && data?.[0] ? data[0] : null));
  }, []);

  return <TenantBrandingContext.Provider value={branding}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}

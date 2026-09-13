import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const RESERVADOS = new Set(["app", "www", "api", "admin", "mail", "static", "assets", "cdn", "materimob"]);

// "chaincorp.materimob.com.br" -> "chaincorp". Em localhost, preview do
// Netlify ou no domínio nu, não há 4 partes — sem marca, é o caminho
// padrão. Nunca lança erro: pior caso é não personalizar.
function subdominioAtual() {
  const partes = window.location.hostname.split(".");
  if (partes.length < 4) return null;
  const slug = partes[0].toLowerCase();
  return RESERVADOS.has(slug) ? null : slug;
}

const TenantBrandingContext = createContext(null);

// undefined = ainda resolvendo, null = domínio padrão (sem marca),
// objeto = { id, name, nome_exibicao, logo_url, cor_primaria, cor_secundaria }.
export function TenantBrandingProvider({ children }) {
  const [branding, setBranding] = useState(undefined);

  useEffect(() => {
    const slug = subdominioAtual();
    if (!slug) {
      setBranding(null);
      return;
    }
    supabase
      .rpc("organization_branding", { p_subdominio: slug })
      .then(({ data, error }) => setBranding(!error && data?.[0] ? data[0] : null));
  }, []);

  return <TenantBrandingContext.Provider value={branding}>{children}</TenantBrandingContext.Provider>;
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}

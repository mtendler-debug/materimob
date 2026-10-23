import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { carregar, registrarVisita } from "../lib/medicao";

// Carrega GA4/Meta se a pessoa já aceitou os cookies numa visita anterior e
// registra cada página do funil visitada (ver lib/medicao.js). O aviso de
// cookies entra aqui depois que o protótipo for aprovado.
export function Medicao() {
  const { pathname } = useLocation();

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    registrarVisita(pathname);
  }, [pathname]);

  return null;
}

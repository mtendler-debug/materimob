import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  carregar,
  consentimento,
  definirConsentimento,
  ferramentasDeMedicao,
  medicaoConfigurada,
  paginaDoFunil,
  registrarVisita,
} from "../lib/medicao";

// Carrega GA4/Meta se a pessoa já aceitou os cookies, registra cada página do
// funil visitada e mostra o aviso de cookies (ver lib/medicao.js). O aviso só
// aparece nas páginas de captação, e só se houver código de medição
// configurado — sem nada para carregar, não há o que perguntar.
export function Medicao() {
  const { pathname } = useLocation();
  const [escolha, setEscolha] = useState(consentimento);

  // Só nas páginas de captação: quem aceitou na página inicial e depois abre
  // um link de cliente (ou o app) não leva Google/Meta junto para lá.
  useEffect(() => {
    if (!paginaDoFunil(pathname)) return;
    carregar();
    registrarVisita(pathname);
  }, [pathname]);

  function escolher(valor) {
    definirConsentimento(valor);
    setEscolha(valor);
    // A visita à página em que a pessoa está conta a partir do aceite.
    if (valor === "aceito") registrarVisita(pathname);
  }

  if (escolha || !medicaoConfigurada() || !paginaDoFunil(pathname)) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pt-3"
      style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-charcoal px-4 py-3.5 text-white">
        <p className="min-w-0 flex-[1_1_320px] text-[13px] leading-relaxed text-slate-300">
          <b className="font-semibold text-white">Cookies para medir nossos anúncios.</b> Com sua permissão,{" "}
          {ferramentasDeMedicao()} {ferramentasDeMedicao().includes(" e ") ? "registram" : "registra"} que você veio de
          um anúncio e se criou conta. Nada disso é carregado se você recusar.{" "}
          <a href="/privacidade.html" target="_blank" rel="noreferrer" className="text-white underline">
            Política de privacidade
          </a>
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={() => escolher("recusado")}
            className="flex-1 rounded-[10px] border-[1.5px] border-slate-400 px-4 py-2 text-[13px] font-bold text-white hover:bg-white/10 sm:flex-none"
          >
            Recusar
          </button>
          <button
            onClick={() => escolher("aceito")}
            className="flex-1 rounded-[10px] border-[1.5px] border-white bg-white px-4 py-2 text-[13px] font-bold text-charcoal hover:opacity-90 sm:flex-none"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

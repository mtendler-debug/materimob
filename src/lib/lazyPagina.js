import { lazy } from "react";

const CHAVE = "materimob-recarregou-pagina";

// Cada página vira um arquivo à parte, baixado só quando é aberta — quem chega
// por um link de cliente no celular não baixa CRM, planilha e mapa junto.
//
// Efeito colateral de dividir: depois de um deploy, o Netlify apaga os
// arquivos antigos, e quem estava com o site aberto pede uma página que não
// existe mais. Nesse caso recarrega uma vez (pega a versão nova); se mesmo
// assim falhar, o erro segue para o ErrorBoundary em vez de entrar em loop.
export function lazyPagina(importar) {
  return lazy(() =>
    importar().then(
      (modulo) => {
        try {
          sessionStorage.removeItem(CHAVE);
        } catch {
          // sem sessionStorage (aba privada etc.): segue sem a marca
        }
        return modulo;
      },
      (err) => {
        try {
          if (!sessionStorage.getItem(CHAVE)) {
            sessionStorage.setItem(CHAVE, "1");
            window.location.reload();
            return new Promise(() => {});
          }
        } catch {
          // sem sessionStorage não dá para evitar loop: deixa o erro aparecer
        }
        throw err;
      },
    ),
  );
}

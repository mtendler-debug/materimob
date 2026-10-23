// Medição das campanhas (GA4 e Meta Pixel). Três regras:
//  - Só carrega depois que a pessoa aceita os cookies (LGPD) — antes disso
//    nenhum script de terceiro entra na página e os eventos são descartados.
//  - Só mede o funil de captação (página inicial, entrada/cadastro, cadastro
//    da Academia). As páginas que o corretor manda para os clientes dele
//    (/c, /r, /cliente, /p) nunca são medidas: o cliente do corretor não é
//    público de anúncio do MaterImob.
//  - Sem os códigos (VITE_GA4_ID / VITE_META_PIXEL_ID no Netlify), tudo vira
//    nada — o site funciona igual.
const GA4_ID = import.meta.env.VITE_GA4_ID;
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;
const CHAVE = "materimob-cookies"; // "aceito" | "recusado"

const PAGINAS_DO_FUNIL = ["/", "/entrar", "/academia", "/parceria/cadastro"];

let carregado = false;

export function medicaoConfigurada() {
  return Boolean(GA4_ID || META_PIXEL_ID);
}

// Para o aviso de cookies citar só quem de fato recebe os dados.
export function ferramentasDeMedicao() {
  return [GA4_ID && "o Google", META_PIXEL_ID && "a Meta"].filter(Boolean).join(" e ");
}

export function paginaDoFunil(pathname) {
  return PAGINAS_DO_FUNIL.includes(pathname);
}

export function consentimento() {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

export function definirConsentimento(valor) {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    // sem localStorage o aviso volta na próxima visita; segue a escolha agora
  }
  if (valor === "aceito") carregar();
}

export function carregar() {
  if (carregado || consentimento() !== "aceito") return;
  carregado = true;

  if (GA4_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // page_view manual: num app de uma página só o GA não vê troca de rota.
    window.gtag("config", GA4_ID, { send_page_view: false });
    adicionarScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`);
  }

  if (META_PIXEL_ID) {
    const fbq = function fbq() {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    // Sem isto o Pixel registra sozinho toda troca de rota — inclusive para
    // dentro do app, fora do funil. PageView só sai por registrarVisita.
    fbq.disablePushState = true;
    window.fbq = window._fbq = fbq;
    window.fbq("init", META_PIXEL_ID);
    adicionarScript("https://connect.facebook.net/en_US/fbevents.js");
  }
}

function adicionarScript(src) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

export function registrarVisita(pathname) {
  if (!carregado || !paginaDoFunil(pathname)) return;
  window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.href });
  window.fbq?.("track", "PageView");
}

// Conta criada (ainda sem confirmar o e-mail). origem: "corretor" | "academia".
export function registrarCadastro(origem) {
  if (!carregado) return;
  window.gtag?.("event", "sign_up", { method: "email", origem });
  window.fbq?.("track", "CompleteRegistration", { content_name: origem });
}

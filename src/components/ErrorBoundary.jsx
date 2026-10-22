import { Component } from "react";
import { useLocation } from "react-router-dom";

// Sem isto, qualquer erro de renderização deixa a tela inteira em branco — e
// quem chega por um link de WhatsApp ou anúncio não tem nem como voltar. Fica
// em volta do App inteiro (páginas públicas incluídas). Trocar de rota limpa o
// erro, então o menu e o "voltar" do navegador continuam funcionando.
class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Erro de renderização", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.pathname !== this.props.pathname) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-[.2em] text-gold">MaterImob</p>
        <h1 className="mt-2 text-lg font-bold text-charcoal">Algo deu errado nesta tela</h1>
        <p className="mt-2 max-w-xs text-sm text-graytext">
          Recarregue a página para tentar de novo. Se continuar, escreva para contato@materimob.com.br.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Recarregar
          </button>
          <a
            href="/"
            className="rounded-[10px] border-[1.5px] border-rule px-4 py-2.5 text-sm font-bold text-charcoal hover:border-gold"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }
}

export function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary pathname={pathname}>{children}</Boundary>;
}

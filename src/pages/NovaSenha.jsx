import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { traduzErro } from "./Login";

const campo =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none";

// O link do e-mail de "Esqueci minha senha" cai aqui. O Supabase lê o código da
// própria URL e abre uma sessão de recuperação; só com ela dá para trocar a senha.
// Link vencido ou já usado volta da URL com #error=…, e a tela oferece pedir outro.
export default function NovaSenha() {
  const navigate = useNavigate();
  // Lido uma vez, no primeiro render, antes de o cliente do Supabase limpar a URL.
  const [linkRecusado] = useState(() => /[#&?]error(_code)?=/.test(window.location.hash + window.location.search));
  const [pronto, setPronto] = useState(false);
  const [semSessao, setSemSessao] = useState(false);
  const [senha, setSenha] = useState("");
  const [repita, setRepita] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feito, setFeito] = useState(false);

  useEffect(() => {
    if (linkRecusado) return;
    let ativo = true;
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (ativo && sessao && (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN")) setPronto(true);
    });
    // Se a sessão já estava aberta quando a tela montou, o evento não chega de novo.
    supabase.auth.getSession().then(({ data }) => {
      if (ativo && data.session) setPronto(true);
    });
    // O código da URL leva um instante para virar sessão. Passado o prazo, o link não serve.
    const prazo = setTimeout(() => ativo && setSemSessao(true), 4000);
    return () => {
      ativo = false;
      clearTimeout(prazo);
      sub.subscription.unsubscribe();
    };
  }, [linkRecusado]);

  async function salvar(e) {
    e.preventDefault();
    setError("");
    if (senha.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== repita) return setError("As duas senhas não são iguais.");
    setBusy(true);
    const { error: updError } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (updError) return setError(traduzErro(updError.message));
    setFeito(true);
    setTimeout(() => navigate("/", { replace: true }), 1800);
  }

  if (feito) {
    return (
      <Pagina>
        <h1 className="text-center text-xl font-bold text-charcoal">Senha alterada</h1>
        <p className="mt-2 text-center text-sm text-graytext">Pronto. Estamos levando você para a sua área.</p>
      </Pagina>
    );
  }

  if (linkRecusado || (!pronto && semSessao)) {
    return (
      <Pagina>
        <h1 className="text-center text-xl font-bold text-charcoal">Link vencido ou já usado</h1>
        <p className="mt-2 text-center text-sm text-graytext">
          Por segurança, o link para criar a senha vale por pouco tempo e só funciona uma vez. Peça um novo na tela de
          entrada.
        </p>
        <Link
          to="/entrar"
          className="mt-5 block w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-center text-sm font-bold text-white hover:opacity-90"
        >
          Voltar para entrar
        </Link>
      </Pagina>
    );
  }

  if (!pronto) {
    return (
      <Pagina>
        <p className="text-center text-sm text-muted">Confirmando o link…</p>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <h1 className="text-center text-xl font-bold text-charcoal">Criar nova senha</h1>
      <p className="mt-1 text-center text-sm text-graytext">Escolha a senha que vai usar para entrar.</p>
      <form onSubmit={salvar} noValidate className="mt-6 space-y-3 text-left">
        <div>
          <label htmlFor="ns-senha" className="block text-xs font-medium text-graytext">
            Nova senha
          </label>
          <input
            id="ns-senha"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={campo}
          />
        </div>
        <div>
          <label htmlFor="ns-repita" className="block text-xs font-medium text-graytext">
            Repita a nova senha
          </label>
          <input
            id="ns-repita"
            type="password"
            autoComplete="new-password"
            value={repita}
            onChange={(e) => setRepita(e.target.value)}
            className={campo}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </Pagina>
  );
}

function Pagina({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-[20px] bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}

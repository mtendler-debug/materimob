import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { traduzErro } from "./Login";
import CartaoAcesso from "../components/ui/CartaoAcesso";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

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
        <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">Senha alterada</h1>
        <p className="mt-3 text-center text-body-sm text-graytext">Pronto. Estamos levando você para a sua área.</p>
      </Pagina>
    );
  }

  if (linkRecusado || (!pronto && semSessao)) {
    return (
      <Pagina>
        <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">Link vencido ou já usado</h1>
        <p className="mt-3 text-center text-body-sm text-graytext">
          Por segurança, o link para criar a senha vale por pouco tempo e só funciona uma vez. Peça um novo na tela de
          entrada.
        </p>
        <Button to="/entrar" size="lg" block className="mt-6">
          Voltar para entrar
        </Button>
      </Pagina>
    );
  }

  if (!pronto) {
    return (
      <Pagina>
        <p className="text-center text-body-sm text-muted">Confirmando o link…</p>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">Criar nova senha</h1>
      <p className="mt-2 mb-6 text-center text-base text-graytext">Escolha a senha que vai usar para entrar.</p>
      <form onSubmit={salvar} noValidate className="space-y-4 text-left">
        <Input
          id="ns-senha"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Input
          id="ns-repita"
          label="Repita a nova senha"
          type="password"
          autoComplete="new-password"
          value={repita}
          onChange={(e) => setRepita(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-body-sm text-danger-text">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block disabled={busy}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </Pagina>
  );
}

function Pagina({ children }) {
  return <CartaoAcesso>{children}</CartaoAcesso>;
}

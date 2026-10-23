import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useTenantBranding } from "../lib/tenantBranding";
import { registrarCadastro } from "../lib/medicao";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
  const { user, loading } = useAuth();
  const marca = useTenantBranding();
  const [params] = useSearchParams();
  // A página de entrada manda quem quer criar conta direto para o cadastro (?modo=criar).
  const [mode, setMode] = useState(params.get("modo") === "criar" ? "cadastrar" : "entrar"); // "entrar" | "cadastrar" | "recuperar"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    if (mode === "recuperar") {
      // A resposta é a mesma exista a conta ou não, para a tela não revelar quem tem cadastro.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/nova-senha`,
      });
      setBusy(false);
      if (resetError) {
        setError(traduzErro(resetError.message));
        return;
      }
      setRecuperacaoEnviada(true);
      return;
    }

    // account_type sempre 'corretor' no cadastro público — é a fase 1 do
    // produto, simples e direto pro corretor. Organizações (imobiliária/
    // incorporadora) continuam existindo pra quem já usa, geridas fora
    // do cadastro (ver Profile.jsx).
    const action =
      mode === "entrar"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({
            email,
            password,
            // Sem isto o link de confirmação volta para o "Site URL" do Supabase,
            // que pode ser outro domínio (ex. o *.netlify.app) — e a sessão fica lá.
            options: {
              data: { full_name: nome.trim(), account_type: "corretor" },
              emailRedirectTo: `${window.location.origin}/`,
            },
          });

    const { data, error: authError } = await action;
    setBusy(false);

    if (authError) {
      setError(traduzErro(authError.message));
      return;
    }

    if (mode === "cadastrar") registrarCadastro("corretor");
    if (mode === "cadastrar" && !data.session) {
      setConfirmEmailSent(true);
    }
  }

  if (confirmEmailSent) {
    return (
      <Card marca={marca}>
        <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">Quase lá</h1>
        <p className="mt-3 text-center text-body-sm text-graytext">
          Enviamos um link de confirmação para <strong className="text-charcoal">{email}</strong>.
          Confirme por lá para poder entrar.
        </p>
      </Card>
    );
  }

  if (recuperacaoEnviada) {
    return (
      <Card marca={marca}>
        <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">Confira o seu e-mail</h1>
        <p className="mt-3 text-center text-body-sm text-graytext">
          Se <strong className="text-charcoal">{email}</strong> tiver uma conta, enviamos um link para criar a nova senha. Ele vale por pouco
          tempo. Se não encontrar, olhe também o spam.
        </p>
        <Button
          variant="ghost"
          block
          className="mt-6"
          onClick={() => {
            setRecuperacaoEnviada(false);
            setMode("entrar");
            setError("");
          }}
        >
          Voltar para entrar
        </Button>
      </Card>
    );
  }

  return (
    <Card marca={marca}>
      {marca?.logo_url && (
        <img src={marca.logo_url} alt={marca.nome_exibicao || marca.name} className="mx-auto mb-4 max-h-10" />
      )}
      <h1 className="text-center text-headline font-bold tracking-[-0.035em] text-charcoal">
        {marca?.nome_exibicao || marca?.name || (mode === "entrar" ? "Bem-vindo de volta" : mode === "recuperar" ? "Recuperar senha" : "Criar sua conta")}
      </h1>
      <p className="mt-2 mb-7 text-center text-base text-graytext">
        {mode === "entrar"
          ? marca
            ? "Portal de parcerias"
            : "Entre para continuar."
          : mode === "recuperar"
            ? "Informe o seu e-mail e enviamos um link para criar uma nova senha"
            : "Criar uma conta grátis."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        {mode === "cadastrar" && (
          <Input label="Nome" required value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
        )}
        <Input
          label="E-mail"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
        />
        {mode !== "recuperar" && (
          <div>
            <Input
              label="Senha"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              placeholder="Mínimo de 6 caracteres"
            />
            {mode === "entrar" && (
              <button
                type="button"
                onClick={() => {
                  setMode("recuperar");
                  setError("");
                }}
                className="min-h-11 pt-1 text-caption text-graytext transition-colors duration-200 hover:text-charcoal"
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        )}

        {error && <p className="text-body-sm text-danger-text">{error}</p>}

        <Button
          type="submit"
          size="lg"
          block
          disabled={busy}
          style={marca ? { background: marca.cor_primaria || "#0284C7", color: marca.cor_secundaria || "#1c1c1c" } : undefined}
        >
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : mode === "recuperar" ? "Enviar link" : "Criar conta"}
        </Button>
      </form>

      <p className="mt-5 text-center text-body-sm text-graytext">
        {mode === "entrar" ? "Ainda não tem conta?" : mode === "recuperar" ? "Lembrou a senha?" : "Já tem conta?"}
        <button
          onClick={() => {
            setMode(mode === "entrar" ? "cadastrar" : "entrar");
            setError("");
          }}
          className="min-h-11 px-2 font-semibold text-charcoal hover:underline"
        >
          {mode === "entrar" ? "Criar uma" : "Entrar"}
        </button>
      </p>

      {!marca && mode === "entrar" && (
        <p className="mt-4 border-t border-slate-200/70 pt-4 text-center text-caption leading-relaxed text-graytext">
          <Link to="/academia" className="underline underline-offset-2">
            Pedir acesso à Academia
          </Link>
          {" · "}
          <Link to="/parceria/cadastro" className="underline underline-offset-2">
            Cadastrar minha imobiliária
          </Link>
        </p>
      )}
      <p className="mt-4 text-center text-caption text-muted">
        {mode === "cadastrar" ? "Ao criar a conta, você concorda com a " : "Veja a "}
        <a href="/privacidade.html" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          política de privacidade
        </a>
        .
      </p>

      {marca && <p className="mt-5 text-center text-caption text-muted">gerenciado por MaterImob</p>}
    </Card>
  );
}

// Moldura da tela de acesso: cartão translúcido sobre um brilho azul suave (sem marca) ou a cor do inquilino.
function Card({ children, marca }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          marca?.cor_secundaria ||
          "radial-gradient(900px 480px at 50% -10%, var(--color-brand-soft), transparent 70%), var(--color-bg)",
      }}
    >
      <div className="w-full max-w-[400px] rounded-sheet border border-white/80 bg-white/90 p-7 shadow-float backdrop-blur-xl ring-1 ring-slate-200/60 sm:p-9">
        {!marca && (
          <Link to="/" className="mb-7 block text-center text-lg font-bold tracking-tight text-charcoal">
            MaterImob
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}

export function traduzErro(message) {
  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (message.includes("User already registered")) {
    return "Já existe uma conta com este e-mail.";
  }
  if (message.includes("Password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  if (message.includes("same as the old password") || message.includes("different from the old password")) {
    return "Escolha uma senha diferente da atual.";
  }
  if (message.includes("security purposes") || message.includes("rate limit")) {
    return "Muitos pedidos seguidos. Aguarde um minuto e tente de novo.";
  }
  return message;
}

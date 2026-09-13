import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useTenantBranding } from "../lib/tenantBranding";

export default function Login() {
  const { user, loading } = useAuth();
  const marca = useTenantBranding();
  const [mode, setMode] = useState("entrar"); // "entrar" | "cadastrar"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

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
            options: { data: { full_name: nome.trim(), account_type: "corretor" } },
          });

    const { data, error: authError } = await action;
    setBusy(false);

    if (authError) {
      setError(traduzErro(authError.message));
      return;
    }

    if (mode === "cadastrar" && !data.session) {
      setConfirmEmailSent(true);
    }
  }

  if (confirmEmailSent) {
    return (
      <Card marca={marca}>
        <h1 className="text-center text-xl font-bold text-charcoal">Quase lá</h1>
        <p className="mt-2 text-center text-sm text-graytext">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Confirme por lá para poder entrar.
        </p>
      </Card>
    );
  }

  return (
    <Card marca={marca}>
      {marca?.logo_url && (
        <img src={marca.logo_url} alt={marca.nome_exibicao || marca.name} className="mx-auto mb-4 max-h-10" />
      )}
      <h1 className="text-center text-xl font-bold text-charcoal">
        {marca?.nome_exibicao || marca?.name || "MaterImob"}
      </h1>
      <p className="mt-1 text-center text-sm text-graytext">
        {mode === "entrar"
          ? marca
            ? "Portal de parcerias"
            : "Entrar na sua conta"
          : "Criar uma conta"}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
        {mode === "cadastrar" && (
          <div>
            <label className="block text-xs font-medium text-graytext">Nome</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-graytext">E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-graytext">Senha</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] px-4 py-[11px] text-sm font-bold hover:opacity-90 disabled:opacity-50"
          style={
            marca
              ? { background: marca.cor_primaria || "#a68a5b", color: marca.cor_secundaria || "#1c1c1c" }
              : { background: "#1c1c1c", color: "#fff" }
          }
        >
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "entrar" ? "cadastrar" : "entrar");
          setError("");
        }}
        className="mt-4 w-full text-center text-sm text-graytext underline"
      >
        {mode === "entrar"
          ? "Ainda não tem conta? Criar uma"
          : "Já tem conta? Entrar"}
      </button>

      {marca && <p className="mt-5 text-center text-[10.5px] text-muted">gerenciado por MaterImob</p>}
    </Card>
  );
}

function Card({ children, marca }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: marca?.cor_secundaria || "var(--color-bg)" }}
    >
      <div className="w-full max-w-sm rounded-[20px] bg-white p-8 shadow-sm">{children}</div>
    </div>
  );
}

function traduzErro(message) {
  if (message.includes("Invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (message.includes("User already registered")) {
    return "Já existe uma conta com este e-mail.";
  }
  if (message.includes("Password should be at least")) {
    return "A senha precisa ter pelo menos 6 caracteres.";
  }
  return message;
}

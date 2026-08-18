import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export default function Login() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState("entrar"); // "entrar" | "cadastrar"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmEmailSent, setConfirmEmailSent] = useState(false);

  if (!loading && user) {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const action =
      mode === "entrar"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });

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
      <Card>
        <h1 className="text-center text-xl font-bold text-charcoal">Quase lá</h1>
        <p className="mt-2 text-center text-sm text-graytext">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Confirme por lá para poder entrar.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-center text-xl font-bold text-charcoal">Avaliador MaterImob</h1>
      <p className="mt-1 text-center text-sm text-graytext">
        {mode === "entrar" ? "Entrar na sua conta" : "Criar uma conta"}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
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
          className="w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
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
    </Card>
  );
}

function Card({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6">
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

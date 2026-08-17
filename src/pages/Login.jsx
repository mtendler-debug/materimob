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
      <Centered>
        <h1 className="text-xl font-medium text-neutral-800">Quase lá</h1>
        <p className="mt-2 max-w-sm text-sm text-neutral-500">
          Enviamos um link de confirmação para <strong>{email}</strong>.
          Confirme por lá para poder entrar.
        </p>
      </Centered>
    );
  }

  return (
    <Centered>
      <h1 className="text-xl font-medium text-neutral-800">
        Avaliador MaterImob
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 w-72 space-y-3 text-left">
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            E-mail
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Senha
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-neutral-800 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "entrar" ? "cadastrar" : "entrar");
          setError("");
        }}
        className="mt-4 text-sm text-neutral-500 underline"
      >
        {mode === "entrar"
          ? "Ainda não tem conta? Criar uma"
          : "Já tem conta? Entrar"}
      </button>
    </Centered>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center">
      {children}
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

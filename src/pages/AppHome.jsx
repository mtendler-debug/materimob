import { useAuth } from "../lib/AuthContext";

export default function AppHome() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-wide text-neutral-400">
          Avaliador MaterImob
        </p>
        <button
          onClick={signOut}
          className="text-sm text-neutral-500 underline"
        >
          Sair
        </button>
      </div>
      <h1 className="mt-4 text-xl font-medium text-neutral-800">
        Logado como {user.email}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        As seleções de imóveis vão aparecer aqui.
      </p>
    </div>
  );
}

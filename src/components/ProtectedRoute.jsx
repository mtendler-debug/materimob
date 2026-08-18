import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/entrar" replace />;
  }

  return children;
}

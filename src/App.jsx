import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Selections from "./pages/Selections";
import SelectionDetail from "./pages/SelectionDetail";
import PublicForm from "./pages/PublicForm";
import PublicPanel from "./pages/PublicPanel";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./lib/AuthContext";

function Placeholder({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-neutral-400">
          Avaliador MaterImob
        </p>
        <h1 className="mt-2 text-xl font-medium text-neutral-800">{label}</h1>
      </div>
    </div>
  );
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Placeholder label="Carregando…" />;
  return <Navigate to={user ? "/app" : "/entrar"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/entrar" element={<Login />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Selections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/selections/:id"
        element={
          <ProtectedRoute>
            <SelectionDetail />
          </ProtectedRoute>
        }
      />
      <Route path="/c/:token" element={<PublicForm />} />
      <Route path="/r/:token" element={<PublicPanel />} />
    </Routes>
  );
}

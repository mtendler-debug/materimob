import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Selections from "./pages/Selections";
import SelectionDetail from "./pages/SelectionDetail";
import PublicForm from "./pages/PublicForm";
import PublicPanel from "./pages/PublicPanel";
import Organization from "./pages/Organization";
import Portfolio from "./pages/Portfolio";
import Launches from "./pages/Launches";
import AcceptInvite from "./pages/AcceptInvite";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuth } from "./lib/AuthContext";

function Placeholder({ label }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-6 text-center">
      <div>
        <p className="text-sm uppercase tracking-wide text-muted">
          Avaliador MaterImob
        </p>
        <h1 className="mt-2 text-xl font-bold text-charcoal">{label}</h1>
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
      <Route
        path="/app/organizacao"
        element={
          <ProtectedRoute>
            <Organization />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/portfolio"
        element={
          <ProtectedRoute>
            <Portfolio />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/lancamentos"
        element={
          <ProtectedRoute>
            <Launches />
          </ProtectedRoute>
        }
      />
      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/c/:token" element={<PublicForm />} />
      <Route path="/r/:token" element={<PublicPanel />} />
    </Routes>
  );
}

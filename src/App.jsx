import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Entry from "./pages/Entry";
import Selections from "./pages/Selections";
import SelectionDetail from "./pages/SelectionDetail";
import PublicForm from "./pages/PublicForm";
import PublicPanel from "./pages/PublicPanel";
import Organization from "./pages/Organization";
import Portfolio from "./pages/Portfolio";
import Launches from "./pages/Launches";
import AcceptInvite from "./pages/AcceptInvite";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
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

import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Entry from "./pages/Entry";
import Dashboard from "./pages/Dashboard";
import Selections from "./pages/Selections";
import SelectionDetail from "./pages/SelectionDetail";
import PublicForm from "./pages/PublicForm";
import PublicPanel from "./pages/PublicPanel";
import Organization from "./pages/Organization";
import Portfolio from "./pages/Portfolio";
import Launches from "./pages/Launches";
import LaunchDetail from "./pages/LaunchDetail";
import Showcase from "./pages/Showcase";
import AcceptInvite from "./pages/AcceptInvite";
import ClientHome from "./pages/ClientHome";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRoute } from "./components/RoleRoute";
import AppLayout from "./components/AppLayout";

// Espaço reservado para telas que ainda não foram construídas nos próximos
// blocos do briefing — evita link morto no menu enquanto isso.
function EmConstrucao({ titulo }) {
  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-charcoal">{titulo}</h1>
        <p className="mt-2 text-sm text-graytext">Essa área ainda está em construção.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/entrar" element={<Login />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/app" element={<Dashboard />} />
        <Route path="/app/imoveis" element={<EmConstrucao titulo="Imóveis" />} />
        <Route path="/app/selecoes" element={<Selections />} />
        <Route path="/app/selections/:id" element={<SelectionDetail />} />
        <Route path="/app/perfil" element={<EmConstrucao titulo="Meu perfil" />} />
        <Route path="/app/organizacao" element={<Organization />} />
        <Route
          path="/app/portfolio"
          element={
            <RoleRoute exige="organizacao">
              <Portfolio />
            </RoleRoute>
          }
        />
        <Route
          path="/app/lancamentos"
          element={
            <RoleRoute exige="organizacao">
              <Launches />
            </RoleRoute>
          }
        />
        <Route
          path="/app/lancamentos/:id"
          element={
            <RoleRoute exige="organizacao">
              <LaunchDetail />
            </RoleRoute>
          }
        />
        <Route path="/app/organizacoes/:id" element={<Showcase />} />
        <Route
          path="/app/estoque"
          element={
            <RoleRoute exige="organizacao">
              <EmConstrucao titulo="Estoque" />
            </RoleRoute>
          }
        />
        <Route
          path="/app/time"
          element={
            <RoleRoute exige="imobiliaria-gerente">
              <EmConstrucao titulo="Seleção do time" />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute exige="admin">
              <EmConstrucao titulo="Administração" />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/organizacoes"
          element={
            <RoleRoute exige="admin">
              <EmConstrucao titulo="Organizações" />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/contas"
          element={
            <RoleRoute exige="admin">
              <EmConstrucao titulo="Contas" />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/c/:token" element={<PublicForm />} />
      <Route path="/r/:token" element={<PublicPanel />} />
      <Route path="/cliente/:token" element={<ClientHome />} />
    </Routes>
  );
}

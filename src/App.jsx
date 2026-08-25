import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Entry from "./pages/Entry";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
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
import AdminLayout from "./pages/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminOrganizations from "./pages/admin/AdminOrganizations";
import AdminAccounts from "./pages/admin/AdminAccounts";
import Estoque from "./pages/Estoque";
import TeamPicks from "./pages/TeamPicks";
import Profile from "./pages/Profile";
import MyPerformance from "./pages/MyPerformance";

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
        <Route path="/app/imoveis" element={<Properties />} />
        <Route path="/app/selecoes" element={<Selections />} />
        <Route path="/app/selections/:id" element={<SelectionDetail />} />
        <Route path="/app/perfil" element={<Profile />} />
        <Route path="/app/desempenho" element={<MyPerformance />} />
        <Route path="/app/organizacao" element={<Organization />} />
        <Route path="/app/portfolio" element={<Portfolio />} />
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
              <Estoque />
            </RoleRoute>
          }
        />
        <Route
          path="/app/time"
          element={
            <RoleRoute exige="imobiliaria-gerente">
              <TeamPicks />
            </RoleRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleRoute exige="admin">
              <AdminLayout />
            </RoleRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="organizacoes" element={<AdminOrganizations />} />
          <Route path="contas" element={<AdminAccounts />} />
        </Route>
      </Route>

      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/c/:token" element={<PublicForm />} />
      <Route path="/r/:token" element={<PublicPanel />} />
      <Route path="/cliente/:token" element={<ClientHome />} />
    </Routes>
  );
}

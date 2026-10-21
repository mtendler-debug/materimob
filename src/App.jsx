import { Routes, Route, Navigate } from "react-router-dom";
import { TenantBrandingProvider } from "./lib/tenantBranding";
import { FeedbackProvider } from "./lib/feedback";
import { AcessoCanalProvider } from "./lib/AcessoCanal";
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
import PublicPartnerForm from "./pages/PublicPartnerForm";
import PublicPartnerSignup from "./pages/PublicPartnerSignup";
import AcademiaCadastro from "./pages/AcademiaCadastro";
import AcademiaInicio from "./pages/academia/AcademiaInicio";
import Projetos from "./pages/academia/Projetos";
import Treinamento from "./pages/academia/Treinamento";
import TrilhaDetalhe from "./pages/academia/TrilhaDetalhe";
import Argumentos from "./pages/academia/Argumentos";
import Clientes from "./pages/academia/Clientes";
import RegistrarCliente from "./pages/academia/RegistrarCliente";
import RegistroDetalhe from "./pages/academia/RegistroDetalhe";
import AdminAcademia from "./pages/admin/AdminAcademia";
import VisaoGeralAcademia from "./pages/admin/VisaoGeralAcademia";
import CorretoresAcademia from "./pages/admin/CorretoresAcademia";
import AvisosAcademia from "./pages/admin/AvisosAcademia";
import ConteudoAcademia from "./pages/admin/ConteudoAcademia";
import ProjetosConteudo from "./pages/admin/ProjetosConteudo";
import ProjetoEditor from "./pages/admin/ProjetoEditor";
import TrilhasConteudo from "./pages/admin/TrilhasConteudo";
import TrilhaEditor from "./pages/admin/TrilhaEditor";
import ArgumentosConteudo from "./pages/admin/ArgumentosConteudo";
import Equipe from "./pages/academia/Equipe";
import MeusDados from "./pages/academia/MeusDados";
import SugestoesArgumentos from "./pages/admin/SugestoesArgumentos";
import ProjetoDetalhe from "./pages/academia/ProjetoDetalhe";
import PublicProjeto from "./pages/PublicProjeto";
import ParceriasLayout from "./pages/parcerias/ParceriasLayout";
import Parceiras from "./pages/parcerias/Parceiras";
import ParceiraDetail from "./pages/parcerias/ParceiraDetail";
import Registros from "./pages/parcerias/Registros";
import Acessos from "./pages/parcerias/Acessos";
import Kanban from "./pages/parcerias/Kanban";
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
import CrmLayout from "./pages/crm/CrmLayout";
import CrmDashboard from "./pages/crm/CrmDashboard";
import Pipeline from "./pages/crm/Pipeline";
import Leads from "./pages/crm/Leads";
import LeadDetail from "./pages/crm/LeadDetail";
import Opportunities from "./pages/crm/Opportunities";

export default function App() {
  return (
    <FeedbackProvider>
    <TenantBrandingProvider>
    <AcessoCanalProvider>
      <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/academia" element={<AcademiaCadastro />} />
      {/* Portal com marca própria, ex. materimob.com.br/chaincorp — o
          slug em si só decide a cor/logo (via TenantBrandingProvider,
          resolvido pelo caminho); quem já está logado é levado adiante
          pelo próprio Login. */}
      <Route path="/:orgSlug" element={<Login />} />

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
        <Route path="/app/crm" element={<CrmLayout />}>
          <Route index element={<CrmDashboard />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="leads" element={<Leads />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="oportunidades" element={<Opportunities />} />
        </Route>
        <Route path="/app/academia" element={<AcademiaInicio />} />
        <Route path="/app/academia/projetos" element={<Projetos />} />
        <Route path="/app/academia/treinamento" element={<Treinamento />} />
        <Route path="/app/academia/treinamento/:id" element={<TrilhaDetalhe />} />
        <Route path="/app/academia/argumentos" element={<Argumentos />} />
        <Route path="/app/academia/clientes" element={<Clientes />} />
        <Route path="/app/academia/equipe" element={<Equipe />} />
        <Route path="/app/academia/dados" element={<MeusDados />} />
        <Route path="/app/academia/clientes/novo" element={<RegistrarCliente />} />
        <Route path="/app/academia/clientes/:id" element={<RegistroDetalhe />} />
        <Route path="/app/academia/projetos/:codigo" element={<ProjetoDetalhe />} />
        <Route path="/app/organizacao" element={<Organization />} />
        <Route path="/app/parcerias" element={<ParceriasLayout />}>
          <Route index element={<Kanban />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="parceiras" element={<Parceiras />} />
          <Route path="parceiras/:id" element={<ParceiraDetail />} />
          <Route path="registros" element={<Registros />} />
          <Route path="acessos" element={<Acessos />} />
        </Route>
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
          <Route path="academia" element={<AdminAcademia />}>
            <Route index element={<VisaoGeralAcademia />} />
            <Route path="corretores" element={<CorretoresAcademia />} />
            <Route path="acessos" element={<Acessos />} />
            <Route path="sugestoes" element={<SugestoesArgumentos />} />
            <Route path="avisos" element={<AvisosAcademia />} />
            <Route path="conteudo" element={<ConteudoAcademia />}>
              <Route index element={<Navigate to="projetos" replace />} />
              <Route path="projetos" element={<ProjetosConteudo />} />
              <Route path="projetos/:codigo" element={<ProjetoEditor />} />
              <Route path="trilhas" element={<TrilhasConteudo />} />
              <Route path="trilhas/:id" element={<TrilhaEditor />} />
              <Route path="argumentos" element={<ArgumentosConteudo />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="/convite/:token" element={<AcceptInvite />} />
      <Route path="/c/:token" element={<PublicForm />} />
      <Route path="/r/:token" element={<PublicPanel />} />
      <Route path="/p/:token" element={<PublicProjeto />} />
      <Route path="/cliente/:token" element={<ClientHome />} />
      <Route path="/registrar/:token" element={<PublicPartnerForm />} />
      <Route path="/parceria/cadastro" element={<PublicPartnerSignup />} />
    </Routes>
    </AcessoCanalProvider>
    </TenantBrandingProvider>
    </FeedbackProvider>
  );
}

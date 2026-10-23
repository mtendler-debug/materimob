import { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { lazyPagina } from "./lib/lazyPagina";
import { CarregandoPagina } from "./components/CarregandoPagina";
import { TenantBrandingProvider } from "./lib/tenantBranding";
import { FeedbackProvider } from "./lib/feedback";
import { AcessoCanalProvider } from "./lib/AcessoCanal";
import Login from "./pages/Login";
const NovaSenha = lazyPagina(() => import("./pages/NovaSenha"));
import Entry from "./pages/Entry";
import ModuloRoute from "./components/ModuloRoute";
const Dashboard = lazyPagina(() => import("./pages/Dashboard"));
const Properties = lazyPagina(() => import("./pages/Properties"));
const Selections = lazyPagina(() => import("./pages/Selections"));
const SelectionDetail = lazyPagina(() => import("./pages/SelectionDetail"));
const PublicForm = lazyPagina(() => import("./pages/PublicForm"));
const PublicPanel = lazyPagina(() => import("./pages/PublicPanel"));
const Organization = lazyPagina(() => import("./pages/Organization"));
const Portfolio = lazyPagina(() => import("./pages/Portfolio"));
const Launches = lazyPagina(() => import("./pages/Launches"));
const LaunchDetail = lazyPagina(() => import("./pages/LaunchDetail"));
const Showcase = lazyPagina(() => import("./pages/Showcase"));
const AcceptInvite = lazyPagina(() => import("./pages/AcceptInvite"));
const ClientHome = lazyPagina(() => import("./pages/ClientHome"));
const PublicPartnerForm = lazyPagina(() => import("./pages/PublicPartnerForm"));
const PublicPartnerSignup = lazyPagina(() => import("./pages/PublicPartnerSignup"));
const AcademiaCadastro = lazyPagina(() => import("./pages/AcademiaCadastro"));
const AcademiaInicio = lazyPagina(() => import("./pages/academia/AcademiaInicio"));
const Projetos = lazyPagina(() => import("./pages/academia/Projetos"));
const Treinamento = lazyPagina(() => import("./pages/academia/Treinamento"));
const TrilhaDetalhe = lazyPagina(() => import("./pages/academia/TrilhaDetalhe"));
const Argumentos = lazyPagina(() => import("./pages/academia/Argumentos"));
const Clientes = lazyPagina(() => import("./pages/academia/Clientes"));
const RegistrarCliente = lazyPagina(() => import("./pages/academia/RegistrarCliente"));
const RegistroDetalhe = lazyPagina(() => import("./pages/academia/RegistroDetalhe"));
const AdminAcademia = lazyPagina(() => import("./pages/admin/AdminAcademia"));
const VisaoGeralAcademia = lazyPagina(() => import("./pages/admin/VisaoGeralAcademia"));
const CorretoresAcademia = lazyPagina(() => import("./pages/admin/CorretoresAcademia"));
const AvisosAcademia = lazyPagina(() => import("./pages/admin/AvisosAcademia"));
const ConteudoAcademia = lazyPagina(() => import("./pages/admin/ConteudoAcademia"));
const ProjetosConteudo = lazyPagina(() => import("./pages/admin/ProjetosConteudo"));
const ProjetoEditor = lazyPagina(() => import("./pages/admin/ProjetoEditor"));
const TrilhasConteudo = lazyPagina(() => import("./pages/admin/TrilhasConteudo"));
const TrilhaEditor = lazyPagina(() => import("./pages/admin/TrilhaEditor"));
const ArgumentosConteudo = lazyPagina(() => import("./pages/admin/ArgumentosConteudo"));
const Equipe = lazyPagina(() => import("./pages/academia/Equipe"));
const MeusDados = lazyPagina(() => import("./pages/academia/MeusDados"));
const SugestoesArgumentos = lazyPagina(() => import("./pages/admin/SugestoesArgumentos"));
const ProjetoDetalhe = lazyPagina(() => import("./pages/academia/ProjetoDetalhe"));
const PublicProjeto = lazyPagina(() => import("./pages/PublicProjeto"));
const ParceriasLayout = lazyPagina(() => import("./pages/parcerias/ParceriasLayout"));
const Parceiras = lazyPagina(() => import("./pages/parcerias/Parceiras"));
const ParceiraDetail = lazyPagina(() => import("./pages/parcerias/ParceiraDetail"));
const Registros = lazyPagina(() => import("./pages/parcerias/Registros"));
const Acessos = lazyPagina(() => import("./pages/parcerias/Acessos"));
const Kanban = lazyPagina(() => import("./pages/parcerias/Kanban"));
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRoute } from "./components/RoleRoute";
import AppLayout from "./components/AppLayout";

// Daqui para baixo, cada página é carregada só quando aberta (lib/lazyPagina).
// Ficam no arquivo principal só a entrada, o login e a moldura do app.
const AdminLayout = lazyPagina(() => import("./pages/admin/AdminLayout"));
const AdminOverview = lazyPagina(() => import("./pages/admin/AdminOverview"));
const AdminOrganizations = lazyPagina(() => import("./pages/admin/AdminOrganizations"));
const ModulosUsuarios = lazyPagina(() => import("./pages/admin/ModulosUsuarios"));
const AdminAccounts = lazyPagina(() => import("./pages/admin/AdminAccounts"));
const Estoque = lazyPagina(() => import("./pages/Estoque"));
const TeamPicks = lazyPagina(() => import("./pages/TeamPicks"));
const Profile = lazyPagina(() => import("./pages/Profile"));
const MyPerformance = lazyPagina(() => import("./pages/MyPerformance"));
const CrmLayout = lazyPagina(() => import("./pages/crm/CrmLayout"));
const CrmDashboard = lazyPagina(() => import("./pages/crm/CrmDashboard"));
const Pipeline = lazyPagina(() => import("./pages/crm/Pipeline"));
const Leads = lazyPagina(() => import("./pages/crm/Leads"));
const LeadDetail = lazyPagina(() => import("./pages/crm/LeadDetail"));
const Opportunities = lazyPagina(() => import("./pages/crm/Opportunities"));

export default function App() {
  return (
    <FeedbackProvider>
    <TenantBrandingProvider>
    <AcessoCanalProvider>
      <Suspense fallback={<CarregandoPagina />}>
      <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/entrar" element={<Login />} />
      <Route path="/nova-senha" element={<NovaSenha />} />
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
        <Route element={<ModuloRoute modulo="avaliador" />}>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/imoveis" element={<Properties />} />
          <Route path="/app/selecoes" element={<Selections />} />
          <Route path="/app/selections/:id" element={<SelectionDetail />} />
          <Route path="/app/desempenho" element={<MyPerformance />} />
          <Route path="/app/portfolio" element={<Portfolio />} />
        </Route>
        <Route path="/app/perfil" element={<Profile />} />
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
          <Route path="modulos" element={<ModulosUsuarios />} />
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
      </Suspense>
    </AcessoCanalProvider>
    </TenantBrandingProvider>
    </FeedbackProvider>
  );
}

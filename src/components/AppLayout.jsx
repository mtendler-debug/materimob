import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useProfile } from "../lib/useProfile";
import { useOrganization, canManage } from "../lib/useOrganization";
import { useTenantBranding } from "../lib/tenantBranding";
import { useAcessoCanal } from "../lib/AcessoCanal";
import AcademiaTabBar, { MENU_ACADEMIA } from "./AcademiaTabBar";
import { CarregandoPagina } from "./CarregandoPagina";

// Único componente que monta o menu de /app e /admin — a partir do papel
// de quem está logado, não de uma lista fixa repetida em cada página.
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const { accountType, isPlatformAdmin, hasCrmAccess, modulos, loading: loadingProfile } = useProfile();
  const { org, role, memberships, activeOrgId, setActiveOrgId, loading: loadingOrg } = useOrganization();
  const marcaPortal = useTenantBranding();
  const { acesso } = useAcessoCanal();
  const location = useLocation();
  const [aviso, setAviso] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // AppLayout não remonta quando um RoleRoute interno redireciona (é o
  // mesmo componente de layout, só troca o que aparece no Outlet) — por
  // isso o aviso precisa reagir a mudanças de location, não só ao mount.
  useEffect(() => {
    if (location.state?.aviso) setAviso(location.state.aviso);
    setMobileOpen(false);
  }, [location]);

  // Quem entra por um portal de marca (ex. materimob.com.br/chaincorp) e
  // é membro daquela organização já atua "vestindo" ela, sem precisar
  // trocar manualmente em "Ver como".
  useEffect(() => {
    if (!marcaPortal || loadingOrg) return;
    const souMembro = memberships.some((m) => m.organizations.id === marcaPortal.id);
    if (souMembro && activeOrgId !== marcaPortal.id) setActiveOrgId(marcaPortal.id);
  }, [marcaPortal, loadingOrg, memberships, activeOrgId, setActiveOrgId]);

  // A marca da organização ativa (cores/logo) segue reskinando a sidebar
  // por cima da base pastel — funciona tanto vindo do portal com marca
  // quanto trocando em "Ver como".
  const marca = org?.cor_primaria || org?.cor_secundaria ? org : null;
  const corSidebar = marca?.cor_secundaria || undefined;
  const corDestaque = marca?.cor_primaria || undefined;

  if (loadingProfile || loadingOrg || acesso === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }

  const pertenceOrg = memberships.length > 0;
  const gerenteIncorporadora = pertenceOrg && canManage(role) && org?.tipo === "incorporadora";
  const gerenteImobiliaria = pertenceOrg && canManage(role) && org?.tipo === "imobiliaria";
  const ehOrganizacao = accountType === "imobiliaria" || accountType === "incorporadora";

  // Avaliador desligado para esta conta: some o grupo, mas o perfil continua à mão.
  const grupoAvaliador = !modulos.avaliador
    ? { label: "Conta", itens: [{ to: "/app/perfil", label: "Meu perfil" }] }
    : {
    label: "Avaliador",
    itens: [
      { to: "/app", label: "Meus clientes", end: true },
      { to: "/app/desempenho", label: "Meu desempenho" },
      { to: "/app/imoveis", label: "Imóveis" },
      { to: "/app/portfolio", label: "Meu estoque" },
      { to: "/app/selecoes", label: "Meus roteiros" },
      { to: "/app/perfil", label: "Meu perfil" },
    ],
  };
  const grupoCrm = {
    label: "CRM",
    itens: [{ to: "/app/crm", label: hasCrmAccess ? "CRM" : "CRM 🔒" }],
  };
  // Gestão do canal: só o dono (administrador da plataforma) enxerga.
  const grupoParcerias = isPlatformAdmin
    ? {
        label: "Parcerias",
        itens: [
          { to: "/app/parcerias/kanban", label: "Kanban" },
          { to: "/app/parcerias/parceiras", label: "Parceiras" },
          { to: "/app/parcerias/registros", label: "Registros" },
        ],
      }
    : null;
  // Quem pediu acesso à Academia (em qualquer situação) vê a Academia primeiro:
  // o parceiro continua sendo corretor, então o resto do menu segue logo abaixo.
  // Só o Início tem tela na A1; os demais aparecem como "em breve".
  const liberado = acesso?.status === "liberado";
  const grupoAcademia = acesso
    ? {
        label: "Academia",
        itens: MENU_ACADEMIA.filter(
          (i) => i.to === "/app/academia" || (liberado && (!i.soGestor || acesso.papel === "gestor")),
        ),
      }
    : null;
  // Quem já tem conta e ainda não pediu acesso encontra a porta no menu. O dono
  // do canal (administrador da plataforma) não pede acesso à própria Academia.
  const grupoConvite =
    !acesso && !isPlatformAdmin
      ? { label: "Academia", itens: [{ to: "/app/academia", label: "Academia de Vendas" }] }
      : null;
  const itensOrg = [];
  if (pertenceOrg) itensOrg.push({ to: "/app/organizacao", label: "Minha organização" });
  if (gerenteIncorporadora) itensOrg.push({ to: "/app/estoque", label: "Estoque" });
  if (gerenteImobiliaria) itensOrg.push({ to: "/app/time", label: "Seleção do time" });
  const grupoOrg = pertenceOrg ? { label: "Organização", itens: itensOrg } : null;
  // O dono do canal não é parceiro (nunca tem linha em pc_acessos), então a Academia
  // dele é a gestão: pedidos, corretores, avisos e conteúdo.
  const grupoAcademiaDono = isPlatformAdmin
    ? { label: "Academia", itens: [{ to: "/admin/academia", label: "Gestão da Academia" }] }
    : null;
  const grupoAdmin = isPlatformAdmin
    ? { label: "Administração", itens: [{ to: "/admin", label: "Administração", exceto: "/admin/academia" }] }
    : null;

  // Quando a casa é a organização, ela vem primeiro — mas "Meus clientes"
  // continua no menu, só desce dentro do grupo Avaliador. account_type
  // nunca esconde a carteira.
  const gruposBase = ehOrganizacao
    ? [grupoOrg, grupoAvaliador, grupoCrm, grupoParcerias, grupoConvite, grupoAcademiaDono, grupoAdmin]
    : [grupoAvaliador, grupoCrm, grupoOrg, grupoParcerias, grupoConvite, grupoAcademiaDono, grupoAdmin];
  const grupos = grupoAcademia ? [grupoAcademia, ...gruposBase] : gruposBase;

  const { grupoLabel, itemLabel } = breadcrumbAtual(grupos, location.pathname);

  const gruposVisiveis = grupos.filter(Boolean).filter((g) => g.itens.length > 0);
  const naAcademia = liberado && location.pathname.startsWith("/app/academia");
  const nomeMarca = marca?.nome_exibicao || marca?.name || "MaterImob";
  const iniciais = (user?.email || "?").slice(0, 2).toUpperCase();

  // Item ativo: azul suave por padrão; com marca da organização, o tom dela.
  function estiloAtivo(ativo) {
    if (!ativo || !corDestaque) return undefined;
    return { background: `color-mix(in srgb, ${corDestaque} 14%, white)`, boxShadow: `inset 3px 0 0 ${corDestaque}` };
  }

  // Mesmo menu na sidebar (computador) e na folha do celular.
  const menu = gruposVisiveis.map((g, gi) => (
    <div key={g.label}>
      <p className={`mb-1.5 px-3 text-caption font-semibold tracking-[.08em] text-muted uppercase ${gi ? "mt-5" : ""}`}>{g.label}</p>
      {g.itens.map((i) =>
        !i.to ? (
          <div
            key={i.label}
            aria-disabled="true"
            className="flex min-h-11 items-center justify-between gap-2 rounded-[10px] px-3 text-body-sm font-medium text-muted md:min-h-10"
          >
            {i.label}
            <span className="rounded-full bg-light px-2 text-caption font-semibold text-graytext">em breve</span>
          </div>
        ) : (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive: ativoBruto }) => {
              const isActive = ativoBruto && !(i.exceto && location.pathname.startsWith(i.exceto));
              return `flex min-h-11 items-center rounded-[10px] px-3 text-body-sm transition-all duration-200 ease-out md:min-h-10 ${
                isActive ? "bg-brand-soft font-semibold text-sky-800" : "font-medium text-slate-600 hover:bg-light hover:text-charcoal"
              }`;
            }}
            style={({ isActive }) => estiloAtivo(isActive && !(i.exceto && location.pathname.startsWith(i.exceto)))}
          >
            {i.label}
          </NavLink>
        ),
      )}
    </div>
  ));

  const seletorOrg = memberships.length > 1 && (
    <select
      value={activeOrgId ?? ""}
      onChange={(e) => setActiveOrgId(e.target.value)}
      className="min-h-10 w-full rounded-control border border-slate-200 bg-white px-3 text-caption text-slate-700 transition-all duration-200 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
    >
      {memberships.map((m) => (
        <option key={m.organizations.id} value={m.organizations.id}>
          Ver como: {m.organizations.name}
        </option>
      ))}
    </select>
  );

  // Barra inferior (celular): até 4 módulos + "Mais". Na Academia, a barra própria dela ocupa o lugar.
  const abas = gruposVisiveis.slice(0, 4);
  const iconeGrupo = (label) => ICONES_GRUPO[label] ?? ICONES_GRUPO.Avaliador;

  return (
    <div className="min-h-screen bg-bg md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col overflow-y-auto border-r border-slate-200/70 bg-white/80 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
          <span className="h-6 w-6 rounded-lg bg-brand" style={corDestaque ? { background: corDestaque } : undefined} />
          <span className="text-base font-bold tracking-tight text-charcoal">MaterImob</span>
        </div>
        {/* Selo do cliente ativo: a organização em que o usuário está atuando agora. */}
        {org && (
          <div
            className="mx-4 mb-2 inline-flex max-w-[calc(100%-2rem)] items-center gap-1.5 self-start rounded-full bg-light px-2.5 py-1 text-caption font-semibold text-graytext"
            title={org.nome_exibicao || org.name}
          >
            {marca?.logo_url ? (
              <img src={marca.logo_url} alt="" className="h-3.5 max-w-[60px] object-contain" />
            ) : (
              <span className="truncate">{org.nome_exibicao || org.name}</span>
            )}
          </div>
        )}
        {seletorOrg && <div className="px-4 pb-2">{seletorOrg}</div>}
        <nav className="flex-1 px-3 py-3">{menu}</nav>
        <div className="flex items-center gap-2.5 border-t border-slate-200/70 px-4 py-3.5">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-slate-800 text-caption font-semibold text-white">{iniciais}</span>
          <p className="min-w-0 flex-1 truncate text-caption text-graytext">{user?.email}</p>
          <button
            onClick={signOut}
            className="min-h-10 rounded-[10px] px-3 text-caption font-semibold text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex min-h-14 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:hidden">
          <span className="text-base font-bold tracking-tight text-charcoal">{nomeMarca}</span>
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-800 text-caption font-semibold text-white"
          >
            {iniciais}
          </button>
        </header>

        <header className="sticky top-0 z-20 hidden min-h-[60px] items-center border-b border-slate-200/70 bg-bg/80 px-8 backdrop-blur-xl md:flex">
          <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-body-sm text-muted">
            <span>MaterImob</span>
            {grupoLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span>{grupoLabel}</span>
              </>
            )}
            {itemLabel && (
              <>
                <span aria-hidden="true">/</span>
                <span className="font-semibold text-slate-700">{itemLabel}</span>
              </>
            )}
          </nav>
        </header>

        {aviso && (
          <div className="flex items-center justify-center gap-2 border-b border-sky-200 bg-brand-soft px-6 py-2 text-center text-caption text-sky-800">
            {aviso}
            <button onClick={() => setAviso(null)} className="font-semibold underline transition-colors hover:text-sky-900">
              fechar
            </button>
          </div>
        )}
        <div className="pb-24 md:pb-0">
          <Suspense fallback={<CarregandoPagina telaCheia={false} />}>
            <Outlet />
          </Suspense>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-x-0 bottom-0 max-h-[82%] overflow-y-auto rounded-t-sheet border-t border-white/60 bg-white/95 px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-float backdrop-blur-xl"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-rule" />
            {seletorOrg && <div className="mb-4">{seletorOrg}</div>}
            {menu}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/70 pt-3 text-caption text-graytext">
              <span className="min-w-0 truncate">{user?.email}</span>
              <button
                onClick={signOut}
                className="min-h-11 flex-none rounded-control border border-slate-200 px-4 font-semibold text-slate-700 transition-all duration-200 hover:bg-light"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {naAcademia ? (
        <AcademiaTabBar />
      ) : (
        <nav
          aria-label="Módulos"
          className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200/70 bg-white/90 px-1 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
          style={{ gridTemplateColumns: `repeat(${abas.length + 1}, minmax(0, 1fr))` }}
        >
          {abas.map((g) => {
            const ativo = g.label === grupoLabel;
            const alvo = g.itens.find((i) => i.to);
            return (
              <NavLink
                key={g.label}
                to={alvo?.to ?? "/app"}
                className={`grid min-h-12 justify-items-center content-center gap-0.5 text-[11px] font-semibold transition-colors duration-200 ${ativo ? "text-brand" : "text-muted"}`}
              >
                <Icone d={iconeGrupo(g.label)} />
                {g.label === "Organização" ? "Org." : g.label === "Administração" ? "Admin" : g.label}
              </NavLink>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className="grid min-h-12 justify-items-center content-center gap-0.5 text-[11px] font-semibold text-muted"
          >
            <Icone d={ICONES_GRUPO.Mais} />
            Mais
          </button>
        </nav>
      )}
    </div>
  );
}

const ICONES_GRUPO = {
  Avaliador: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.300a3 3 0 0 1 0 5.400M18 14.400c1.800.8 3 2.600 3 5.600",
  CRM: "M3 5h18l-7 8v6l-4-2v-4z",
  Academia: "M3 9l9-4 9 4-9 4zM7 11v5c0 1 2.200 2.500 5 2.500s5-1.500 5-2.500v-5",
  Organização: "M5 21V4h9v17M14 9h5v12M3 21h18M8.500 8h2M8.500 12h2M8.500 16h2",
  Parcerias: "M8 12l3 3 5-6M12 3l8 3v6c0 4.500-3.300 7.800-8 9-4.700-1.200-8-4.500-8-9V6z",
  Administração: "M12 3l8 3v6c0 4.500-3.300 7.800-8 9-4.700-1.200-8-4.500-8-9V6z",
  Conta: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.600-7 8-7s8 3 8 7",
  Mais: "M5 12h.01M12 12h.01M19 12h.01",
};

function Icone({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// Deriva "grupo / item" do menu a partir do caminho atual — sem precisar
// anotar cada rota com o próprio breadcrumb à parte.
function breadcrumbAtual(grupos, pathname) {
  for (const g of grupos.filter(Boolean)) {
    for (const i of g.itens) {
      if (i.to && (i.end ? pathname === i.to : pathname.startsWith(i.to))) {
        return { grupoLabel: g.label, itemLabel: i.label };
      }
    }
  }
  return { grupoLabel: null, itemLabel: null };
}

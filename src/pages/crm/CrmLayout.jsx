import { whatsappUrl } from "../../lib/contato";
import { NavLink, Outlet } from "react-router-dom";
import { useProfile } from "../../lib/useProfile";
import { useOrganization } from "../../lib/useOrganization";

export default function CrmLayout() {
  const { hasCrmAccess, loading: loadingProfile } = useProfile();
  const { memberships, loading: loadingOrg } = useOrganization();

  if (loadingProfile || loadingOrg) {
    return <div className="p-6 text-sm text-muted">Carregando…</div>;
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[1100px] px-4 py-7 md:px-7">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">CRM</h1>
        <p className="mt-1.5 max-w-[66ch] text-base text-graytext">
          Seu funil de leads e oportunidades. Um lead pode gerar mais de um negócio ao mesmo tempo, por exemplo comprar um
          imóvel novo e vender o atual.
        </p>

        {hasCrmAccess ? (
          <>
            <nav className="-mx-2.5 mt-[18px] flex gap-0.5 overflow-x-auto border-b border-slate-200 px-2.5">
              <Tab to="/app/crm" end>
                Painel
              </Tab>
              <Tab to="/app/crm/pipeline">Pipeline</Tab>
              <Tab to="/app/crm/leads">Leads</Tab>
              <Tab to="/app/crm/oportunidades">Oportunidades</Tab>
            </nav>
            <div className="mt-5">
              <Outlet />
            </div>
          </>
        ) : (
          <CrmPaywall temOrganizacao={memberships.length > 0} />
        )}
      </div>
    </div>
  );
}

// Ao contrário do RoleRoute (que tira quem não pode de dentro da área
// inteira), aqui a pessoa continua em /app/crm — só o conteúdo vira
// uma chamada pra assinar, em vez de redirecionar pra outro lugar.
function CrmPaywall({ temOrganizacao }) {
  return (
    <div className="mt-6 rounded-[24px] border border-slate-200/70 bg-white p-8 text-center shadow-soft">
      <p className="text-caption font-semibold tracking-[.08em] text-brand uppercase">MaterImob · CRM</p>
      <h2 className="mt-2 text-headline leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">
        Organize seus leads e oportunidades
      </h2>
      <p className="mx-auto mt-3 max-w-md text-body-sm leading-relaxed text-graytext">
        O mesmo cliente do Avaliador ganha um funil de negócio — pipeline por etapa, oportunidades
        de compra e venda ligadas a lançamentos e estoque reais, e alerta automático quando um lead
        tem os dois ao mesmo tempo.
      </p>
      <div className="mx-auto mt-6 max-w-sm rounded-card bg-bg p-4 text-body-sm text-graytext">
        {temOrganizacao ? (
          <>Peça para o diretor da sua organização incluir o CRM no plano com a MaterImob.</>
        ) : (
          <>
            Assinatura individual chega em breve.{" "}
            <a href={whatsappUrl("Olá! Quero saber mais sobre o CRM do MaterImob.")} target="_blank" rel="noreferrer" className="font-semibold text-charcoal underline underline-offset-2">
              Fale com a gente
            </a>{" "}
            se quiser começar antes.
          </>
        )}
      </div>
    </div>
  );
}

function Tab({ to, end, children }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex min-h-[46px] flex-none items-center px-3.5 text-body-sm font-semibold whitespace-nowrap transition-colors duration-200 ${
          isActive
            ? "text-charcoal after:absolute after:inset-x-3 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-brand"
            : "text-graytext hover:text-charcoal"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

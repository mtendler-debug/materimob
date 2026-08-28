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
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-[26px] font-semibold text-charcoal">CRM</h1>
        <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-graytext">
          Seu funil de leads e oportunidades — um lead pode gerar mais de um negócio ao mesmo tempo
          (ex.: comprar um imóvel novo e vender o atual).
        </p>

        {hasCrmAccess ? (
          <>
            <nav className="mt-4 flex gap-5 border-b border-rule">
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
    <div className="mt-6 rounded-[16px] border border-rule bg-white p-8 text-center">
      <p className="text-[10.5px] font-bold tracking-[.16em] text-gold uppercase">MaterImob · CRM</p>
      <h2 className="font-serif mt-2 text-[24px] font-semibold text-charcoal">
        Organize seus leads e oportunidades
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-graytext">
        O mesmo cliente do Avaliador ganha um funil de negócio — pipeline por etapa, oportunidades
        de compra e venda ligadas a lançamentos e estoque reais, e alerta automático quando um lead
        tem os dois ao mesmo tempo.
      </p>
      <div className="mx-auto mt-6 max-w-sm rounded-[12px] border border-rule bg-bg p-4 text-sm text-graytext">
        {temOrganizacao ? (
          <>Peça para o diretor da sua organização incluir o CRM no plano com a MaterImob.</>
        ) : (
          <>
            Assinatura individual chega em breve.{" "}
            <a href="mailto:contato@materimob.com.br" className="font-bold text-charcoal underline">
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
        `border-b-2 pb-2 text-sm font-bold ${
          isActive ? "border-gold text-charcoal" : "border-transparent text-graytext"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

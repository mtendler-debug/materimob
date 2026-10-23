import { Link } from "react-router-dom";
import Button from "./ui/Button";

// Cartão "Comece por aqui" de Meus clientes. Os passos 1 e 2 vêm dos dados do corretor;
// o 3 vem de uma marca guardada no perfil (link copiado). Some quando os três estão feitos
// ou quando o corretor dispensa.
export default function PrimeirosPassos({ nome, selecaoId, temAtendimento, temImoveis, linkCopiado, onNovo, onDispensar, mostrarAcademia }) {
  const roteiro = selecaoId ? `/app/selections/${selecaoId}` : null;
  const passos = [
    {
      feito: temAtendimento,
      titulo: "Crie o seu primeiro atendimento",
      texto: "Informe o cliente e dê um nome ao roteiro. Leva menos de um minuto.",
      acao: <Button size="sm" onClick={onNovo}>Novo atendimento</Button>,
    },
    {
      feito: temImoveis,
      titulo: "Adicione imóveis ao roteiro",
      texto: "Cadastre o imóvel ou importe do seu estoque, dentro do roteiro.",
      acao: roteiro && <Button to={roteiro} size="sm" variant="secondary">Abrir o roteiro</Button>,
    },
    {
      feito: linkCopiado,
      titulo: "Envie o link ao cliente",
      texto: "Ele avalia pelo celular, sem senha, e você acompanha o ranking aqui.",
      acao: roteiro && <Button to={roteiro} size="sm" variant="secondary">Copiar o link</Button>,
    },
  ];
  const feitos = passos.filter((p) => p.feito).length;
  const proximo = passos.findIndex((p) => !p.feito);

  return (
    <>
      <section className="mt-5 rounded-card border border-slate-200/70 bg-white p-5 shadow-soft" aria-label="Primeiros passos">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-body font-semibold tracking-tight text-charcoal">Comece por aqui{nome ? `, ${nome}` : ""}</h2>
          <span className="text-caption font-semibold text-graytext">{feitos} de 3 passos</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${(feitos / 3) * 100}%` }} />
        </div>
        <ol className="mt-3 space-y-2">
          {passos.map((p, i) => (
            <li key={p.titulo} className="grid grid-cols-[28px_1fr] items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200/70 px-3 py-2.5 sm:grid-cols-[28px_1fr_auto]">
              <span
                aria-hidden="true"
                className={`grid h-[26px] w-[26px] place-items-center rounded-full text-[13px] font-bold ${
                  p.feito ? "bg-success-bg text-success-text" : "border-2 border-rule text-graytext"
                }`}
              >
                {p.feito ? "✓" : i + 1}
              </span>
              <div className="min-w-0">
                <b className={`block text-body-sm ${p.feito ? "text-muted line-through" : "text-charcoal"}`}>{p.titulo}</b>
                <small className="text-caption text-graytext">{p.texto}</small>
              </div>
              {!p.feito && i === proximo && p.acao && <div className="col-start-2 justify-self-start sm:col-start-3">{p.acao}</div>}
            </li>
          ))}
        </ol>
        <button onClick={onDispensar} className="mt-2 min-h-9 text-caption text-graytext underline">
          Já conheço, dispensar
        </button>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-card border border-slate-200/70 bg-white p-4">
          <span className="self-start rounded-full bg-success-bg px-2.5 py-0.5 text-caption font-semibold text-success-text">Liberado agora</span>
          <h3 className="text-body-sm font-semibold text-charcoal">CRM</h3>
          <p className="text-caption text-graytext">Seus leads e oportunidades num funil simples, ligado aos clientes que avaliam com você.</p>
          <Link to="/app/crm" className="mt-0.5 min-h-9 text-body-sm font-semibold text-brand hover:text-brand-hover">Abrir o CRM →</Link>
        </div>
        {mostrarAcademia && (
          <div className="flex flex-col gap-1.5 rounded-card border border-slate-200/70 bg-white p-4">
            <span className="self-start rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-sky-800">Acesso por aprovação</span>
            <h3 className="text-body-sm font-semibold text-charcoal">Academia de Vendas</h3>
            <p className="text-caption text-graytext">Materiais prontos, treinamento e argumentos para apresentar cada projeto.</p>
            <Link to="/app/academia" className="mt-0.5 min-h-9 text-body-sm font-semibold text-brand hover:text-brand-hover">Pedir acesso →</Link>
          </div>
        )}
      </div>
    </>
  );
}

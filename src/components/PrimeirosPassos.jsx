import { Link } from "react-router-dom";

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
      acao: <button onClick={onNovo} className="rounded-[9px] bg-sky-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-sky-700">Novo atendimento</button>,
    },
    {
      feito: temImoveis,
      titulo: "Adicione imóveis ao roteiro",
      texto: "Cadastre o imóvel ou importe do seu estoque, dentro do roteiro.",
      acao: roteiro && <Link to={roteiro} className="rounded-[9px] border-[1.5px] border-rule bg-white px-3 py-1.5 text-[13px] font-bold text-charcoal hover:border-sky-600">Abrir o roteiro</Link>,
    },
    {
      feito: linkCopiado,
      titulo: "Envie o link ao cliente",
      texto: "Ele avalia pelo celular, sem senha, e você acompanha o ranking aqui.",
      acao: roteiro && <Link to={roteiro} className="rounded-[9px] border-[1.5px] border-rule bg-white px-3 py-1.5 text-[13px] font-bold text-charcoal hover:border-sky-600">Copiar o link</Link>,
    },
  ];
  const feitos = passos.filter((p) => p.feito).length;
  const proximo = passos.findIndex((p) => !p.feito);

  return (
    <>
      <section className="mt-5 rounded-[14px] border border-rule bg-white p-5" aria-label="Primeiros passos">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[16px] font-bold text-charcoal">Comece por aqui{nome ? `, ${nome}` : ""}</h2>
          <span className="text-xs font-semibold text-graytext">{feitos} de 3 passos</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
          <div className="h-full rounded-full bg-sky-600 transition-[width]" style={{ width: `${(feitos / 3) * 100}%` }} />
        </div>
        <ol className="mt-3 space-y-2">
          {passos.map((p, i) => (
            <li key={p.titulo} className="grid grid-cols-[28px_1fr] items-center gap-x-3 gap-y-2 rounded-[12px] border border-rule px-3 py-2.5 sm:grid-cols-[28px_1fr_auto]">
              <span
                aria-hidden="true"
                className={`grid h-[26px] w-[26px] place-items-center rounded-full text-[13px] font-extrabold ${
                  p.feito ? "bg-emerald-100 text-emerald-800" : "border-2 border-rule text-graytext"
                }`}
              >
                {p.feito ? "✓" : i + 1}
              </span>
              <div className="min-w-0">
                <b className={`block text-[14.5px] ${p.feito ? "text-muted line-through" : "text-charcoal"}`}>{p.titulo}</b>
                <small className="text-[13px] text-graytext">{p.texto}</small>
              </div>
              {!p.feito && i === proximo && p.acao && <div className="col-start-2 justify-self-start sm:col-start-3">{p.acao}</div>}
            </li>
          ))}
        </ol>
        <button onClick={onDispensar} className="mt-3 text-xs text-graytext underline">
          Já conheço, dispensar
        </button>
      </section>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-[14px] border border-rule bg-white p-4">
          <span className="self-start rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">Liberado agora</span>
          <h3 className="text-[15px] font-bold text-charcoal">CRM</h3>
          <p className="text-[13px] text-graytext">Seus leads e oportunidades num funil simples, ligado aos clientes que avaliam com você.</p>
          <Link to="/app/crm" className="mt-0.5 text-[13.5px] font-bold text-sky-700">Abrir o CRM →</Link>
        </div>
        {mostrarAcademia && (
          <div className="flex flex-col gap-1.5 rounded-[14px] border border-rule bg-white p-4">
            <span className="self-start rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">Acesso por aprovação</span>
            <h3 className="text-[15px] font-bold text-charcoal">Academia de Vendas</h3>
            <p className="text-[13px] text-graytext">Materiais prontos, treinamento e argumentos para apresentar cada projeto.</p>
            <Link to="/app/academia" className="mt-0.5 text-[13.5px] font-bold text-sky-700">Pedir acesso →</Link>
          </div>
        )}
      </div>
    </>
  );
}

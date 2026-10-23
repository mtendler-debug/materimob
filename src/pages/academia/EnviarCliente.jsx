import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { baixar, nomeArquivo, registrarAtividade } from "../../lib/academiaUtil";

// Envio do kit ao cliente: o corretor escolhe a opção pelo perfil, digita o
// nome, ajusta o texto e envia pelo WhatsApp. O link rastreado é criado no
// servidor no momento do envio (pc_criar_envio) e entra no lugar de {link}.
export default function EnviarCliente({ kit, acesso }) {
  const { toast } = useFeedback();
  const ops = kit.kit?.abordagens ?? [];
  const [opSel, setOpSel] = useState(ops[0]?.opcao);
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [sujo, setSujo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(null);

  const op = ops.find((o) => o.opcao === opSel) ?? ops[0];

  function montar(o, nomeCliente) {
    const base = kit.textos_whatsapp?.[o.tese] ?? o.texto ?? "";
    return base
      .split("[Nome do Cliente]")
      .join(nomeCliente.trim() || "[Nome do Cliente]")
      .split("[Nome do Corretor]")
      .join(acesso.nome);
  }

  useEffect(() => {
    if (op) {
      setTexto(montar(op, nome));
      setSujo(false);
      setEnviado(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opSel]);

  useEffect(() => {
    if (op && !sujo) setTexto(montar(op, nome));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nome]);

  if (!op) return <p className="text-sm text-graytext">Este projeto ainda não tem mensagens prontas.</p>;

  const pendencias = [...new Set(texto.match(/\[[^\]]+\]/g) ?? [])];
  const cards = kit.kit?.cards_img?.[op.tese];

  async function criarLink() {
    const { data: token, error } = await supabase.rpc("pc_criar_envio", {
      p_empreendimento: kit.empreendimento_id,
      p_tese: op.tese,
      p_cliente_nome: nome.trim() || null,
    });
    if (error) throw new Error(error.message);
    const link = `${window.location.origin}/p/${token}`;
    const final = texto.includes("{link}") ? texto.split("{link}").join(link) : `${texto}\n\n${link}`;
    return { link, final };
  }

  async function enviar() {
    // A janela precisa abrir antes do await, senão o navegador do celular
    // bloqueia o pop-up do WhatsApp.
    const janela = window.open("", "_blank");
    setBusy(true);
    setErro("");
    try {
      const { link, final } = await criarLink();
      const url = `https://wa.me/?text=${encodeURIComponent(final)}`;
      if (janela) janela.location.href = url;
      else window.location.href = url;
      setEnviado(link);
    } catch (e) {
      janela?.close();
      setErro(e.message || "Não consegui criar o link agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function copiar() {
    setBusy(true);
    setErro("");
    try {
      const { link, final } = await criarLink();
      await navigator.clipboard.writeText(final);
      setEnviado(link);
      toast("Texto copiado, com o link rastreado.");
    } catch (e) {
      setErro(e.message || "Não consegui copiar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function baixarCard(url, formato) {
    registrarAtividade("baixou_arte", kit.empreendimento_id, `${op.titulo} ${formato}`);
    baixar(url, nomeArquivo(url));
  }

  return (
    <div>
      <h2 className="text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Para quem é cada opção</h2>
      <div className="mt-1.5 grid gap-1.5" role="group" aria-label="Opção da mensagem">
        {ops.map((o) => (
          <button
            key={o.opcao}
            type="button"
            aria-pressed={o.opcao === opSel}
            onClick={() => setOpSel(o.opcao)}
            className={`rounded-card border bg-white px-3 py-2 text-left ${
              o.opcao === opSel ? "border-charcoal ring-1 ring-charcoal" : "border-slate-200/70"
            }`}
          >
            <b className="block text-[13px] text-charcoal">
              Opção {o.opcao} · {o.titulo}
            </b>
            <span className="text-xs text-graytext">{o.quando}</span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        <label htmlFor="env-nome" className="block text-xs font-medium text-graytext">
          Nome do cliente
        </label>
        <input
          id="env-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Roberto"
          autoComplete="off"
          className="mt-1 w-full rounded-control border border-slate-200/70 bg-white px-[10px] py-[10px] text-sm text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
      </div>

      <div className="mt-3">
        <label htmlFor="env-texto" className="block text-xs font-medium text-graytext">
          Texto da mensagem
        </label>
        <textarea
          id="env-texto"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setSujo(true);
          }}
          rows={12}
          className="mt-1 w-full resize-y rounded-control border border-slate-200/70 bg-white px-[10px] py-[10px] text-[13px] leading-snug text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
        />
        <p className="mt-1 text-xs text-graytext">
          O link rastreado é criado no envio e entra no lugar de {"{link}"}.
          {sujo && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => {
                  setTexto(montar(op, nome));
                  setSujo(false);
                }}
                className="font-semibold text-brand hover:underline"
              >
                Restaurar texto
              </button>
            </>
          )}
        </p>
      </div>

      {pendencias.length > 0 && (
        <p className="mt-2 rounded-control border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12.5px] text-amber-800">
          <b>Falta preencher:</b> {pendencias.join(", ")}. O envio fica liberado quando não sobrar nenhum campo entre
          colchetes.
        </p>
      )}
      {erro && (
        <p role="alert" className="mt-2 text-sm text-danger-text">
          {erro}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={enviar}
          disabled={busy || pendencias.length > 0}
          className="min-h-11 rounded-control bg-brand px-3 py-2.5 text-[13.5px] font-bold text-white disabled:opacity-45"
        >
          Enviar pelo WhatsApp
        </button>
        <button
          type="button"
          onClick={copiar}
          disabled={busy}
          className="rounded-control border border-slate-300 bg-white px-3 py-2.5 text-[13.5px] font-bold text-slate-700 disabled:opacity-45"
        >
          Copiar texto
        </button>
      </div>
      <p className="mt-1 text-xs text-graytext">Copiar também cria o link rastreado.</p>

      {enviado && (
        <div className="mt-3 rounded-control border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-[12.5px] text-emerald-900">
          <b>Pronto.</b>
          <ul className="mt-1 list-disc pl-4">
            <li className="break-all">Link criado: {enviado}</li>
            <li>Ficou registrado: enviou o kit, opção {op.opcao}.</li>
            <li>Quando o cliente abrir o link, isso aparece na sua atividade.</li>
          </ul>
        </div>
      )}

      {cards?.feed && (
        <>
          <h2 className="mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Card da opção {op.opcao}</h2>
          <img src={cards.feed} alt={`Card ${op.titulo}`} className="mt-1.5 w-full rounded-control border border-slate-200/70" />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => baixarCard(cards.feed, "1:1")} className={btnLinha}>
              Baixar 1:1 (feed)
            </button>
            {cards.stories && (
              <button type="button" onClick={() => baixarCard(cards.stories, "9:16")} className={btnLinha}>
                Baixar 9:16 (Status)
              </button>
            )}
          </div>
        </>
      )}

      <h2 className="mt-5 text-[10.5px] font-bold uppercase tracking-[.1em] text-graytext">Depois do primeiro contato</h2>
      <Depois kit={kit} acesso={acesso} nome={nome} />
    </div>
  );
}

const btnLinha = "rounded-[10px] border border-slate-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700";

function Depois({ kit, acesso, nome }) {
  const { toast } = useFeedback();
  const k = kit.kit ?? {};

  function preencher(t) {
    return t
      .split("[Nome do Cliente]")
      .join(nome.trim() || "[Nome do Cliente]")
      .split("[Nome do Corretor]")
      .join(acesso.nome);
  }

  async function copiar(t) {
    try {
      await navigator.clipboard.writeText(t);
      registrarAtividade("copiou_texto", kit.empreendimento_id, "mensagem de continuidade");
      toast("Mensagem copiada.");
    } catch {
      toast("Não consegui copiar. Selecione o texto e copie.", "warning");
    }
  }

  return (
    <div className="mt-1.5 space-y-2">
      {k.continuidade?.length > 0 && (
        <Detalhe titulo="Mensagens de continuidade">
          {k.continuidade.map((c) => (
            <div key={c.titulo} className="mb-3 last:mb-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-sky-800">{c.titulo}</div>
              <div className="mt-1 whitespace-pre-wrap">{preencher(c.texto)}</div>
              <button type="button" onClick={() => copiar(preencher(c.texto))} className={`${btnLinha} mt-1.5`}>
                Copiar
              </button>
            </div>
          ))}
        </Detalhe>
      )}
      {k.passos?.length > 0 && (
        <Detalhe titulo="Roteiro de uso">
          <ol className="list-decimal space-y-1 pl-5">
            {k.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </Detalhe>
      )}
      {k.cadencia?.length > 0 && (
        <Detalhe titulo="Cadência">
          <table className="w-full text-[12.5px]">
            <tbody>
              {k.cadencia.map((c, i) => (
                <tr key={i} className="border-b border-slate-200/70 last:border-b-0">
                  <td className="whitespace-nowrap py-1.5 pr-2 align-top font-bold text-charcoal">{c[0]}</td>
                  <td className="py-1.5">
                    {c[1]}
                    <br />
                    <span className="text-graytext">{c[2]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Detalhe>
      )}
      {k.dicas?.length > 0 && (
        <Detalhe titulo="Dicas">
          <ul className="list-disc space-y-1 pl-5">
            {k.dicas.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </Detalhe>
      )}
    </div>
  );
}

export function Detalhe({ titulo, children }) {
  return (
    <details className="rounded-card border border-slate-200/70 bg-white px-3.5 text-[13px]">
      <summary className="cursor-pointer py-2.5 font-semibold text-charcoal">{titulo}</summary>
      <div className="pb-3 text-slate-600">{children}</div>
    </details>
  );
}

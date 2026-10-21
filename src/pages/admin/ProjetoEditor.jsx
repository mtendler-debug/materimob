import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";
import { Campo, Cartao, btnEscuro, btnLinha, btnPerigo, btnVerde, campoCls } from "./conteudoUi";

const SUBSTITUIDOS = ["[Nome do Cliente]", "[Nome do Corretor]"];

function camposPendentes(texto) {
  return [...new Set(texto.match(/\[[^\]]+\]/g) ?? [])].filter((c) => !SUBSTITUIDOS.includes(c));
}

// Editor de um projeto (kit de venda). As mensagens de WhatsApp ficam em
// textos_whatsapp, por tese; as perguntas do cliente, dentro de kit.faq.
export default function ProjetoEditor() {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();
  const [kit, setKit] = useState(undefined);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const arquivos = useRef(null);
  const capa = useRef(null);

  useEffect(() => {
    supabase
      .from("pc_kits")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle()
      .then(({ data }) => {
        setKit(data ?? null);
        if (data) {
          setF({
            nome: data.nome ?? "",
            local_texto: data.local_texto ?? "",
            fase: data.fase ?? "",
            entrega: data.entrega ?? "",
            preco_desde: data.preco_desde ?? "",
            comissao_texto: data.comissao_texto ?? "",
            aviso: data.aviso ?? "",
            resumo: data.resumo ?? "",
            destaques: data.destaques ?? "",
            textos: { ...(data.textos_whatsapp ?? {}) },
            faq: (data.kit?.faq ?? []).map((q) => ({ ...q })),
            galeria: Array.isArray(data.galeria) ? data.galeria.map((g) => ({ ...g })) : [],
            capa_url: data.capa_url ?? "",
          });
        }
      });
  }, [codigo]);

  if (kit === undefined) return <p className="mt-4 text-sm text-muted">Carregando…</p>;
  if (kit === null) return <p className="mt-4 text-sm text-graytext">Projeto não encontrado.</p>;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const abordagens = kit.kit?.abordagens ?? [];
  const teses = abordagens.length ? abordagens.map((a) => ({ tese: a.tese, rotulo: `Opção ${a.opcao} · ${a.titulo ?? a.tese}` })) : Object.keys(f.textos).map((t) => ({ tese: t, rotulo: t }));

  async function enviar(files, destino) {
    if (!files?.length) return;
    setBusy(true);
    const novas = [];
    for (const file of files) {
      const nome = `${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const caminho = `projetos/${kit.codigo}/${destino === "capa" ? "capa" : "fotos"}/${nome}`;
      const { error } = await supabase.storage.from("academia").upload(caminho, file, { contentType: file.type, upsert: false });
      if (error) {
        toast(`Não consegui enviar ${file.name}: ${error.message}`, "danger");
        continue;
      }
      novas.push(supabase.storage.from("academia").getPublicUrl(caminho).data.publicUrl);
    }
    setBusy(false);
    if (!novas.length) return;
    if (destino === "capa") setF((x) => ({ ...x, capa_url: novas[0] }));
    else setF((x) => ({ ...x, galeria: [...x.galeria, ...novas.map((url) => ({ url, legenda: "" }))] }));
    toast("Arquivo enviado. Lembre de salvar o projeto.");
  }

  async function salvar() {
    if (!f.nome.trim()) return toast("Informe o nome do projeto.", "warning");
    setBusy(true);
    const faq = f.faq.filter((q) => q.pergunta.trim() && q.resposta.trim());
    const { error } = await supabase
      .from("pc_kits")
      .update({
        nome: f.nome.trim(),
        local_texto: f.local_texto.trim() || null,
        fase: f.fase.trim() || null,
        entrega: f.entrega.trim() || null,
        preco_desde: f.preco_desde.trim() || null,
        comissao_texto: f.comissao_texto.trim() || null,
        aviso: f.aviso.trim() || null,
        resumo: f.resumo.trim() || null,
        destaques: f.destaques.trim() || null,
        textos_whatsapp: f.textos,
        kit: { ...(kit.kit ?? {}), faq },
        galeria: f.galeria.map((g) => ({ url: g.url, legenda: g.legenda ?? "" })),
        capa_url: f.capa_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", kit.id);
    setBusy(false);
    if (error) return toast(error.message, "danger");
    toast("Projeto salvo. Os corretores já veem a versão nova.");
    navigate("/admin/academia/conteudo/projetos");
  }

  async function removerFoto(i) {
    if (!(await confirm("Remover esta foto da galeria? O arquivo continua guardado.", { tone: "warning", confirmLabel: "Remover" }))) return;
    setF((x) => ({ ...x, galeria: x.galeria.filter((_, j) => j !== i) }));
  }

  return (
    <div className="mt-3 max-w-3xl">
      <Link to="/admin/academia/conteudo/projetos" className="text-sm text-graytext underline">
        ← Projetos
      </Link>
      <h2 className="mt-1 text-lg font-bold text-charcoal">{kit.nome}</h2>

      <Cartao>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <Campo id="p-nome" rotulo="Nome do projeto">
            <input id="p-nome" value={f.nome} onChange={set("nome")} className={campoCls} />
          </Campo>
          <Campo id="p-local" rotulo="Local">
            <input id="p-local" value={f.local_texto} onChange={set("local_texto")} className={campoCls} />
          </Campo>
          <Campo id="p-fase" rotulo="Fase">
            <input id="p-fase" value={f.fase} onChange={set("fase")} className={campoCls} />
          </Campo>
          <Campo id="p-ent" rotulo="Entrega">
            <input id="p-ent" value={f.entrega} onChange={set("entrega")} className={campoCls} />
          </Campo>
          <Campo id="p-preco" rotulo="A partir de (aparece no catálogo)">
            <input id="p-preco" value={f.preco_desde} onChange={set("preco_desde")} className={campoCls} />
          </Campo>
          <Campo id="p-com" rotulo="Comissão (texto que o corretor vê)">
            <input id="p-com" value={f.comissao_texto} onChange={set("comissao_texto")} className={campoCls} />
          </Campo>
        </div>
        <Campo id="p-aviso" rotulo="Aviso em destaque (opcional)" dica="Aparece em âmbar no topo do projeto. Use para restrições, como “só vende após o registro”.">
          <textarea id="p-aviso" rows={2} value={f.aviso} onChange={set("aviso")} className={campoCls} />
        </Campo>
        <Campo id="p-res" rotulo="Resumo (aparece também na página do cliente)">
          <textarea id="p-res" rows={3} value={f.resumo} onChange={set("resumo")} className={campoCls} />
        </Campo>
        <Campo id="p-dest" rotulo="Pontos fortes (um por linha)" dica="Aparecem na página do cliente.">
          <textarea id="p-dest" rows={5} value={f.destaques} onChange={set("destaques")} className={campoCls} />
        </Campo>
      </Cartao>

      <Cartao titulo="Mensagens de WhatsApp">
        <p className="mt-1 text-[11.5px] text-muted">
          [Nome do Cliente] e [Nome do Corretor] são trocados sozinhos, e {"{link}"} vira o link rastreado. Qualquer outro colchete obriga o corretor a preencher antes de enviar.
        </p>
        {teses.map(({ tese, rotulo }) => {
          const texto = f.textos[tese] ?? "";
          const pendentes = camposPendentes(texto);
          return (
            <Campo key={tese} id={`p-t-${tese}`} rotulo={rotulo}>
              <textarea
                id={`p-t-${tese}`}
                rows={8}
                value={texto}
                onChange={(e) => setF((x) => ({ ...x, textos: { ...x.textos, [tese]: e.target.value } }))}
                className={campoCls}
              />
              {!texto.includes("{link}") && <p className="mt-1 text-[11.5px] text-amber-700">Sem {"{link}"}, o link rastreado é colocado no fim da mensagem.</p>}
              {pendentes.length > 0 && <p className="mt-1 text-[11.5px] text-amber-700">O corretor terá que preencher: {pendentes.join(", ")}.</p>}
            </Campo>
          );
        })}
      </Cartao>

      <Cartao titulo={`Perguntas do cliente (${f.faq.length})`}>
        {f.faq.map((q, i) => (
          <div key={i} className="mt-2.5 rounded-[10px] border border-rule p-2.5">
            <Campo id={`q-${i}`} rotulo={`Pergunta ${i + 1}`}>
              <input id={`q-${i}`} value={q.pergunta} onChange={(e) => setF((x) => ({ ...x, faq: x.faq.map((z, j) => (j === i ? { ...z, pergunta: e.target.value } : z)) }))} className={campoCls} />
            </Campo>
            <Campo id={`r-${i}`} rotulo="Resposta">
              <textarea id={`r-${i}`} rows={3} value={q.resposta} onChange={(e) => setF((x) => ({ ...x, faq: x.faq.map((z, j) => (j === i ? { ...z, resposta: e.target.value } : z)) }))} className={campoCls} />
            </Campo>
            <button type="button" onClick={() => setF((x) => ({ ...x, faq: x.faq.filter((_, j) => j !== i) }))} className={`${btnPerigo} mt-2`}>
              Remover pergunta
            </button>
          </div>
        ))}
        <button type="button" onClick={() => setF((x) => ({ ...x, faq: [...x.faq, { pergunta: "", resposta: "" }] }))} className={`${btnLinha} mt-3`}>
          Adicionar pergunta
        </button>
      </Cartao>

      <Cartao titulo={`Fotos (${f.galeria.length})`}>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {f.galeria.map((g, i) => (
            <figure key={g.url} className="relative">
              <img src={g.url} alt={g.legenda} className="aspect-[4/3] w-full rounded-[8px] border border-rule object-cover" />
              <button type="button" onClick={() => removerFoto(i)} className="absolute right-1 top-1 rounded-[6px] bg-slate-900/75 px-1.5 py-0.5 text-[11px] text-white">
                Remover
              </button>
              <input
                aria-label={`Legenda da foto ${i + 1}`}
                value={g.legenda ?? ""}
                onChange={(e) => setF((x) => ({ ...x, galeria: x.galeria.map((z, j) => (j === i ? { ...z, legenda: e.target.value } : z)) }))}
                placeholder="Legenda"
                className="mt-1 w-full rounded-[7px] border border-rule px-2 py-1 text-[12px]"
              />
            </figure>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input ref={arquivos} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { enviar([...e.target.files], "fotos"); e.target.value = ""; }} />
          <input ref={capa} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { enviar([...e.target.files], "capa"); e.target.value = ""; }} />
          <button type="button" disabled={busy} onClick={() => arquivos.current.click()} className={btnLinha}>
            Adicionar fotos
          </button>
          <button type="button" disabled={busy} onClick={() => capa.current.click()} className={btnLinha}>
            Trocar capa
          </button>
          {f.capa_url && <img src={f.capa_url} alt="Capa atual" className="h-9 w-12 rounded-[6px] object-cover" />}
        </div>
      </Cartao>

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={salvar} disabled={busy} className={btnVerde}>
          {busy ? "Salvando…" : "Salvar projeto"}
        </button>
        <button type="button" onClick={() => navigate("/admin/academia/conteudo/projetos")} className={btnEscuro.replace("bg-charcoal text-white", "border border-slate-300 bg-white text-slate-700")}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

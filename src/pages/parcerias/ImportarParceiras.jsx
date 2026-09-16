import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../lib/supabase";
import { generateToken } from "../../lib/token";
import { STATUS_FUNIL_LABELS, PRIORIDADE_LABELS, StatusParceiraChip, PrioridadeChip } from "./Parceiras";

// Planilhas de prospecção não têm um formato fixo — cada praça/corretor
// monta a sua. Em vez de exigir cabeçalho exato, a gente adivinha o
// destino de cada coluna por palavra-chave e deixa o usuário corrigir na
// tela antes de importar (nunca grava sem essa confirmação).
function normalizar(s) {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function chave(s) {
  return normalizar(s).replace(/[^a-z0-9]+/g, " ").trim();
}

const CAMPOS_DESTINO = [
  { valor: "nome_fantasia", label: "Nome (fantasia)" },
  { valor: "cidade", label: "Cidade / endereço" },
  { valor: "uf", label: "UF" },
  { valor: "praca", label: "Praça / região" },
  { valor: "segmento_foco", label: "Segmento / canal" },
  { valor: "responsavel_nome", label: "Nome do responsável" },
  { valor: "responsavel_telefone", label: "Telefone do responsável" },
  { valor: "responsavel_email", label: "E-mail do responsável" },
  { valor: "prioridade", label: "Prioridade" },
  { valor: "status_funil", label: "Status do funil" },
  { valor: "observacao", label: "Vira uma observação" },
  { valor: "ignorar", label: "Não importar esta coluna" },
];

// Checado nesta ordem — mais específico primeiro, senão "Nome do
// Contato" cairia em nome_fantasia só por conter "nome".
const ORDEM_PALAVRAS_CHAVE = [
  ["responsavel_email", ["e mail"]],
  ["responsavel_telefone", ["telefone", "whatsapp", "celular", "fone"]],
  ["responsavel_nome", ["nome do contato", "contato", "responsavel"]],
  ["uf", ["uf", "estado"]],
  ["cidade", ["cidade", "endereco", "localizacao"]],
  ["praca", ["praca", "regiao de atuacao"]],
  ["segmento_foco", ["canal", "segmento"]],
  ["prioridade", ["prioridade"]],
  ["status_funil", ["status", "etapa", "funil"]],
  ["observacao", ["observacao", "observacoes", "notas", "tese", "cargo", "foco"]],
  ["nome_fantasia", ["empresa", "imobiliaria", "nome fantasia", "instituicao", "razao social"]],
];

function adivinharCampo(cabecalho) {
  const k = chave(cabecalho);
  if (!k) return "ignorar";
  for (const [campo, palavras] of ORDEM_PALAVRAS_CHAVE) {
    if (palavras.some((p) => k.includes(p))) return campo;
  }
  return "ignorar";
}

const PLACEHOLDERS_VAZIOS = new Set(["a contatar", "a definir", "nao definido", "n/a", "na", "-", "sem contato"]);
function ehPlaceholder(valor) {
  return PLACEHOLDERS_VAZIOS.has(normalizar(valor));
}

// "Av. X, 880 - Jd. Y, Ribeirão Preto - SP" -> {cidade: "Ribeirão Preto",
// uf: "SP"}. Quando não bate o padrão, devolve o texto inteiro em
// `cidade` — perde a separação por UF, mas nunca perde o dado.
function extrairCidadeUf(endereco) {
  const m = endereco.match(/,\s*([^,]+?)\s*-\s*([A-Za-z]{2})$/);
  if (!m) return { cidade: endereco, uf: null };
  return { cidade: m[1].trim(), uf: m[2].toUpperCase() };
}

function normalizarStatus(valor) {
  if (!valor) return "nao_contatado";
  const alvo = normalizar(valor);
  const achado = Object.entries(STATUS_FUNIL_LABELS).find(([, label]) => normalizar(label) === alvo);
  return achado?.[0] ?? "nao_contatado";
}

function normalizarPrioridade(valor) {
  if (!valor) return null;
  const alvo = normalizar(valor);
  const achado = Object.entries(PRIORIDADE_LABELS).find(([, label]) => normalizar(label) === alvo);
  return achado?.[0] ?? null;
}

// Mescla em vez de duplicar: só preenche o que a parceira já cadastrada
// ainda não tinha — nunca sobrescreve um dado real que já existia. Status
// do funil fica de fora de propósito (muda pelo Kanban/card, com a
// observação obrigatória que já existe lá, nunca silenciosamente aqui).
function construirPatchMescla(existente, r) {
  const patch = {};
  const preencheSeVazio = (campo, novo) => {
    if (novo && !existente[campo]) patch[campo] = novo;
  };
  preencheSeVazio("cidade", r.cidade);
  preencheSeVazio("uf", r.uf);
  preencheSeVazio("praca", r.praca);
  preencheSeVazio("segmento_foco", r.segmento_foco);
  preencheSeVazio("responsavel_nome", r.responsavel_nome);
  preencheSeVazio("responsavel_telefone", r.responsavel_telefone);
  preencheSeVazio("responsavel_email", r.responsavel_email);
  if (r.prioridade && !existente.prioridade) {
    patch.prioridade = r.prioridade;
    patch.prioridade_justificativa = "Definida na importação da planilha.";
    patch.prioridade_calculada_em = new Date().toISOString();
  }
  return patch;
}

function montarRegistro(linha, colunas, mapeamento) {
  const valores = {};
  colunas.forEach((_, i) => {
    const campo = mapeamento[i];
    if (!campo || campo === "ignorar") return;
    const bruto = (linha[i] ?? "").toString().trim();
    if (!bruto) return;
    (valores[campo] ??= []).push(bruto);
  });

  const nome = valores.nome_fantasia?.[0];
  if (!nome) return null;

  const contato = valores.responsavel_nome?.[0];

  let cidade = valores.cidade?.[0] ?? null;
  let uf = valores.uf?.[0]?.toUpperCase().slice(0, 2) ?? null;
  if (cidade && !uf) {
    const extraido = extrairCidadeUf(cidade);
    if (extraido.uf) ({ cidade, uf } = extraido);
  }

  return {
    nome_fantasia: nome,
    cidade,
    uf,
    praca: valores.praca?.[0] ?? null,
    segmento_foco: valores.segmento_foco?.[0] ?? null,
    responsavel_nome: contato && !ehPlaceholder(contato) ? contato : null,
    responsavel_telefone: valores.responsavel_telefone?.[0] ?? null,
    responsavel_email: valores.responsavel_email?.[0] ?? null,
    prioridade: normalizarPrioridade(valores.prioridade?.[0]),
    status_funil: normalizarStatus(valores.status_funil?.[0]),
    observacao: (valores.observacao ?? []).join("\n") || null,
  };
}

export default function ImportarParceiras({ userId, parceirasExistentes, onImported, onCancel }) {
  const [etapa, setEtapa] = useState("upload"); // upload | mapear | importando | resultado
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [colunas, setColunas] = useState([]);
  const [linhas, setLinhas] = useState([]);
  const [mapeamento, setMapeamento] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [erroArquivo, setErroArquivo] = useState("");
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);

  const existentesPorNome = new Map((parceirasExistentes ?? []).map((p) => [normalizar(p.nome_fantasia), p]));

  async function lerArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroArquivo("");
    try {
      const buffer = await arquivo.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const bruto = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const cabecalho = (bruto[0] ?? []).map((c) => c.toString().trim());
      const dados = bruto.slice(1).filter((linha) => linha.some((c) => c.toString().trim() !== ""));
      if (!cabecalho.length || !dados.length) {
        setErroArquivo("Não encontrei uma tabela nessa planilha — confira se a primeira linha tem os títulos das colunas.");
        return;
      }
      setNomeArquivo(arquivo.name);
      setColunas(cabecalho);
      setLinhas(dados);
      setMapeamento(cabecalho.map(adivinharCampo));
      setSelecionados(null); // recalculado no render, com os registros já montados
      setEtapa("mapear");
    } catch {
      setErroArquivo("Não consegui ler esse arquivo — precisa ser .xlsx, .xls ou .csv.");
    }
  }

  const registros = linhas.map((linha) => montarRegistro(linha, colunas, mapeamento)).filter(Boolean);
  const semNome = linhas.length - registros.length;

  function alternarLinha(i) {
    setSelecionados((s) => {
      const novo = new Set(s);
      novo.has(i) ? novo.delete(i) : novo.add(i);
      return novo;
    });
  }

  // Recalcula a seleção default (tudo marcado, exceto o que já existe)
  // toda vez que o mapeamento muda a lista de registros válidos.
  function aoMudarMapeamento(i, campo) {
    setMapeamento((m) => {
      const novo = [...m];
      novo[i] = campo;
      return novo;
    });
    setSelecionados(null); // recalculado abaixo, no render
  }

  // selecionados fica null logo após escolher o arquivo ou remapear uma
  // coluna — computa a seleção padrão aqui (nunca usa `selecionados` null
  // no resto do render) e agenda o valor de verdade pro próximo render.
  // Tudo marcado por padrão — quem já existe mescla (só preenche o que
  // faltava) em vez de duplicar, então não há risco em deixar marcado.
  let selecionadosAtual = selecionados;
  if (selecionadosAtual === null) {
    selecionadosAtual = new Set(registros.map((_, i) => i));
    setSelecionados(selecionadosAtual);
  }

  async function importar() {
    setEtapa("importando");
    const alvo = [...selecionadosAtual].map((i) => registros[i]);
    const falhas = [];
    let feitos = 0;
    let mesclados = 0;
    let processados = 0;
    for (const r of alvo) {
      setProgresso(processados);
      processados++;
      const existente = existentesPorNome.get(normalizar(r.nome_fantasia));

      if (existente) {
        const patch = construirPatchMescla(existente, r);
        const { error } = Object.keys(patch).length
          ? await supabase.from("pc_parceiras").update(patch).eq("id", existente.id)
          : { error: null };
        if (error) {
          falhas.push({ nome: r.nome_fantasia, erro: error.message });
          continue;
        }
        if (r.observacao) {
          await supabase
            .from("pc_parceira_observacoes")
            .insert({ owner_id: userId, parceira_id: existente.id, texto: r.observacao });
        }
        mesclados++;
        continue;
      }

      const { data, error } = await supabase
        .from("pc_parceiras")
        .insert({
          owner_id: userId,
          nome_fantasia: r.nome_fantasia,
          cidade: r.cidade,
          uf: r.uf,
          praca: r.praca,
          segmento_foco: r.segmento_foco,
          responsavel_nome: r.responsavel_nome,
          responsavel_telefone: r.responsavel_telefone,
          responsavel_email: r.responsavel_email,
          prioridade: r.prioridade,
          prioridade_justificativa: r.prioridade ? "Definida na importação da planilha." : null,
          prioridade_calculada_em: r.prioridade ? new Date().toISOString() : null,
          status_funil: r.status_funil,
          origem: "Importação de planilha",
          token_registro: generateToken(),
        })
        .select("id")
        .single();
      if (error) {
        falhas.push({ nome: r.nome_fantasia, erro: error.message });
        continue;
      }
      if (r.observacao) {
        await supabase
          .from("pc_parceira_observacoes")
          .insert({ owner_id: userId, parceira_id: data.id, texto: r.observacao });
      }
      feitos++;
    }
    setResultado({ total: alvo.length, feitos, mesclados, falhas });
    setEtapa("resultado");
  }

  return (
    <div className="mt-4 rounded-[14px] border border-rule bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[16px] font-semibold text-charcoal">Importar planilha de prospecção</h2>
        {etapa !== "importando" && (
          <button onClick={onCancel} className="text-xs font-bold text-graytext underline">
            cancelar
          </button>
        )}
      </div>

      {etapa === "upload" && (
        <div className="mt-4">
          <p className="text-sm text-graytext">
            Envie um .xlsx, .xls ou .csv com uma linha de título e uma parceira por linha. Você confere e ajusta
            o que cada coluna significa antes de qualquer coisa ser salva.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={lerArquivo}
            className="mt-3 block text-sm"
          />
          {erroArquivo && <p className="mt-2 text-sm text-[#B34A2E]">{erroArquivo}</p>}
        </div>
      )}

      {etapa === "mapear" && (
        <div className="mt-4">
          <p className="text-sm text-graytext">
            <b>{nomeArquivo}</b> · {linhas.length} linha(s) encontrada(s)
            {semNome > 0 && `, ${semNome} sem nome (serão ignoradas)`}.
          </p>

          <div className="mt-3 overflow-x-auto rounded-[10px] border border-rule">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-light text-left text-[11px] font-bold uppercase tracking-[.04em] text-graytext">
                  <th className="p-2">Coluna da planilha</th>
                  <th className="p-2">Vira</th>
                </tr>
              </thead>
              <tbody>
                {colunas.map((c, i) => (
                  <tr key={i} className="border-t border-rule">
                    <td className="p-2 text-charcoal">{c || <span className="text-muted">(sem título)</span>}</td>
                    <td className="p-2">
                      <select
                        value={mapeamento[i] ?? "ignorar"}
                        onChange={(e) => aoMudarMapeamento(i, e.target.value)}
                        className="rounded-[7px] border border-rule bg-white px-2 py-1 text-sm"
                      >
                        {CAMPOS_DESTINO.map((cd) => (
                          <option key={cd.valor} value={cd.valor}>
                            {cd.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-[11px] font-bold uppercase tracking-[.06em] text-graytext">
            Pré-visualização — {registros.length} parceira(s) prontas pra importar
          </p>
          <div className="mt-2 space-y-1.5">
            {registros.map((r, i) => {
              const existente = existentesPorNome.get(normalizar(r.nome_fantasia));
              return (
                <label
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-[10px] border border-rule p-2.5 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selecionadosAtual.has(i)}
                    onChange={() => alternarLinha(i)}
                    className="h-4 w-4"
                  />
                  <span className="font-semibold text-charcoal">{r.nome_fantasia}</span>
                  <span className="text-xs text-graytext">
                    {[r.cidade, r.uf].filter(Boolean).join("/")}
                    {r.responsavel_telefone ? ` · ${r.responsavel_telefone}` : ""}
                  </span>
                  <PrioridadeChip prioridade={r.prioridade} />
                  <StatusParceiraChip status={r.status_funil} />
                  {existente && (
                    <span className="rounded-full bg-purple-100 px-[10px] py-1 text-[10.5px] font-bold text-purple-800">
                      já existe — vai mesclar, sem duplicar
                    </span>
                  )}
                </label>
              );
            })}
          </div>

          <button
            onClick={importar}
            disabled={selecionadosAtual.size === 0}
            className="mt-4 rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            Importar {selecionadosAtual.size} parceira(s)
          </button>
        </div>
      )}

      {etapa === "importando" && (
        <p className="mt-4 text-sm text-graytext">Importando {progresso + 1} de {selecionadosAtual.size}…</p>
      )}

      {etapa === "resultado" && resultado && (
        <div className="mt-4">
          <p className="text-sm text-charcoal">
            <b>{resultado.feitos}</b> parceira(s) nova(s) importada(s)
            {resultado.mesclados > 0 && <>, <b>{resultado.mesclados}</b> mesclada(s) com cadastros existentes</>}
            {resultado.falhas.length > 0 && `, ${resultado.falhas.length} com erro`}.
          </p>
          {resultado.falhas.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-[#B34A2E]">
              {resultado.falhas.map((f, i) => (
                <li key={i}>
                  {f.nome}: {f.erro}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={onImported}
            className="mt-4 rounded-[10px] bg-charcoal px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}

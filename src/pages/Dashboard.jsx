import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { generateToken } from "../lib/token";
import { CriteriaPresets } from "../components/CriteriaPresets";
import { addClientToCrm } from "../lib/crm";
import { useFeedback } from "../lib/feedback";
import { useProfile } from "../lib/useProfile";
import { useAcessoCanal } from "../lib/AcessoCanal";
import PrimeirosPassos from "../components/PrimeirosPassos";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";
import Modal from "../components/ui/Modal";

// Critérios que já vêm preenchidos num atendimento novo; o corretor apaga ou troca se quiser.
const CRITERIOS_PADRAO = "Arquitetura e fachada\nLocalização\nAcabamento";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, reload: recarregarPerfil } = useProfile();
  const { acesso } = useAcessoCanal();
  const [temImoveis, setTemImoveis] = useState(false);
  const [clients, setClients] = useState(null);
  const [orphanSelections, setOrphanSelections] = useState([]);
  const [filtro, setFiltro] = useState("ativos"); // ativos|inativos|todos
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState(null);
  const [detalheAberto, setDetalheAberto] = useState(false); // celular: lista ou detalhe

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [criteria, setCriteria] = useState(CRITERIOS_PADRAO);
  const [unitCriteria, setUnitCriteria] = useState("");

  async function load() {
    const { data, error: loadError } = await supabase
      .from("av_selections")
      .select(
        "id, title, client_name, archived, created_at, client_id, token_form, token_panel, av_clients(id, name, phone, email, av_client_relations(archived, token))",
      )
      .order("created_at", { ascending: false });
    if (loadError) {
      setError("Erro ao carregar clientes: " + loadError.message);
      return;
    }
    const map = new Map();
    const orphans = [];
    for (const s of data ?? []) {
      const c = s.av_clients;
      if (!c) {
        orphans.push(s);
        continue;
      }
      if (!map.has(c.id)) {
        const { av_client_relations, ...rest } = c;
        // A relação (RLS: só a do próprio corretor) guarda o link do cliente
        // com este corretor — cada corretor tem o seu, ver
        // migrations_link_cliente_por_corretor.sql.
        map.set(c.id, {
          ...rest,
          archived: av_client_relations?.[0]?.archived ?? false,
          token: av_client_relations?.[0]?.token ?? null,
          selections: [],
        });
      }
      map.get(c.id).selections.push(s);
    }
    setClients([...map.values()]);
    setOrphanSelections(orphans);
    const { count } = await supabase.from("av_properties").select("id", { count: "exact", head: true });
    setTemImoveis((count ?? 0) > 0);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!title.trim() || !clientName.trim()) {
      setError("Informe o nome do cliente e o título do roteiro.");
      return;
    }
    setSaving(true);
    const { data: clientId, error: clientError } = await supabase.rpc("find_or_create_client", {
      p_name: clientName.trim(),
      p_phone: clientPhone.trim() || null,
      p_email: clientEmail.trim() || null,
    });
    if (clientError) {
      setSaving(false);
      setError("Erro ao vincular cliente: " + clientError.message);
      return;
    }
    const { data: nova, error: insertError } = await supabase.from("av_selections").insert({
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      client_id: clientId,
      criteria: criteria
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      unit_criteria: unitCriteria
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean),
      token_form: generateToken(),
      token_panel: generateToken(),
    }).select("id").single();
    setSaving(false);
    if (insertError) {
      setError("Não foi possível criar o atendimento: " + insertError.message);
      return;
    }
    // Leva direto ao roteiro: é lá que se adicionam os imóveis e se copia o link do cliente.
    navigate(`/app/selections/${nova.id}`, { state: { novo: true } });
  }

  function marcarPasso(chave) {
    supabase.rpc("marcar_primeiro_passo", { p_chave: chave }).then(
      () => recarregarPerfil(),
      () => {},
    );
  }

  const passos = profile?.primeiros_passos ?? {};
  const temAtendimento = (clients?.length ?? 0) + orphanSelections.length > 0;
  const primeiraSelecao = clients?.[0]?.selections?.[0] ?? orphanSelections[0] ?? null;
  const conta30Dias = user?.created_at && Date.now() - new Date(user.created_at).getTime() < 30 * 86400000;
  const mostrarPassos =
    clients !== null &&
    !!profile &&
    !passos.dispensado &&
    !(temAtendimento && temImoveis && passos.link_copiado) &&
    (conta30Dias || !temAtendimento);

  const visiveis = (clients ?? []).filter(
    (c) =>
      (filtro === "todos" || (filtro === "inativos") === !!c.archived) &&
      (c.name || "").toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const selecionado = visiveis.find((c) => c.id === selId) ?? visiveis[0] ?? null;
  const nenhumCliente = clients !== null && clients.length === 0 && orphanSelections.length === 0;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-bg">
      {mostrarPassos && !showForm && (
        <div className="mx-auto max-w-3xl px-4 pt-5 md:px-8">
          <PrimeirosPassos
            nome={(profile?.full_name || user?.user_metadata?.full_name || "").trim().split(/\s+/)[0]}
            selecaoId={primeiraSelecao?.id}
            temAtendimento={temAtendimento}
            temImoveis={temImoveis}
            linkCopiado={!!passos.link_copiado}
            onNovo={() => setShowForm(true)}
            onDispensar={() => marcarPasso("dispensado")}
            mostrarAcademia={acesso === null}
          />
        </div>
      )}

      <div className="md:grid md:grid-cols-[320px_1fr]">
        {/* Lista de clientes */}
        <aside
          className={`border-slate-200/70 bg-white md:sticky md:top-[60px] md:max-h-[calc(100vh-60px)] md:overflow-y-auto md:border-r ${
            detalheAberto ? "hidden md:block" : ""
          }`}
        >
          <div className="space-y-3 px-4 pt-5 pb-3">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-title font-bold tracking-tight text-charcoal">Clientes</h1>
              <Button size="sm" onClick={() => setShowForm(true)}>
                + Novo atendimento
              </Button>
            </div>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente"
              aria-label="Buscar cliente"
              className={classesCampo}
            />
            <div className="inline-flex gap-0.5 rounded-control bg-light p-[3px]">
              {[
                ["ativos", "Ativos"],
                ["inativos", "Inativos"],
                ["todos", "Todos"],
              ].map(([v, rotulo]) => (
                <button
                  key={v}
                  onClick={() => setFiltro(v)}
                  aria-pressed={filtro === v}
                  className={`min-h-9 rounded-[9px] px-3.5 text-caption font-semibold transition-all duration-200 ${
                    filtro === v ? "bg-white text-charcoal shadow-sm" : "text-graytext hover:text-charcoal"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </div>

          <div className="px-2 pb-24 md:pb-6">
            {clients === null && <p className="px-3 py-4 text-body-sm text-muted">Carregando…</p>}
            {nenhumCliente && (
              <div className="px-4 py-10 text-center">
                <b className="block text-body text-charcoal">Nenhum atendimento ainda</b>
                <p className="mt-1 text-body-sm text-graytext">Crie o primeiro e mande o link de avaliação ao cliente.</p>
                <Button className="mt-5" onClick={() => setShowForm(true)}>
                  + Novo atendimento
                </Button>
              </div>
            )}
            {clients !== null && !nenhumCliente && visiveis.length === 0 && (
              <p className="px-3 py-6 text-center text-body-sm text-muted">Nenhum cliente encontrado.</p>
            )}
            {visiveis.map((c) => {
              const ativo = selecionado?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelId(c.id);
                    setDetalheAberto(true);
                  }}
                  aria-current={ativo}
                  className={`flex min-h-[60px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ease-out ${
                    ativo ? "md:bg-brand-soft" : "hover:bg-bg"
                  }`}
                >
                  <Avatar nome={c.name} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate font-semibold text-charcoal">{c.name || "Sem nome"}</b>
                    <small className={ativo ? "text-sky-800" : "text-graytext"}>{c.selections.length} roteiro(s)</small>
                  </span>
                  {c.archived && <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">inativo</span>}
                </button>
              );
            })}

            {orphanSelections.length > 0 && (
              <div className="mt-5 px-3">
                <h2 className="mb-2 text-caption font-semibold tracking-[.08em] text-muted uppercase">Seleções sem cliente</h2>
                {orphanSelections.map((o) => (
                  <Link
                    key={o.id}
                    to={`/app/selections/${o.id}`}
                    className="block min-h-11 rounded-xl py-2 transition-colors duration-200 hover:bg-bg"
                  >
                    <p className="text-body-sm font-semibold text-charcoal">{o.title}</p>
                    <p className="text-caption text-graytext">{o.client_name}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Detalhe do cliente */}
        <section className={`min-w-0 ${detalheAberto ? "" : "hidden md:block"}`}>
          {selecionado ? (
            <>
              <button
                onClick={() => setDetalheAberto(false)}
                className="mx-2 mt-2 inline-flex min-h-11 items-center gap-1 rounded-control px-3 text-body-sm font-semibold text-graytext transition-colors hover:bg-light md:hidden"
              >
                ← Clientes
              </button>
              <ClienteDetalhe key={selecionado.id} client={selecionado} onChange={load} />
            </>
          ) : (
            clients !== null && (
              <p className="px-8 py-24 text-center text-body-sm text-muted">
                {nenhumCliente ? "Seu primeiro cliente aparece aqui." : "Selecione um cliente."}
              </p>
            )
          )}
        </section>
      </div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Novo atendimento"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="novo-atendimento" disabled={saving}>
              {saving ? "Salvando…" : "Criar atendimento"}
            </Button>
          </>
        }
      >
        <form id="novo-atendimento" onSubmit={handleCreate} className="space-y-3.5">
          <p className="text-body-sm text-graytext">Você adiciona os imóveis e copia o link do cliente na próxima tela.</p>
          <Input label="Nome do cliente" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="ex.: Casal Almeida" />
          <Input
            label="Título do primeiro roteiro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="ex.: Visitas de sábado"
            hint="É o nome que o cliente vê no link. Dá para mudar depois."
          />
          <details className="rounded-control border border-dashed border-slate-200 px-3.5">
            <summary className="flex min-h-11 cursor-pointer items-center text-body-sm font-semibold text-charcoal">
              Mais opções <span className="ml-1.5 font-normal text-graytext">(telefone, e-mail, critérios)</span>
            </summary>
            <div className="space-y-3.5 pt-1 pb-3.5">
              <Input label="Subtítulo (opcional)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              <Input label="Telefone do cliente (opcional)" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              <Input label="E-mail do cliente (opcional)" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              <div>
                <label className="mb-1.5 block text-caption font-medium text-graytext">Critérios (um por linha)</label>
                <textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  rows={4}
                  placeholder={"Arquitetura e fachada\nLocalização\nAcabamento"}
                  className={`${classesCampo} py-2.5`}
                />
                <p className="mt-1.5 text-caption text-graytext">Já vêm com um modelo. Apague ou troque se quiser.</p>
                <CriteriaPresets criteriaText={criteria} onApply={setCriteria} />
              </div>
              <div>
                <label className="mb-1.5 block text-caption font-medium text-graytext">Critérios das unidades (um por linha, opcional)</label>
                <textarea
                  value={unitCriteria}
                  onChange={(e) => setUnitCriteria(e.target.value)}
                  rows={4}
                  placeholder={"Planta e distribuição\nVista\nRuído"}
                  className={`${classesCampo} py-2.5`}
                />
              </div>
            </div>
          </details>
          {error && <p className="text-body-sm text-danger-text">{error}</p>}
        </form>
      </Modal>
    </div>
  );
}

function Avatar({ nome, grande }) {
  const iniciais = (nome || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={`grid flex-none place-items-center rounded-full bg-brand-soft font-semibold text-sky-800 ${
        grande ? "h-14 w-14 text-title" : "h-10 w-10 text-caption"
      }`}
    >
      {iniciais}
    </span>
  );
}

const textoAcao = "min-h-9 rounded-[9px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-light hover:text-charcoal";
const textoAcaoPerigo = "min-h-9 rounded-[9px] px-2.5 text-caption font-medium text-graytext transition-all duration-200 hover:bg-danger-bg hover:text-danger-text";

function ClienteDetalhe({ client, onChange }) {
  const { user } = useAuth();
  const { confirm, toast } = useFeedback();
  const [filtroRoteiros, setFiltroRoteiros] = useState("ativos"); // ativos|desativados|todos
  const [crmMsg, setCrmMsg] = useState("");
  const homeUrl = client.token ? `${window.location.origin}/cliente/${client.token}` : null;
  const roteirosDesativados = client.selections.filter((s) => s.archived);
  const roteirosVisiveis = client.selections.filter((s) => {
    if (filtroRoteiros === "todos") return true;
    if (filtroRoteiros === "desativados") return s.archived;
    return !s.archived;
  });

  async function alternarClienteArquivado() {
    const acao = client.archived ? "reativar" : "desativar";
    if (!(await confirm(`Confirma ${acao} "${client.name || "este cliente"}"?`, { tone: client.archived ? "info" : "danger" }))) return;
    await supabase
      .from("av_client_relations")
      .upsert({ user_id: user.id, client_id: client.id, archived: !client.archived }, { onConflict: "user_id,client_id" });
    onChange();
    toast(`Cliente ${client.archived ? "reativado" : "desativado"}.`);
  }

  async function adicionarAoCRM() {
    setCrmMsg("Adicionando…");
    const { error, existed } = await addClientToCrm(client.id);
    setCrmMsg(error ? "Erro: " + error.message : existed ? "Já estava no CRM." : "Adicionado ao CRM.");
  }

  return (
    <div className="max-w-[720px] px-4 py-6 md:px-9 md:py-8">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar nome={client.name} grande />
        <div className="min-w-0 flex-1">
          <h2 className="text-headline font-bold tracking-[-0.03em] text-charcoal">{client.name || "Sem nome"}</h2>
          <p className="text-body-sm text-graytext">
            {[client.phone, client.email].filter(Boolean).join(" · ") || "Sem contato"}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <Button variant="secondary" size="sm" onClick={adicionarAoCRM}>
            Adicionar ao CRM
          </Button>
          <Button variant="secondary" size="sm" onClick={alternarClienteArquivado}>
            {client.archived ? "Reativar" : "Desativar"}
          </Button>
        </div>
      </div>
      {(crmMsg || client.archived) && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-caption text-graytext">
          {client.archived && <span className="rounded-full bg-light px-2.5 py-0.5 font-semibold">cliente desativado</span>}
          {crmMsg}
        </p>
      )}

      <div className="mt-8 flex items-center justify-between gap-2">
        <h3 className="text-caption font-semibold tracking-[.08em] text-muted uppercase">Roteiros</h3>
        {(client.selections.length > 1 || roteirosDesativados.length > 0) && (
          <select
            value={filtroRoteiros}
            onChange={(e) => setFiltroRoteiros(e.target.value)}
            aria-label="Filtrar roteiros"
            className="min-h-9 rounded-[10px] border border-slate-200 bg-white px-2.5 text-caption text-slate-700"
          >
            <option value="ativos">Ativos</option>
            <option value="desativados">Desativados ({roteirosDesativados.length})</option>
            <option value="todos">Todos</option>
          </select>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {roteirosVisiveis.length === 0 && <p className="text-body-sm text-muted">Nenhum roteiro neste filtro.</p>}
        {roteirosVisiveis.map((s) => (
          <div key={s.id} className="rounded-card border border-slate-200/70 bg-white p-5 shadow-soft">
            <RoteiroRow selection={s} homeUrl={homeUrl} onChange={onChange} />
          </div>
        ))}
      </div>
    </div>
  );
}

function RoteiroRow({ selection, homeUrl, onChange }) {
  const { confirm, toast } = useFeedback();
  const [copiado, setCopiado] = useState(null); // "perfil" | "form" | "painel" | null
  const formUrl = `${window.location.origin}/c/${selection.token_form}`;
  const panelUrl = `${window.location.origin}/r/${selection.token_panel}`;

  function copiar(url, tipo) {
    navigator.clipboard.writeText(url);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 1500);
  }

  async function renomear() {
    const novo = window.prompt("Novo título do roteiro", selection.title);
    if (novo == null || !novo.trim()) return;
    await supabase.from("av_selections").update({ title: novo.trim() }).eq("id", selection.id);
    onChange();
  }

  async function gerarNovosLinks() {
    if (
      !(await confirm("Gerar links novos invalida os links já enviados para este roteiro. Continuar?", {
        confirmLabel: "Gerar novos links",
      }))
    )
      return;
    await supabase
      .from("av_selections")
      .update({ token_form: generateToken(), token_panel: generateToken() })
      .eq("id", selection.id);
    onChange();
    toast("Novos links gerados.");
  }

  async function alternarArquivado() {
    const acao = selection.archived ? "reativar" : "desativar";
    if (!(await confirm(`Confirma ${acao} este roteiro?`, { tone: selection.archived ? "info" : "danger" }))) return;
    await supabase.from("av_selections").update({ archived: !selection.archived }).eq("id", selection.id);
    onChange();
    toast(`Roteiro ${selection.archived ? "reativado" : "desativado"}.`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/app/selections/${selection.id}`} className="text-body font-semibold tracking-tight text-charcoal hover:underline">
          {selection.title}
        </Link>
        {selection.archived && (
          <span className="rounded-full bg-light px-2.5 py-0.5 text-caption font-semibold text-graytext">desativado</span>
        )}
      </div>

      <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/70">
        {homeUrl && (
          <LinkLine label="Permanente" url={homeUrl} copied={copiado === "perfil"} onCopy={() => copiar(homeUrl, "perfil")} />
        )}
        <LinkLine label="Avaliação" url={formUrl} copied={copiado === "form"} onCopy={() => copiar(formUrl, "form")} />
        <LinkLine label="Painel" url={panelUrl} copied={copiado === "painel"} onCopy={() => copiar(panelUrl, "painel")} openable />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-1">
        <Link to={`/app/selections/${selection.id}`} className={`${textoAcao} inline-flex items-center`}>
          Editar roteiro
        </Link>
        <button onClick={renomear} className={textoAcao}>
          Renomear
        </button>
        <button onClick={gerarNovosLinks} className={textoAcaoPerigo}>
          Gerar novos links
        </button>
        <button onClick={alternarArquivado} className={textoAcaoPerigo}>
          {selection.archived ? "Reativar" : "Desativar"}
        </button>
      </div>
    </div>
  );
}

function LinkLine({ label, url, copied, onCopy, openable }) {
  return (
    <div className="flex items-center gap-2.5 py-2 pr-2 pl-3 text-body-sm">
      <span className="hidden w-[76px] shrink-0 text-caption font-semibold tracking-[.06em] text-muted uppercase sm:block">{label}</span>
      <span className="min-w-0 flex-1 truncate text-graytext">
        <span className="font-semibold text-slate-700 sm:hidden">{label} · </span>
        {url}
      </span>
      <Button size="sm" variant="secondary" onClick={onCopy} className="shrink-0">
        {copied ? "Copiado!" : "Copiar"}
      </Button>
      {openable && (
        <Button size="sm" variant="secondary" href={url} target="_blank" rel="noreferrer" className="shrink-0">
          Abrir
        </Button>
      )}
    </div>
  );
}

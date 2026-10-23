import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useFeedback } from "../../lib/feedback";

const TIPO_LABELS = { corretor: "Corretor", imobiliaria: "Imobiliária", incorporadora: "Incorporadora" };

// Chave de padrão de cada módulo em platform_settings.
const PADRAO = {
  avaliador: "avaliador_ligado_para_todos",
  crm: "crm_liberado_para_todos",
  academia: "academia_aberta",
};

const MODULOS = [
  { id: "avaliador", nome: "Avaliador", dica: "Roteiros, avaliação do cliente, ranking e propostas." },
  { id: "crm", nome: "CRM", dica: "Leads e oportunidades. Liberado para todos até a cobrança começar." },
  { id: "academia", nome: "Academia de Vendas", dica: "Materiais, treinamento e argumentos." },
];

// Administração > Módulos: o padrão da plataforma em cima, e uma exceção por pessoa embaixo.
// Avaliador e CRM têm três posições (Padrão, Sim, Não). A Academia segue o pedido de acesso:
// "Liberar" aprova e "Bloquear" barra, e só vale para quem já pediu.
export default function ModulosUsuarios() {
  const { toast } = useFeedback();
  const [padrao, setPadrao] = useState(null);
  const [usuarios, setUsuarios] = useState(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState("");

  async function carregar() {
    const [pad, lista] = await Promise.all([supabase.rpc("admin_modulos_padrao"), supabase.rpc("admin_modulos_lista")]);
    if (pad.error || lista.error) return setErro((pad.error || lista.error).message);
    setPadrao(pad.data ?? {});
    setUsuarios(lista.data ?? []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarPadrao(modulo, ativo) {
    setOcupado("padrao-" + modulo);
    const { error } = await supabase.rpc("admin_definir_padrao", { p_chave: PADRAO[modulo], p_ativo: ativo });
    setOcupado("");
    if (error) return toast("Erro: " + error.message, "danger");
    toast(`Padrão do ${MODULOS.find((m) => m.id === modulo).nome} salvo.`);
    carregar();
  }

  async function mudarUsuario(u, modulo, valor) {
    setOcupado(u.user_id + modulo);
    const { error } = await supabase.rpc("admin_definir_modulo", { p_user: u.user_id, p_modulo: modulo, p_valor: valor });
    setOcupado("");
    if (error) return toast("Erro: " + error.message, "danger");
    toast(`${MODULOS.find((m) => m.id === modulo).nome} de ${u.nome || u.email} salvo.`);
    carregar();
  }

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (usuarios ?? []).filter((u) => !q || `${u.nome ?? ""} ${u.email}`.toLowerCase().includes(q));
  }, [usuarios, busca]);

  if (erro) return <p className="text-sm text-danger-text">{erro}</p>;
  if (!padrao || !usuarios) return <p className="text-sm text-muted">Carregando…</p>;

  const ligado = (m) => !!padrao[PADRAO[m]];

  return (
    <div className="space-y-7">
      <p className="max-w-[66ch] text-sm text-graytext">
        Ligue ou desligue cada módulo para toda a plataforma e abra exceções para uma pessoa. Desligar esconde o módulo
        no menu e bloqueia as telas dele. Os dados continuam guardados, e os links que o corretor já mandou aos clientes
        seguem abrindo.
      </p>

      <section>
        <h2 className="text-[16px] font-semibold text-charcoal">Padrão da plataforma</h2>
        <p className="mt-1 text-xs text-graytext">Vale para todo mundo que estiver em “Padrão”, inclusive contas novas.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MODULOS.map((m) => (
            <div key={m.id} className="rounded-card border border-slate-200/70 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-charcoal">{m.nome}</h3>
                <Chave
                  ligada={ligado(m.id)}
                  desabilitada={ocupado === "padrao-" + m.id}
                  rotulo={`${m.nome} no padrão da plataforma`}
                  onChange={() => mudarPadrao(m.id, !ligado(m.id))}
                />
              </div>
              <p className="mt-2 text-xs leading-snug text-graytext">
                {m.id === "academia"
                  ? ligado("academia")
                    ? "Aberta a todos: o pedido já nasce liberado."
                    : "Por aprovação: o pedido chega e você libera."
                  : m.dica}
              </p>
            </div>
          ))}
          <div className="rounded-card border border-slate-200/70 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-charcoal">Parcerias</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">Só o dono</span>
            </div>
            <p className="mt-2 text-xs leading-snug text-graytext">
              Painel de gestão do canal. Não tem chave por usuário.
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[16px] font-semibold text-charcoal">Usuários</h2>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar usuário"
            className="w-full max-w-xs rounded-control border border-slate-200/70 bg-white px-3 py-2 text-sm text-charcoal focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none"
          />
        </div>
        <div className="mt-3 space-y-3">
          {filtrados.length === 0 && <p className="text-sm text-muted">Ninguém encontrado.</p>}
          {filtrados.map((u) => (
            <article key={u.user_id} className="rounded-card border border-slate-200/70 bg-white p-4">
              <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <b className="text-[15px] text-charcoal">{u.nome || u.email}</b>
                  {u.nome && <span className="ml-2 break-all text-[13px] text-graytext">{u.email}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Etiqueta>{TIPO_LABELS[u.tipo] ?? u.tipo}</Etiqueta>
                  {u.e_admin && <Etiqueta tom="ok">Administrador</Etiqueta>}
                  {u.imobiliaria && <Etiqueta>{u.imobiliaria}</Etiqueta>}
                </div>
              </header>

              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ModuloTresPosicoes
                  nome="Avaliador"
                  usuario={u}
                  modulo="avaliador"
                  override={u.avaliador}
                  padraoLigado={ligado("avaliador")}
                  ocupado={ocupado === u.user_id + "avaliador"}
                  onChange={(v) => mudarUsuario(u, "avaliador", v)}
                />
                <ModuloTresPosicoes
                  nome="CRM"
                  usuario={u}
                  modulo="crm"
                  override={u.crm}
                  padraoLigado={ligado("crm") || u.crm_plano}
                  textoPadrao={u.crm_plano && !ligado("crm") ? "Segue o plano de CRM da conta" : null}
                  ocupado={ocupado === u.user_id + "crm"}
                  onChange={(v) => mudarUsuario(u, "crm", v)}
                />
                <ModuloAcademia usuario={u} ocupado={ocupado === u.user_id + "academia"} onChange={(v) => mudarUsuario(u, "academia", v)} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ModuloTresPosicoes({ nome, override, padraoLigado, textoPadrao, ocupado, onChange, usuario }) {
  const ligado = override ?? padraoLigado;
  const motivo =
    override === null
      ? textoPadrao || `Segue o padrão: ${padraoLigado ? "ligado" : "desligado"}`
      : override
        ? "Exceção: ligado para esta pessoa"
        : "Exceção: desligado para esta pessoa";
  return (
    <div className="rounded-card border border-slate-200/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[13.5px] text-charcoal">{nome}</b>
        <Etiqueta tom={ligado ? "ok" : "off"}>{ligado ? "Ligado" : "Desligado"}</Etiqueta>
      </div>
      <div role="group" aria-label={`${nome} para ${usuario.nome || usuario.email}`} className="mt-2 grid grid-cols-3 gap-0.5 rounded-control bg-slate-100 p-[3px]">
        {[
          ["Padrão", null],
          ["Sim", true],
          ["Não", false],
        ].map(([rotulo, valor]) => (
          <button
            key={rotulo}
            type="button"
            disabled={ocupado}
            aria-pressed={override === valor}
            onClick={() => override !== valor && onChange(valor)}
            className={`rounded-[7px] px-1 py-1.5 text-[12.5px] font-semibold disabled:opacity-50 ${
              override === valor
                ? `bg-white shadow-sm ${valor === true ? "text-emerald-700" : valor === false ? "text-danger-text" : "text-charcoal"}`
                : "text-graytext"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-graytext">{motivo}</p>
    </div>
  );
}

function ModuloAcademia({ usuario, ocupado, onChange }) {
  const status = usuario.academia;
  // O dono do canal gerencia a Academia, não pede acesso a ela.
  if (usuario.e_admin && !status) {
    return (
      <div className="rounded-card border border-slate-200/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <b className="text-[13.5px] text-charcoal">Academia de Vendas</b>
          <Etiqueta tom="ok">Gestão</Etiqueta>
        </div>
        <Link to="/admin/academia" className="mt-3 block text-xs font-semibold text-sky-700 underline">
          Abrir Gestão da Academia
        </Link>
      </div>
    );
  }
  const rotulo = { liberado: "Liberado", pendente: "Pedido pendente", bloqueado: "Bloqueado", recusado: "Recusado" }[status] ?? "Sem pedido";
  return (
    <div className="rounded-card border border-slate-200/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[13.5px] text-charcoal">Academia de Vendas</b>
        <Etiqueta tom={status === "liberado" ? "ok" : status === "bloqueado" || status === "recusado" ? "off" : undefined}>{rotulo}</Etiqueta>
      </div>
      {status ? (
        <div role="group" aria-label={`Academia para ${usuario.nome || usuario.email}`} className="mt-2 grid grid-cols-2 gap-0.5 rounded-control bg-slate-100 p-[3px]">
          {[
            ["Liberar", true, "liberado"],
            ["Bloquear", false, "bloqueado"],
          ].map(([r, valor, alvo]) => (
            <button
              key={r}
              type="button"
              disabled={ocupado}
              aria-pressed={status === alvo}
              onClick={() => status !== alvo && onChange(valor)}
              className={`rounded-[7px] px-1 py-1.5 text-[12.5px] font-semibold disabled:opacity-50 ${
                status === alvo ? `bg-white shadow-sm ${valor ? "text-emerald-700" : "text-danger-text"}` : "text-graytext"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-graytext">Ainda não pediu acesso. A chave aparece quando pedir.</p>
      )}
      {status === "pendente" && (
        <Link to="/admin/academia/acessos" className="mt-1.5 block text-xs font-semibold text-sky-700 underline">
          Ver o pedido em Gestão da Academia
        </Link>
      )}
    </div>
  );
}

function Chave({ ligada, onChange, desabilitada, rotulo }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={rotulo}
      disabled={desabilitada}
      onClick={onChange}
      className={`relative h-6 w-[42px] shrink-0 rounded-full transition-colors disabled:opacity-50 ${ligada ? "bg-sky-600" : "bg-slate-300"}`}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition-transform ${ligada ? "translate-x-[18px]" : ""}`}
      />
    </button>
  );
}

function Etiqueta({ tom, children }) {
  const cls =
    tom === "ok"
      ? "bg-emerald-100 text-emerald-800"
      : tom === "off"
        ? "bg-rose-100 text-danger-text"
        : "bg-slate-100 text-slate-600";
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{children}</span>;
}

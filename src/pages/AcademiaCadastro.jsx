import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { useAcessoCanal } from "../lib/AcessoCanal";
import { useProfile } from "../lib/useProfile";
import { traduzErro } from "./Login";

const AUTONOMO = "__autonomo";
const OUTRA = "__outra";

const inputCls =
  "mt-1 w-full rounded-[9px] border-[1.5px] border-rule bg-white px-[10px] py-[10px] text-sm text-charcoal focus:border-gold focus:outline-none";

// Cadastro público do corretor parceiro (materimob.com.br/academia). Uma tela
// só: conta + pedido de acesso. Quem já tem conta no MaterImob e está logado
// não preenche e-mail nem senha de novo.
export default function AcademiaCadastro() {
  const { user, loading: loadingAuth } = useAuth();
  const { acesso, reload } = useAcessoCanal();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const [imobs, setImobs] = useState(null);
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [creci, setCreci] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState("corretor");
  const [imob, setImob] = useState("");
  const [outra, setOutra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  useEffect(() => {
    supabase.rpc("pc_parceiras_para_vinculo").then(({ data }) => setImobs(data ?? []));
  }, []);

  // Quem já tem conta chega com o que o perfil já sabe: só confere e envia.
  useEffect(() => {
    if (!user) return;
    setNome((v) => v || profile?.full_name || user.user_metadata?.full_name || "");
    setWhatsapp((v) => v || profile?.phone || "");
    setCreci((v) => v || profile?.creci || "");
  }, [user, profile]);

  if (loadingAuth || (user && acesso === undefined)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-muted">Carregando…</p>
      </div>
    );
  }
  if (user && acesso) return <Navigate to="/app/academia" replace />;

  function validar() {
    if (!nome.trim()) return "Informe o seu nome.";
    if (whatsapp.replace(/\D/g, "").length < 10) return "Informe o seu WhatsApp com DDD.";
    if (!user) {
      if (!email.trim()) return "Informe o seu e-mail.";
      if (senha.length < 6) return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (!imob) return "Escolha a sua imobiliária.";
    if (papel === "gestor" && imob === AUTONOMO) return "Para ser gestor, escolha a imobiliária.";
    if (imob === OUTRA && !outra.trim()) return "Digite o nome da sua imobiliária.";
    return "";
  }

  async function enviar(e) {
    e.preventDefault();
    const msg = validar();
    if (msg) return setError(msg);
    setError("");

    const pedido = {
      p_nome: nome.trim(),
      p_whatsapp: whatsapp.trim(),
      p_creci: creci.trim() || null,
      p_papel: papel,
      p_parceira_id: imob !== AUTONOMO && imob !== OUTRA ? imob : null,
      p_imobiliaria_informada: imob === OUTRA ? outra.trim() : null,
    };

    setBusy(true);
    if (user) {
      const { error: rpcError } = await supabase.rpc("pc_solicitar_acesso", pedido);
      setBusy(false);
      if (rpcError) return setError(rpcError.message || "Não consegui enviar agora. Tente de novo.");
      await reload();
      navigate("/app/academia", { replace: true });
      return;
    }

    // O pedido viaja junto com a conta. Com sessão imediata, o AcessoCanalProvider
    // envia na hora; se o e-mail precisar de confirmação, envia na primeira entrada.
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { full_name: nome.trim(), account_type: "corretor", academia: pedido } },
    });
    setBusy(false);
    if (authError) return setError(traduzErro(authError.message));
    if (data.session) navigate("/app/academia", { replace: true });
    else setConfirmarEmail(true);
  }

  if (confirmarEmail) {
    return (
      <Pagina>
        <h1 className="text-center text-xl font-bold text-charcoal">Quase lá</h1>
        <p className="mt-2 text-center text-sm text-graytext">
          Enviamos um link de confirmação para <strong>{email}</strong>. Confirme por lá e entre. Seu pedido de
          acesso à Academia é enviado automaticamente na primeira entrada.
        </p>
        <Link to="/entrar" className="mt-5 block text-center text-sm text-graytext underline">
          Ir para a entrada
        </Link>
      </Pagina>
    );
  }

  return (
    <Pagina>
      <div className="text-[10.5px] font-bold uppercase tracking-[.18em] text-gold">Materimob</div>
      <h1 className="mt-2 text-xl font-bold leading-tight text-charcoal">Crie seu acesso à Academia de Vendas</h1>
      <p className="mt-1 text-sm text-graytext">
        Materiais prontos, treinamento e argumentos de venda, para o corretor apresentar cada projeto com segurança.
      </p>

      <form onSubmit={enviar} noValidate className="mt-5 space-y-3">
        <Campo label="Nome completo" id="ac-nome">
          <input id="ac-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" className={inputCls} />
        </Campo>
        <Campo label="WhatsApp" id="ac-zap">
          <input
            id="ac-zap"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="(16) 99999-9999"
            className={inputCls}
          />
        </Campo>
        <Campo label="CRECI (opcional)" id="ac-creci">
          <input id="ac-creci" value={creci} onChange={(e) => setCreci(e.target.value)} className={inputCls} />
        </Campo>
        {!user && (
          <>
            <Campo label="E-mail" id="ac-email">
              <input
                id="ac-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={inputCls}
              />
            </Campo>
            <Campo label="Senha" id="ac-senha">
              <input
                id="ac-senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="new-password"
                className={inputCls}
              />
            </Campo>
          </>
        )}

        <div>
          <span className="block text-xs font-medium text-graytext" id="ac-papel-l">
            Você é
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-labelledby="ac-papel-l">
            {[
              ["corretor", "Corretor"],
              ["gestor", "Gestor da imobiliária"],
            ].map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={papel === valor}
                onClick={() => {
                  setPapel(valor);
                  setError("");
                }}
                className={`rounded-[9px] border-[1.5px] px-2 py-[10px] text-[13px] font-semibold ${
                  papel === valor ? "border-charcoal bg-charcoal text-white" : "border-rule bg-white text-slate-700"
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        <Campo label="Sua imobiliária" id="ac-imob">
          <select
            id="ac-imob"
            value={imob}
            onChange={(e) => {
              setImob(e.target.value);
              setError("");
            }}
            className={inputCls}
          >
            <option value="">Escolha…</option>
            {(imobs ?? []).map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome_fantasia}
              </option>
            ))}
            <option value={AUTONOMO}>Sou autônomo, sem imobiliária</option>
            <option value={OUTRA}>Minha imobiliária não está na lista</option>
          </select>
        </Campo>
        {imob === OUTRA && (
          <Campo label="Nome da sua imobiliária" id="ac-outra">
            <input
              id="ac-outra"
              value={outra}
              onChange={(e) => setOutra(e.target.value)}
              placeholder="Ex.: Imobiliária Horizonte"
              className={inputCls}
            />
          </Campo>
        )}

        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-[10px] bg-charcoal px-4 py-[11px] text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Pedir acesso"}
        </button>
      </form>

      <p className="mt-4 text-center text-[12.5px] text-graytext">
        Ao pedir acesso, você concorda com o uso dos seus dados para liberar e acompanhar o seu acesso, conforme a{" "}
        <a href="/privacidade.html" target="_blank" rel="noreferrer" className="underline">
          política de privacidade
        </a>
        .
      </p>
      <p className="mt-2 text-center text-[12.5px] text-graytext">
        Depois do pedido, a coordenação de parcerias confere o seu cadastro e libera o acesso.
      </p>
      {!user && (
        <Link to="/entrar" className="mt-3 block text-center text-sm text-graytext underline">
          Já tem conta? Entrar
        </Link>
      )}
    </Pagina>
  );
}

function Pagina({ children }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-[20px] border border-rule bg-white p-6 sm:p-8">{children}</div>
    </div>
  );
}

function Campo({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-graytext">
        {label}
      </label>
      {children}
    </div>
  );
}

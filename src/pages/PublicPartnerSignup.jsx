import { useState } from "react";
import { callFunction } from "../lib/edgeFunctions";

export default function PublicPartnerSignup() {
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [creci, setCreci] = useState("");
  const [segmento, setSegmento] = useState("");
  const [contato, setContato] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!nome.trim() || !cidade.trim() || !segmento.trim() || !contato.trim()) {
      return setError("Preencha os campos obrigatórios.");
    }
    setBusy(true);
    try {
      await callFunction("pc-parceira-cadastro", {
        method: "POST",
        body: {
          nome_fantasia: nome.trim(),
          cidade: cidade.trim(),
          creci_juridico: creci.trim() || null,
          segmento_foco: segmento.trim(),
          responsavel_nome: contato.trim(),
          responsavel_telefone: telefone.trim() || null,
          responsavel_email: email.trim() || null,
        },
      });
      setEnviado(true);
    } catch (err) {
      setError(err.message || "Não consegui enviar agora. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-charcoal px-4 pt-[22px] pb-5 text-white">
        <div className="mx-auto max-w-[640px]">
          <div className="text-[11px] font-bold uppercase tracking-[.18em] text-gold">MaterImob</div>
          <h1 className="font-serif mt-2 mb-1 text-[23px] font-semibold leading-tight">
            Rede de parceiras Chaincorp
          </h1>
          <p className="m-0 text-[13px] text-[#C9C9C9]">
            Cadastre sua imobiliária para vender o portfólio ativo da Chaincorp Incorporações.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[640px] px-4 py-6 pb-10">
        {enviado ? (
          <div className="rounded-[14px] border border-rule bg-white p-5 text-center">
            <div className="mx-auto my-4 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-light text-[24px] text-gold">
              ✓
            </div>
            <h3 className="font-serif text-[18px] font-semibold text-charcoal">Cadastro recebido.</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-graytext">
              O coordenador de parcerias vai revisar e entrar em contato em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="rounded-[14px] border border-rule bg-white p-5">
            <Field label="Nome da imobiliária (ou seu nome, se corretor autônomo)" value={nome} onChange={setNome} required />
            <Field label="Cidade / região de atuação" value={cidade} onChange={setCidade} required />
            <Field label="CRECI (opcional)" value={creci} onChange={setCreci} />
            <div>
              <label className="mt-[14px] mb-[6px] block text-[13px] font-semibold text-charcoal">
                Segmento / foco de produto
              </label>
              <textarea
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                rows={3}
                placeholder="Ex.: alto padrão, lançamentos, popular/MCMV, locação, rural…"
                required
                className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
              />
            </div>
            <Field label="Nome do contato principal (sócio, administrador ou gerente comercial)" value={contato} onChange={setContato} required />
            <Field label="Telefone / WhatsApp do contato" value={telefone} onChange={setTelefone} placeholder="+55 16 99999-9999" />
            <Field label="E-mail do contato" value={email} onChange={setEmail} />

            {error && <p className="mt-3 text-sm text-[#B34A2E]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-[11px] bg-charcoal px-[18px] py-[13px] text-[15px] font-bold text-white disabled:opacity-45"
            >
              {busy ? "Enviando…" : "Enviar cadastro"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }) {
  return (
    <div>
      <label className="mt-[14px] mb-[6px] block text-[13px] font-semibold text-charcoal">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-[11px] border-[1.5px] border-rule bg-white p-3 text-base text-charcoal"
      />
    </div>
  );
}

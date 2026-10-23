import { useState } from "react";
import { callFunction } from "../lib/edgeFunctions";
import Button from "../components/ui/Button";
import Input, { classesCampo } from "../components/ui/Input";

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
      <header className="mx-auto max-w-[640px] px-5 pt-[calc(1.5rem+env(safe-area-inset-top))]">
        <div className="text-caption font-semibold tracking-[.06em] text-brand uppercase">MaterImob</div>
        <h1 className="mt-1 text-headline leading-[1.1] font-bold tracking-[-0.035em] text-balance text-charcoal">
          Rede de parceiras Chaincorp
        </h1>
        <p className="mt-2 text-base text-graytext">
          Cadastre sua imobiliária para vender o portfólio ativo da Chaincorp Incorporações.
        </p>
      </header>

      <div className="mx-auto max-w-[640px] px-5 py-6 pb-10">
        {enviado ? (
          <div className="rounded-card border border-slate-200/70 bg-white p-6 text-center shadow-soft">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-success-bg text-success-text">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
            <h3 className="text-title font-bold tracking-tight text-charcoal">Cadastro recebido.</h3>
            <p className="mx-auto mt-2 max-w-xs text-body-sm text-graytext">
              O coordenador de parcerias vai revisar e entrar em contato em breve.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4 rounded-card border border-slate-200/70 bg-white p-5 shadow-soft sm:p-6">
            <Input label="Nome da imobiliária (ou seu nome, se corretor autônomo)" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <Input label="Cidade / região de atuação" value={cidade} onChange={(e) => setCidade(e.target.value)} required />
            <Input label="CRECI (opcional)" value={creci} onChange={(e) => setCreci(e.target.value)} />
            <div>
              <label htmlFor="pp-segmento" className="mb-1.5 block text-caption font-medium text-graytext">
                Segmento / foco de produto
              </label>
              <textarea
                id="pp-segmento"
                value={segmento}
                onChange={(e) => setSegmento(e.target.value)}
                rows={3}
                placeholder="Ex.: alto padrão, lançamentos, popular/MCMV, locação, rural…"
                required
                className={`${classesCampo} py-3`}
              />
            </div>
            <Input
              label="Nome do contato principal (sócio, administrador ou gerente comercial)"
              value={contato}
              onChange={(e) => setContato(e.target.value)}
              required
            />
            <Input label="Telefone / WhatsApp do contato" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="+55 16 99999-9999" />
            <Input label="E-mail do contato" value={email} onChange={(e) => setEmail(e.target.value)} />

            {error && <p className="text-body-sm text-danger-text">{error}</p>}
            <Button type="submit" size="lg" block disabled={busy}>
              {busy ? "Enviando…" : "Enviar cadastro"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

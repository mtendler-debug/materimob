import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import { geocodeAddress } from "../lib/geocode";
import { useFeedback } from "../lib/feedback";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const TIPOS_CONTA = [
  { value: "corretor", label: "Corretor", desc: "Vou montar roteiros de visita e atender clientes.", icone: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7" },
  { value: "imobiliaria", label: "Imobiliária", desc: "Gerencio uma equipe e um portfólio de imóveis.", icone: "M5 21V4h9v17M14 9h5v12M3 21h18M8.5 8h2M8.5 12h2M8.5 16h2" },
  { value: "incorporadora", label: "Incorporadora", desc: "Publico lançamentos para o ecossistema.", icone: "M5 21V4M5 4h11l-2 4 2 4H5" },
];

const CORES_MARCA = ["#1e293b", "#0284c7", "#10b981", "#d97706", "#e11d48", "#7c3aed"];

function Icone({ d, className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Profile() {
  const { profile, loading, reload } = useProfile();
  const { toast } = useFeedback();
  const [fullName, setFullName] = useState("");
  const [creci, setCreci] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [brandColor, setBrandColor] = useState("#1C1C1C");
  const [accountType, setAccountType] = useState("corretor");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCreci(profile.creci ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setBrandColor(profile.brand_color ?? "#1C1C1C");
    setAccountType(profile.account_type ?? "corretor");
  }, [profile]);

  function descartar() {
    setFullName(profile.full_name ?? "");
    setCreci(profile.creci ?? "");
    setPhone(profile.phone ?? "");
    setAddress(profile.address ?? "");
    setBrandColor(profile.brand_color ?? "#1C1C1C");
    setAccountType(profile.account_type ?? "corretor");
    setMsg("");
  }

  async function salvar(e) {
    e?.preventDefault();
    setSaving(true);
    setMsg("");
    const trimmedAddress = address.trim();
    let coords = { latitude: profile.latitude ?? null, longitude: profile.longitude ?? null };
    if (trimmedAddress !== (profile.address ?? "")) {
      const geo = trimmedAddress ? await geocodeAddress(trimmedAddress) : null;
      coords = { latitude: geo?.lat ?? null, longitude: geo?.lng ?? null };
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        creci: creci.trim() || null,
        phone: phone.trim() || null,
        address: trimmedAddress || null,
        ...coords,
        brand_color: brandColor,
        account_type: accountType,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      setMsg("Erro: " + error.message);
      return;
    }
    toast("Perfil salvo.");
    reload();
  }

  if (loading || !profile) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  const alterado =
    (fullName.trim() || null) !== (profile.full_name ?? null) ||
    (creci.trim() || null) !== (profile.creci ?? null) ||
    (phone.trim() || null) !== (profile.phone ?? null) ||
    (address.trim() || null) !== (profile.address ?? null) ||
    brandColor !== (profile.brand_color ?? "#1C1C1C") ||
    accountType !== (profile.account_type ?? "corretor");
  const tipoAtual = TIPOS_CONTA.find((t) => t.value === accountType);
  const iniciais =
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-bg">
      <form onSubmit={salvar} className="mx-auto max-w-[980px] px-4 pt-8 md:px-8">
        <h1 className="text-[clamp(1.5rem,3vw,1.75rem)] leading-tight font-bold tracking-[-0.03em] text-charcoal">Meu perfil</h1>
        <p className="mt-1.5 max-w-[58ch] text-base text-graytext">
          Nome, CRECI e telefone aparecem para os colegas da sua organização e, quando fizer sentido, para os clientes que
          você atende. Veja ao lado como o seu cartão fica.
        </p>

        <div className="mt-7 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="order-2 space-y-4 md:order-1">
            <Secao titulo="Dados pessoais">
              <div className="grid gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Input label="Nome" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <Input label="CRECI" value={creci} onChange={(e) => setCreci(e.target.value)} />
                <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <div className="sm:col-span-2">
                  <Input
                    label="Endereço"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro"
                    hint="Usado só para aparecer no mapa de corretores e imobiliárias."
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="mb-1.5 block text-caption font-medium text-graytext">Cor da marca</span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {CORES_MARCA.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBrandColor(c)}
                        aria-label={`Cor ${c}`}
                        aria-pressed={brandColor.toLowerCase() === c}
                        className={`h-9 w-9 rounded-full border-[3px] border-white transition-all duration-200 ${
                          brandColor.toLowerCase() === c ? "ring-2 ring-charcoal" : "ring-1 ring-rule"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                    <label
                      title="Outra cor"
                      className="relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-muted text-graytext"
                    >
                      <Icone d="M12 5v14M5 12h14" className="h-4 w-4" />
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        aria-label="Outra cor"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </Secao>

            <Secao titulo="Como você atua">
              <div className="grid gap-2.5">
                {TIPOS_CONTA.map((t) => {
                  const ativo = accountType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setAccountType(t.value)}
                      aria-pressed={ativo}
                      className={`flex min-h-[72px] w-full items-start gap-3.5 rounded-card border p-4 text-left transition-all duration-200 ease-out ${
                        ativo ? "border-brand bg-[#f5fbff] ring-[3px] ring-brand/10" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${ativo ? "bg-brand-soft text-sky-800" : "bg-light text-graytext"}`}>
                        <Icone d={t.icone} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block text-[15px] text-charcoal">{t.label}</b>
                        <small className="text-body-sm text-graytext">{t.desc}</small>
                      </span>
                      <span className={`relative mt-0.5 h-5 w-5 flex-none rounded-full border-2 ${ativo ? "border-brand" : "border-rule"}`}>
                        {ativo && <span className="absolute inset-[3px] rounded-full bg-brand" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-caption text-muted">Define a tela em que você entra ao logar. Não esconde nada do que você já tem.</p>
            </Secao>

            <TrocarSenha />
          </div>

          <aside className="order-1 md:sticky md:top-[76px] md:order-2">
            <p className="mb-2.5 text-caption font-semibold tracking-[.08em] text-muted uppercase">Prévia do cartão</p>
            <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-float">
              <div className="h-[84px] transition-all duration-200" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}99)` }} />
              <div className="-mt-[34px] px-5 pb-5">
                <span
                  className="grid h-[68px] w-[68px] place-items-center rounded-full border-4 border-white text-title font-bold text-white transition-all duration-200"
                  style={{ background: brandColor }}
                >
                  {iniciais}
                </span>
                <h2 className="mt-3 text-lg font-bold tracking-tight text-charcoal">{fullName.trim() || "Seu nome"}</h2>
                <p className="text-body-sm text-graytext">{creci.trim() || "Seu CRECI"}</p>
                <span className="mt-2.5 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-caption font-semibold text-sky-800">
                  {tipoAtual?.label}
                </span>
                <div className="mt-3 space-y-2 text-[13px] text-slate-700">
                  <p className="flex items-start gap-2.5">
                    <Icone d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" className="mt-0.5 h-4 w-4 text-muted" />
                    <span>{phone.trim() || "Seu telefone"}</span>
                  </p>
                  <p className="flex items-start gap-2.5">
                    <Icone d="M12 21s7-6.1 7-11a7 7 0 0 0-14 0c0 4.9 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" className="mt-0.5 h-4 w-4 text-muted" />
                    <span>{address.trim() || "Seu endereço"}</span>
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {alterado && (
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-6 flex items-center gap-3 border-t border-slate-200/70 bg-white/90 px-4 py-3 backdrop-blur-xl md:bottom-0 md:-mx-8 md:px-8">
            <span className={`mr-auto text-body-sm ${msg ? "font-semibold text-danger-text" : "text-graytext"}`}>
              {msg || "Alterações não salvas"}
            </span>
            <Button variant="secondary" onClick={descartar}>
              Descartar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        )}
      </form>

      <div className="h-24 md:h-12" />
    </div>
  );
}

function Secao({ titulo, children }) {
  return (
    <section className="rounded-[20px] border border-slate-200/70 bg-white p-5 md:p-6">
      <h2 className="mb-4 text-[17px] font-semibold tracking-tight text-charcoal">{titulo}</h2>
      {children}
    </section>
  );
}

function TrocarSenha() {
  const [nova, setNova] = useState("");
  const [nova2, setNova2] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function trocar(e) {
    e.preventDefault();
    setMsg(null);
    if (nova.length < 6) {
      setMsg({ type: "err", text: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (nova !== nova2) {
      setMsg({ type: "err", text: "A nova senha e a repetição não conferem." });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: nova });
    setSaving(false);
    if (error) {
      setMsg({ type: "err", text: "Não foi possível trocar: " + error.message });
      return;
    }
    setNova("");
    setNova2("");
    setMsg({ type: "ok", text: "Senha alterada. Ela já vale para o próximo acesso." });
  }

  // O botão "Alterar senha" é independente do "Salvar" do perfil: cada um grava só o que é seu.
  return (
    <Secao titulo="Segurança">
      <div className="space-y-3.5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input label="Nova senha" type="password" value={nova} onChange={(e) => setNova(e.target.value)} autoComplete="new-password" />
          <Input label="Repita a nova senha" type="password" value={nova2} onChange={(e) => setNova2(e.target.value)} autoComplete="new-password" />
        </div>
        {msg && <p className={`text-body-sm font-semibold ${msg.type === "ok" ? "text-success-text" : "text-danger-text"}`}>{msg.text}</p>}
        <Button variant="secondary" disabled={saving} onClick={trocar}>
          {saving ? "Alterando…" : "Alterar senha"}
        </Button>
      </div>
    </Secao>
  );
}

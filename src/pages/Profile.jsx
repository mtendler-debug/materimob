import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import { geocodeAddress } from "../lib/geocode";

const TIPOS_CONTA = [
  { value: "corretor", label: "Corretor", desc: "Vou montar roteiros de visita e atender clientes." },
  { value: "imobiliaria", label: "Imobiliária", desc: "Gerencio uma equipe e um portfólio de imóveis." },
  { value: "incorporadora", label: "Incorporadora", desc: "Publico lançamentos para o ecossistema." },
];

export default function Profile() {
  const { profile, loading, reload } = useProfile();
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

  async function salvar(e) {
    e.preventDefault();
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
    setMsg("Salvo.");
    reload();
  }

  if (loading || !profile) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold text-charcoal">Meu perfil</h1>
        <p className="text-sm text-graytext">
          Nome, CRECI e telefone aparecem para os colegas da sua organização e, quando fizer
          sentido, para os clientes que você atende.
        </p>

        <form onSubmit={salvar} className="mt-6 space-y-4 rounded-[14px] border border-rule bg-white p-4">
          <div>
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Nome</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[160px] flex-1">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">CRECI</label>
              <input
                value={creci}
                onChange={(e) => setCreci(e.target.value)}
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-[220px] flex-[2]">
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Endereço</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Usado só pra aparecer no mapa de corretores/imobiliárias"
                className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-bold text-graytext uppercase">Cor da marca</label>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="mt-1 h-[38px] w-[52px] rounded-[9px] border-[1.5px] border-rule p-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Como você atua no mercado imobiliário?</label>
            <p className="mt-1 text-xs text-graytext">Define a tela em que você entra ao logar — não esconde nada do que você já tem.</p>
            <div className="mt-2 space-y-2">
              {TIPOS_CONTA.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setAccountType(t.value)}
                  className={`block w-full rounded-[9px] border-[1.5px] p-3 text-left text-sm ${
                    accountType === t.value ? "border-gold bg-light" : "border-rule"
                  }`}
                >
                  <span className="font-medium text-charcoal">{t.label}</span>
                  <span className="block text-xs text-graytext">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {msg && <span className="text-sm text-graytext">{msg}</span>}
          </div>
        </form>

        <TrocarSenha />
      </div>
    </div>
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

  return (
    <div className="mt-6 rounded-[14px] border border-rule bg-white p-4">
      <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">Segurança</h2>
      <form onSubmit={trocar} className="space-y-3">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[160px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Nova senha</label>
            <input
              type="password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Repita a nova senha</label>
            <input
              type="password"
              value={nova2}
              onChange={(e) => setNova2(e.target.value)}
              autoComplete="new-password"
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
        </div>
        {msg && (
          <p className={`text-sm ${msg.type === "ok" ? "text-[#2E7D32]" : "text-red-600"}`}>{msg.text}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Alterando…" : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}

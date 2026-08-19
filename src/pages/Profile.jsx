import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";

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
  const [brandColor, setBrandColor] = useState("#1C1C1C");
  const [accountType, setAccountType] = useState("corretor");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCreci(profile.creci ?? "");
    setPhone(profile.phone ?? "");
    setBrandColor(profile.brand_color ?? "#1C1C1C");
    setAccountType(profile.account_type ?? "corretor");
  }, [profile]);

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        creci: creci.trim() || null,
        phone: phone.trim() || null,
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
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useOrganization, ROLE_LABELS, canManage } from "../lib/useOrganization";
import { generateToken } from "../lib/token";

export default function Organization() {
  const { org, role, loading, reload } = useOrganization();

  if (loading) return <div className="p-6 text-sm text-muted">Carregando…</div>;

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="mx-auto max-w-2xl">
        <Link to="/app" className="text-sm text-graytext underline">
          ← Minhas seleções
        </Link>
        <h1 className="mt-3 text-xl font-bold text-charcoal">Organização</h1>

        {!org ? (
          <CreateOrganization onCreated={reload} />
        ) : (
          <OrganizationDetail org={org} role={role} onChange={reload} />
        )}
      </div>
    </div>
  );
}

function CreateOrganization({ onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("organizations").insert({ name: name.trim() });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
  }

  return (
    <div className="mt-4 rounded-[14px] border border-rule bg-white p-4">
      <p className="text-sm text-graytext">
        Você ainda não faz parte de uma organização. Crie uma se for licenciar o sistema para o time
        (imobiliária ou incorporadora) — você vira o diretor e pode convidar o resto da equipe.
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da imobiliária/incorporadora"
          className="flex-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Criando…" : "Criar organização"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function OrganizationDetail({ org, role, onChange }) {
  const [roster, setRoster] = useState(null);
  const manage = canManage(role);

  async function loadRoster() {
    const { data } = await supabase.rpc("organization_roster", { org: org.id });
    setRoster(data ?? []);
  }

  useEffect(() => {
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id]);

  return (
    <div className="mt-4 space-y-6">
      <div className="rounded-[14px] border border-rule bg-white p-4">
        <p className="text-lg font-bold text-charcoal">{org.name}</p>
        <p className="text-sm text-graytext">Você é {ROLE_LABELS[role]}.</p>
      </div>

      <div>
        <SectionTitle>Equipe</SectionTitle>
        <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">E-mail</th>
                <th className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">Papel</th>
              </tr>
            </thead>
            <tbody>
              {roster?.map((m) => (
                <tr key={m.user_id}>
                  <td className="border-b border-rule p-[10px] text-charcoal">{m.email}</td>
                  <td className="border-b border-rule p-[10px] text-graytext">{ROLE_LABELS[m.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {manage && <Invites orgId={org.id} onChange={onChange} />}

      <Link to="/app/portfolio" className="inline-block text-sm text-graytext underline">
        Ver portfólio da organização →
      </Link>
    </div>
  );
}

function Invites({ orgId }) {
  const [invites, setInvites] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("corretor");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase
      .from("organization_invites")
      .select("id, email, role, token, accepted_at, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    setInvites(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function sendInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    setError("");
    const { error: insertError } = await supabase.from("organization_invites").insert({
      organization_id: orgId,
      email: email.trim(),
      role,
      token: generateToken(),
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setEmail("");
    load();
  }

  async function removeInvite(id) {
    await supabase.from("organization_invites").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <SectionTitle>Convites</SectionTitle>
      <div className="rounded-[14px] border border-rule bg-white p-4">
        <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="block text-[11.5px] font-bold text-graytext uppercase">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
              className="mt-1 w-full rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-graytext uppercase">Papel</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 rounded-[9px] border-[1.5px] border-rule px-3 py-2 text-sm"
            >
              <option value="corretor">Corretor</option>
              <option value="coordenador">Coordenador</option>
              <option value="gerente">Gerente</option>
              <option value="diretor">Diretor</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[10px] bg-charcoal px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Gerando…" : "Gerar convite"}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 space-y-2">
          {invites?.length === 0 && <p className="text-sm text-muted">Nenhum convite ainda.</p>}
          {invites?.map((inv) => (
            <InviteRow key={inv.id} invite={inv} onRemove={() => removeInvite(inv.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InviteRow({ invite, onRemove }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/convite/${invite.token}`;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[9px] bg-bg p-2 text-sm">
      <span className="flex-1 text-charcoal">
        {invite.email} <span className="text-graytext">· {ROLE_LABELS[invite.role]}</span>
      </span>
      {invite.accepted_at ? (
        <span className="text-xs font-bold text-[#2E7D32]">aceito</span>
      ) : (
        <>
          <button
            onClick={() => {
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-[9px] bg-charcoal px-2 py-1 text-xs font-bold text-white hover:opacity-90"
          >
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button onClick={onRemove} className="text-xs font-bold text-[#B34A2E]">
            cancelar
          </button>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="mt-6 mb-2 text-[11px] font-bold uppercase tracking-[.14em] text-graytext">{children}</h2>;
}

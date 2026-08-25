import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthContext";

const TIPO_LABELS = { corretor: "Corretor", imobiliaria: "Imobiliária", incorporadora: "Incorporadora" };

export default function AdminAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function load() {
    const { data, error } = await supabase.rpc("platform_accounts");
    if (error) setError(error.message);
    else setAccounts(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleAdmin(account) {
    if (account.id === user?.id) {
      alert("Você não pode remover o próprio acesso de administrador por aqui.");
      return;
    }
    const acao = account.e_admin ? "remover" : "conceder";
    if (!window.confirm(`Confirma ${acao} acesso de administrador para ${account.email}?`)) return;
    setBusyId(account.id);
    const { error } = account.e_admin
      ? await supabase.from("platform_admins").delete().eq("user_id", account.id)
      : await supabase.from("platform_admins").insert({ user_id: account.id });
    setBusyId(null);
    if (error) {
      alert("Erro: " + error.message);
      return;
    }
    load();
  }

  async function deleteAccount(account) {
    if (account.id === user?.id) {
      alert("Você não pode excluir a própria conta por aqui.");
      return;
    }
    const ok = window.confirm(
      `Excluir "${account.full_name || account.email}" (${account.email})?\n\n` +
        `Os roteiros, avaliações, propostas e estoque pessoal dessa conta somem junto. ` +
        `Organizações que ela criou continuam existindo, só perdem a atribuição de quem criou.\n\n` +
        `Essa ação não pode ser desfeita.`,
    );
    if (!ok) return;
    setBusyId(account.id);
    const { data, error: fnError } = await supabase.functions.invoke("admin-delete-user", {
      body: { target_user_id: account.id },
    });
    setBusyId(null);
    if (fnError || data?.error) {
      alert("Erro: " + (data?.error || fnError.message));
      return;
    }
    load();
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!accounts) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="overflow-x-auto rounded-[14px] bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            {["E-mail", "Nome", "Tipo", "Organizações", "Roteiros", "Admin", ""].map((h) => (
              <th key={h} className="bg-charcoal p-[10px] text-left text-[11px] font-bold text-white">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {accounts.map((a) => (
            <tr key={a.id}>
              <td className="border-b border-rule p-[10px] text-charcoal">{a.email}</td>
              <td className="border-b border-rule p-[10px] text-graytext">{a.full_name || "—"}</td>
              <td className="border-b border-rule p-[10px] text-graytext">{TIPO_LABELS[a.account_type] || a.account_type}</td>
              <td className="border-b border-rule p-[10px] text-graytext">{a.organizacoes || "—"}</td>
              <td className="border-b border-rule p-[10px] text-center text-graytext">{a.roteiros}</td>
              <td className="border-b border-rule p-[10px] text-center">
                {a.e_admin && (
                  <span className="rounded-full px-[9px] py-[3px] text-[10.5px] font-bold" style={{ background: "#E3F0E4", color: "#2E7D32" }}>
                    admin
                  </span>
                )}
              </td>
              <td className="border-b border-rule p-[10px] text-right">
                <button
                  disabled={busyId === a.id}
                  onClick={() => toggleAdmin(a)}
                  className="text-xs font-bold text-graytext underline disabled:opacity-50"
                >
                  {a.e_admin ? "remover admin" : "tornar admin"}
                </button>
                <button
                  disabled={busyId === a.id}
                  onClick={() => deleteAccount(a)}
                  className="ml-3 text-xs font-bold text-[#B34A2E] underline disabled:opacity-50"
                >
                  excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

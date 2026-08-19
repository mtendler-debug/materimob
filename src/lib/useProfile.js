import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// account_type é a CASA do usuário — a tela em que ele entra e o menu
// principal. Contas criadas antes do gatilho handle_new_user existir não
// têm linha em profiles; em vez de quebrar a tela, este hook cria a linha
// na hora com o valor padrão 'corretor'.
export function useProfile() {
  const [profile, setProfile] = useState(undefined);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setIsPlatformAdmin(false);
      return;
    }

    let { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!data) {
      const { data: created } = await supabase
        .from("profiles")
        .insert({ id: user.id, account_type: "corretor" })
        .select("*")
        .single();
      data = created;
    }
    setProfile(data);

    const { data: admin } = await supabase.rpc("is_platform_admin");
    setIsPlatformAdmin(!!admin);
  }

  useEffect(() => {
    load();
  }, []);

  const loading = profile === undefined;

  return {
    profile: profile ?? null,
    accountType: profile?.account_type ?? null,
    isPlatformAdmin,
    loading,
    reload: load,
  };
}

// account_type não é uma parede — só decide a casa (a tela em que a pessoa
// entra). Pertencer a uma organização acrescenta áreas ao menu, nunca
// substitui isso.
export function homeForAccountType(accountType) {
  return accountType === "imobiliaria" || accountType === "incorporadora"
    ? "/app/organizacao"
    : "/app";
}

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

async function loadOrCreateProfile(userId) {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (data) return data;
  const { data: created } = await supabase
    .from("profiles")
    .insert({ id: userId, account_type: "corretor" })
    .select("*")
    .single();
  return created;
}

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

    // As duas buscas rodam em paralelo e só então os dois estados são
    // atualizados juntos — se `isPlatformAdmin` fosse setado depois de
    // `profile` num await separado, `loading` (baseado só em `profile`)
    // vira false por um instante com `isPlatformAdmin` ainda no valor
    // antigo, e um RoleRoute que ler o estado nesse instante redireciona
    // um admin de verdade pra fora do /admin.
    const [profileRow, { data: admin }] = await Promise.all([
      loadOrCreateProfile(user.id),
      supabase.rpc("is_platform_admin"),
    ]);
    setProfile(profileRow);
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

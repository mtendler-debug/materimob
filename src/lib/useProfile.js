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
  const [hasCrmAccess, setHasCrmAccess] = useState(false);
  const [modulos, setModulos] = useState({ avaliador: true, crm: false });

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setIsPlatformAdmin(false);
      setHasCrmAccess(false);
      setModulos({ avaliador: true, crm: false });
      return;
    }

    // As três buscas rodam em paralelo e só então os estados são
    // atualizados juntos — se `isPlatformAdmin`/`hasCrmAccess` fossem
    // setados depois de `profile` num await separado, `loading`
    // (baseado só em `profile`) vira false por um instante com os
    // outros dois ainda no valor antigo, e uma tela que ler o estado
    // nesse instante barra quem tinha acesso de verdade.
    const [profileRow, { data: admin }, { data: crm }, { data: mods }] = await Promise.all([
      loadOrCreateProfile(user.id),
      supabase.rpc("is_platform_admin"),
      supabase.rpc("has_crm_access"),
      supabase.rpc("meus_modulos"),
    ]);
    setProfile(profileRow);
    setIsPlatformAdmin(!!admin);
    setHasCrmAccess(!!crm);
    // Sem resposta (ex.: erro de rede), o Avaliador segue ligado: não trancar ninguém por falha.
    setModulos({ avaliador: mods?.avaliador ?? true, crm: mods?.crm ?? !!crm });
  }

  useEffect(() => {
    load();
  }, []);

  const loading = profile === undefined;

  return {
    profile: profile ?? null,
    accountType: profile?.account_type ?? null,
    isPlatformAdmin,
    hasCrmAccess,
    modulos,
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

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// undefined = carregando, null = usuário não pertence a nenhuma organização.
export function useOrganization() {
  const [org, setOrg] = useState(undefined);
  const [role, setRole] = useState(null);

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setOrg(null);
      setRole(null);
      return;
    }
    // RLS libera ver a linha de qualquer colega de organização (para o
    // roster funcionar) — por isso o filtro por user_id aqui é obrigatório,
    // senão .limit(1) pode devolver o papel de outra pessoa.
    const { data } = await supabase
      .from("organization_members")
      .select("role, organizations(id, name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (data) {
      setOrg(data.organizations);
      setRole(data.role);
    } else {
      setOrg(null);
      setRole(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { org, role, loading: org === undefined, reload: load };
}

export const ROLE_LABELS = {
  diretor: "Diretor",
  gerente: "Gerente",
  coordenador: "Coordenador",
  corretor: "Corretor",
};

export function canManage(role) {
  return role === "diretor" || role === "gerente";
}

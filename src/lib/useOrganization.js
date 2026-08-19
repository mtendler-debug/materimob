import { useEffect, useState } from "react";
import { supabase } from "./supabase";

const ACTIVE_ORG_KEY = "av_active_org_id";

// undefined = carregando, null = usuário não pertence a nenhuma organização.
// Um corretor pode ser membro de mais de uma organização (ex.: dono de uma
// imobiliária que também testa como incorporadora) — a "ativa" é a que
// define o que ele gerencia no momento, e fica lembrada no navegador.
export function useOrganization() {
  const [memberships, setMemberships] = useState(undefined);
  const [activeOrgId, setActiveOrgIdState] = useState(() => localStorage.getItem(ACTIVE_ORG_KEY));

  async function load() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMemberships(null);
      return;
    }
    // RLS libera ver a linha de qualquer colega de organização (para o
    // roster funcionar) — por isso o filtro por user_id aqui é obrigatório,
    // senão a lista poderia devolver membros de outras contas.
    const { data } = await supabase
      .from("organization_members")
      .select("role, organizations(id, name, tipo)")
      .eq("user_id", user.id);
    setMemberships(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function setActiveOrgId(id) {
    localStorage.setItem(ACTIVE_ORG_KEY, id);
    setActiveOrgIdState(id);
  }

  const loading = memberships === undefined;
  const list = memberships ?? [];
  const active =
    list.find((m) => m.organizations.id === activeOrgId) ?? list[0] ?? null;

  return {
    org: active?.organizations ?? null,
    role: active?.role ?? null,
    memberships: list,
    activeOrgId: active?.organizations.id ?? null,
    setActiveOrgId,
    loading,
    reload: load,
  };
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

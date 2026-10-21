import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// Pedidos de acesso à Academia esperando liberação. Só o dono do canal enxerga
// linhas de pc_acessos; para qualquer outra pessoa a contagem é 0.
export function usePendentesAcesso() {
  const [pendentes, setPendentes] = useState(0);

  const recarregar = useCallback(async () => {
    const { count } = await supabase
      .from("pc_acessos")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "pendente");
    setPendentes(count ?? 0);
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { pendentes, recarregar };
}

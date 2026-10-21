import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

// O que está esperando decisão do dono do canal: pedidos de acesso à Academia e
// argumentos sugeridos por corretores. Só o dono enxerga essas linhas; para
// qualquer outra pessoa as contagens são 0.
export function usePendentesAcesso() {
  const [contagem, setContagem] = useState({ pendentes: 0, sugestoes: 0 });

  const recarregar = useCallback(async () => {
    const [acessos, sugestoes] = await Promise.all([
      supabase.from("pc_acessos").select("user_id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("pc_argumentos").select("id", { count: "exact", head: true }).eq("status", "sugerida"),
    ]);
    setContagem({ pendentes: acessos.count ?? 0, sugestoes: sugestoes.count ?? 0 });
  }, []);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { ...contagem, recarregar };
}

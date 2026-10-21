import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./AuthContext";

// undefined = carregando, null = nunca pediu acesso à Academia,
// objeto = { status, papel, nome, parceira_id, parceira }.
const AcessoCanalContext = createContext({ acesso: null, reload: async () => {} });

// Um só carregamento para o app inteiro (menu, entrada e telas da Academia
// consultam o mesmo valor). Faz duas coisas além de ler:
//  - se a pessoa criou a conta pelo /academia mas ainda não tinha sessão
//    (confirmação de e-mail), o pedido de acesso guardado no cadastro é
//    enviado agora, na primeira entrada;
//  - registra o "último acesso" de quem já está liberado.
export function AcessoCanalProvider({ children }) {
  const { user, loading } = useAuth();
  const [acesso, setAcesso] = useState(undefined);

  const load = useCallback(async () => {
    if (!user) {
      setAcesso(null);
      return;
    }
    let { data } = await supabase.rpc("pc_meu_acesso");

    const pedido = user.user_metadata?.academia;
    if (!data && pedido) {
      const { error } = await supabase.rpc("pc_solicitar_acesso", {
        p_nome: pedido.p_nome,
        p_whatsapp: pedido.p_whatsapp,
        p_creci: pedido.p_creci,
        p_papel: pedido.p_papel,
        p_parceira_id: pedido.p_parceira_id,
        p_imobiliaria_informada: pedido.p_imobiliaria_informada,
      });
      if (!error || error.message?.includes("já tem um pedido")) {
        ({ data } = await supabase.rpc("pc_meu_acesso"));
        await supabase.auth.updateUser({ data: { academia: null } });
      }
    }

    setAcesso(data ?? null);
    // O cliente do Supabase só envia a chamada quando alguém "espera" por ela.
    if (data?.status === "liberado") {
      supabase.rpc("pc_registrar_presenca").then(
        () => {},
        () => {},
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;
    setAcesso(undefined);
    load();
  }, [loading, load]);

  return <AcessoCanalContext.Provider value={{ acesso, reload: load }}>{children}</AcessoCanalContext.Provider>;
}

export function useAcessoCanal() {
  return useContext(AcessoCanalContext);
}

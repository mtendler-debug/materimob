import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { semAcento } from "./treino";

// Capas dos projetos da Academia, ligadas ao imóvel pelo nome. Serve de capa quando o imóvel
// (do estoque ou lançamento) ainda não tem foto própria. Carrega uma vez só e guarda em memória.
// Quem não enxerga os projetos da Academia simplesmente não recebe capa daqui.
let cache = null;
let pedido = null;

function carregar() {
  pedido ??= supabase
    .from("pc_kits")
    .select("nome, capa_url")
    .then(({ data }) => {
      cache = (data ?? []).filter((k) => k.nome && k.capa_url).map((k) => ({ n: semAcento(k.nome).trim(), url: k.capa_url }));
      return cache;
    });
  return pedido;
}

export function useCapasAcademia() {
  const [kits, setKits] = useState(cache);
  useEffect(() => {
    if (cache) return;
    let ativo = true;
    carregar().then((c) => ativo && setKits(c));
    return () => {
      ativo = false;
    };
  }, []);

  // Devolve a capa do projeto cujo nome é igual ao do imóvel, ou contido nele (ou ao contrário).
  return (nome) => {
    const n = semAcento(nome).trim();
    if (!kits || n.length < 3) return undefined;
    const achou = kits.find((k) => k.n === n) ?? kits.find((k) => k.n.length >= 4 && (n.includes(k.n) || k.n.includes(n)));
    return achou?.url;
  };
}

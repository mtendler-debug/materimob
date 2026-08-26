import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export const LEAD_STAGES = ["lead", "qualificacao", "visita", "proposta", "fechamento"];
export const LEAD_STAGE_LABELS = {
  lead: "Lead",
  qualificacao: "Qualificação",
  visita: "Visita",
  proposta: "Proposta",
  fechamento: "Fechamento",
};

export const SOURCES = ["indicacao", "portal", "instagram", "google", "site_proprio", "outro"];
export const SOURCE_LABELS = {
  indicacao: "Indicação",
  portal: "Portal (ZAP/Viva)",
  instagram: "Instagram",
  google: "Google",
  site_proprio: "Site próprio",
  outro: "Outro",
};

export const OPP_TYPES = ["compra", "venda", "permuta"];
export const OPP_TYPE_LABELS = { compra: "Compra", venda: "Venda", permuta: "Permuta" };
export const OPP_TYPE_COLORS = {
  compra: { bg: "#E3EEF5", color: "#2F6690" },
  venda: { bg: "#FFF3E0", color: "#B26A00" },
  permuta: { bg: "#F1E4F5", color: "#7A3E8C" },
};

export const OPP_STAGES = ["aberta", "negociacao", "proposta", "fechada", "perdida"];
export const OPP_STAGE_LABELS = {
  aberta: "Aberta",
  negociacao: "Em negociação",
  proposta: "Proposta",
  fechada: "Fechada",
  perdida: "Perdida",
};
export const OPP_STAGE_ATIVA = (stage) => stage !== "fechada" && stage !== "perdida";

export function brl(n) {
  return n == null ? "—" : "R$ " + Math.round(n).toLocaleString("pt-BR");
}

// Leads com as próprias oportunidades e os dados do cliente (av_clients)
// já embutidos — usado por Pipeline/Leads/CrmDashboard, que precisam
// exatamente da mesma lista.
export function useLeadsWithOpportunities() {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState("");

  async function load() {
    const { data, error } = await supabase
      .from("av_leads")
      .select("*, av_clients(name, phone, email), av_opportunities(*)")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setLeads(data ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { leads, error, reload: load };
}

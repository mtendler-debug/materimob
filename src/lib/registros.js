// Situações do registro de cliente, como o corretor as vê. As mesmas de
// Parcerias > Registros (STATUS_REGISTRO_LABELS).
export const STATUS_REGISTRO = {
  pendente: "Pendente",
  registrado: "Registrado",
  conflito: "Em conflito",
  visita: "Visita",
  proposta: "Proposta",
  venda: "Venda",
  expirado: "Expirado",
  cancelado: "Cancelado",
};

export const TOM_STATUS = {
  pendente: "border-slate-300 bg-slate-100 text-slate-600",
  registrado: "border-sky-300 bg-sky-100 text-sky-800",
  conflito: "border-rose-300 bg-rose-100 text-rose-800",
  visita: "border-amber-300 bg-amber-100 text-amber-800",
  proposta: "border-amber-300 bg-amber-100 text-amber-800",
  venda: "border-emerald-300 bg-emerald-100 text-emerald-800",
  expirado: "border-slate-200 bg-slate-100 text-slate-500",
  cancelado: "border-slate-200 bg-slate-100 text-slate-500",
};

export const EXPLICACAO = {
  pendente: "A coordenação está conferindo o seu registro. Você não precisa fazer nada.",
  registrado: "O cliente está registrado na incorporadora em nome da sua imobiliária. Pode seguir o atendimento.",
  conflito:
    "Já existe um registro vigente deste cliente neste projeto. A coordenação decide qual vale. Você não precisa fazer nada, e avisamos aqui.",
  visita: "O cliente está na fase de visita ao empreendimento.",
  proposta: "O cliente está com proposta em andamento. A coordenação acompanha com a incorporadora.",
  venda: "Venda concluída. Parabéns!",
  expirado: "O prazo do registro acabou sem venda. Se o cliente ainda tem interesse, registre de novo.",
  cancelado: "Este registro foi cancelado pela coordenação.",
};

export const TEXTO_EVENTO = {
  criado: "Registro enviado",
  validado: "Validado pela coordenação",
  conflito: "Em conflito com um registro vigente. A coordenação vai decidir.",
  visita: "Visita ao empreendimento",
  proposta: "Proposta enviada",
  venda: "Venda concluída",
  expirado: "Prazo do registro encerrado sem venda",
  cancelado: "Registro cancelado",
};

const VIVOS = ["pendente", "registrado", "visita", "proposta"];

export const estaVivo = (status) => VIVOS.includes(status);

export function diasRestantes(r) {
  return Math.ceil((new Date(r.valido_ate).getTime() - Date.now()) / 86400000);
}

// O banco só marca "expirado" quando alguém roda a rotina de vencidos. Para quem
// olha a tela, registro vivo com prazo vencido já é expirado.
export function situacaoEfetiva(r) {
  return estaVivo(r.status) && diasRestantes(r) <= 0 ? "expirado" : r.status;
}

export const RESTRITOS = ["HIS-1", "HIS-2", "HMP"];

export function mascaraCpf(ultimos3) {
  return ultimos3?.length === 3 ? `•••.•••.••${ultimos3[0]}-${ultimos3.slice(1)}` : null;
}

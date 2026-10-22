// Canal de contato oficial do MaterImob (WhatsApp). Um lugar só, para a página de entrada,
// o convite do CRM e a política de privacidade usarem o mesmo número.
export const WHATSAPP_NUMERO = "5511943132008";
export const WHATSAPP_EXIBIDO = "(11) 94313-2008";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}`;

export function whatsappUrl(mensagem) {
  return mensagem ? `${WHATSAPP_URL}?text=${encodeURIComponent(mensagem)}` : WHATSAPP_URL;
}

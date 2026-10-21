export const dig = s => (s || '').replace(/\D/g, '');
export const brl = v => v == null || isNaN(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const brlCurto = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' M';
  if (n >= 1e3) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  return brl(n);
};
export const nf = v => Number(v || 0).toLocaleString('pt-BR');
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export const maskCPF = s => dig(s).slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
export const maskPhone = s => {
  const d = dig(s).slice(0, 11);
  if (d.length <= 2) return d;
  const a = '(' + d.slice(0, 2) + ') ', r = d.slice(2);
  if (r.length <= 4) return a + r;
  return a + (d.length === 11 ? r.slice(0, 5) + '-' + r.slice(5) : r.slice(0, 4) + '-' + r.slice(4));
};
export const maskCNPJ = s => dig(s).slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
export const maskMoney = s => { const d = dig(s).slice(0, 12); if (!d) return ''; return (Number(d) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); };
export const moneyValue = s => Number(dig(s)) / 100;

export function cpfOk(c) {
  c = dig(c);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +c[i] * (10 - i);
  let d1 = (s * 10) % 11; if (d1 === 10) d1 = 0; if (d1 !== +c[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +c[i] * (11 - i);
  let d2 = (s * 10) % 11; if (d2 === 10) d2 = 0; return d2 === +c[10];
}
export const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

export const iniciais = n => (n || '').split(/\s+/).filter(p => p.length > 2 || /^[A-ZÀ-Ý]/.test(p)).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';
export const primeiroNome = n => (n || '').split(' ')[0];
export const fill = (t, v) => (t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] !== undefined && v[k] !== null ? v[k] : m));

export const dataBR = d => d ? new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR') : '—';
export const dataHoraBR = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
export const diasDesde = d => d ? Math.floor((Date.now() - new Date(d.length === 10 ? d + 'T12:00:00' : d).getTime()) / 86400000) : null;
export const relativo = d => {
  if (!d) return 'nunca';
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return 'há ' + min + ' min';
  const h = Math.round(min / 60); if (h < 24) return 'há ' + h + ' h';
  const dd = Math.round(h / 24); return dd === 1 ? 'ontem' : 'há ' + dd + ' dias';
};

export const TESES = [
  { id: 'investimento', label: 'Investimento', icon: 'TrendingUp' },
  { id: 'moradia', label: 'Moradia', icon: 'Home' },
  { id: 'escassez', label: 'Escassez', icon: 'Timer' },
];

export const PAPEIS = { admin: 'Administrador', gestor: 'Gestor de imobiliária', corretor: 'Corretor parceiro' };

export const STATUS_NEG = {
  em_negociacao: ['Em negociação', 'p-blue'], proposta_enviada: ['Proposta enviada', 'p-amber'],
  aprovada: ['Aprovada', 'p-green'], vendida: ['Vendida', 'p-green'], perdida: ['Perdida', 'p-grey'],
};

// Como cada atividade aparece na linha do tempo
export const ATIVIDADES = {
  abriu_projeto: ['abriu o projeto', 'Eye'], abriu_book: ['abriu o book', 'BookOpen'], abriu_tabela: ['abriu a tabela', 'Table'],
  abriu_video: ['assistiu o vídeo', 'PlayCircle'], baixou_arte: ['baixou a arte', 'Download'], copiou_texto: ['copiou um texto', 'Copy'],
  usou_argumento: ['usou um argumento', 'MessageSquareQuote'], enviou_kit: ['enviou um kit no WhatsApp', 'Send'],
  cliente_abriu: ['teve um cliente abrindo o link', 'MousePointerClick'], concluiu_aula: ['concluiu a aula', 'BookCheck'],
  fez_quiz: ['fez o quiz de', 'ListChecks'], certificou: ['se certificou em', 'Award'],
  negocio_em_negociacao: ['registrou um negócio', 'Handshake'], negocio_proposta_enviada: ['enviou proposta', 'FileText'],
  negocio_aprovada: ['teve proposta aprovada', 'BadgeCheck'], negocio_vendida: ['vendeu', 'Trophy'], negocio_perdida: ['perdeu o negócio', 'XCircle'],
};

export const ETAPAS_VENDA = {
  abordagem: 'Primeira abordagem', qualificacao: 'Qualificação', apresentacao: 'Apresentação',
  objecao: 'Objeções', fechamento: 'Fechamento', pos_venda: 'Pós-venda',
};

export const errMsg = e => {
  const m = e?.message || String(e || 'Erro inesperado');
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/User already registered/i.test(m)) return 'Este e-mail já tem cadastro. Use Entrar ou Esqueci minha senha.';
  if (/Password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
  if (/Database error saving new user/i.test(m)) return 'Não foi possível concluir o cadastro. Confira os dados e tente de novo.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  return m;
};

export function abrirWhatsApp(texto, numero) {
  const url = 'https://wa.me/' + (numero ? '55' + dig(numero).replace(/^55/, '') : '') + '?text=' + encodeURIComponent(texto);
  return url;
}

export async function baixarArquivo(url, nome) {
  try {
    const r = await fetch(url); const b = await r.blob();
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  } catch { window.open(url, '_blank', 'noopener'); }
}

export async function copiarTexto(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

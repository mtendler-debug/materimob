// Gera uma arte provisória (JPEG) quando o Marketing ainda não enviou a oficial
const cache = {};
export function arteGerada(l, formato = 'feed', w = 1080) {
  const key = [l.id, l.nome, l.fase, l.local, l.cor1, l.cor2, formato, w].join('|');
  if (cache[key]) return cache[key];
  const W = w, H = formato === 'feed' ? w : Math.round((w * 16) / 9), s = w / 1080;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, l.cor1 || '#0B3D91'); g.addColorStop(1, l.cor2 || '#1A73E8');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) {
    const bw = (80 + ((i * 53) % 70)) * s, bh = H * 0.18 + ((i * 137) % Math.round(H * 0.32));
    x.fillStyle = 'rgba(255,255,255,' + (0.05 + (i % 3) * 0.03) + ')'; x.fillRect((40 + i * 130) * s, H - bh, bw, bh);
    x.fillStyle = 'rgba(255,255,255,.10)';
    for (let r = 0; r < bh / (40 * s) - 1; r++) for (let k = 0; k < 2; k++) x.fillRect((52 + i * 130 + k * 34) * s, H - bh + (16 + r * 40) * s, 18 * s, 12 * s);
  }
  x.fillStyle = '#fff'; x.font = '500 ' + 30 * s + 'px Roboto, Arial'; x.fillText('C H A I N C O R P', 72 * s, 110 * s);
  const top = formato === 'feed' ? 300 * s : 560 * s;
  const fase = l.fase || '';
  if (fase) {
    x.font = '500 ' + 30 * s + 'px Roboto, Arial';
    const pw = x.measureText(fase).width + 48 * s;
    x.fillStyle = 'rgba(255,255,255,.18)'; x.beginPath();
    if (x.roundRect) x.roundRect(72 * s, top - 60 * s, pw, 52 * s, 26 * s); else x.rect(72 * s, top - 60 * s, pw, 52 * s);
    x.fill(); x.fillStyle = '#fff'; x.fillText(fase, 96 * s, top - 24 * s);
  }
  x.font = '700 ' + 92 * s + 'px Roboto, Arial';
  let line = '', y = top + 90 * s;
  for (const wd of (l.nome || '').split(' ')) {
    const t = line ? line + ' ' + wd : wd;
    if (x.measureText(t).width > W - 144 * s && line) { x.fillText(line, 72 * s, y); line = wd; y += 100 * s; } else line = t;
  }
  x.fillText(line, 72 * s, y);
  x.font = '400 ' + 40 * s + 'px Roboto, Arial'; x.fillStyle = 'rgba(255,255,255,.88)'; x.fillText(l.local || '', 72 * s, y + 70 * s);
  x.font = '500 ' + 28 * s + 'px Roboto, Arial'; x.fillStyle = '#fff'; x.fillText('Fale com seu corretor parceiro', 72 * s, H - 80 * s);
  return (cache[key] = c.toDataURL('image/jpeg', 0.9));
}

export const arteDo = (l, formato, w) => (formato === 'feed' ? l.arte_feed_url : l.arte_stories_url) || arteGerada(l, formato, w);
export const temArteOficial = (l, formato) => Boolean(formato === 'feed' ? l.arte_feed_url : l.arte_stories_url);

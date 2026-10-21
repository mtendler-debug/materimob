import React, { useEffect, useState } from 'react';
import { supabase, configurado } from '../lib/supabase.js';
import { Icon, Spinner } from '../ui.jsx';
import { abrirWhatsApp, primeiroNome } from '../lib/util.js';
import { arteDo } from '../lib/arte.js';

// Página que o cliente final abre ao tocar no link do corretor
export default function LinkPublico({ token }) {
  const [d, setD] = useState(undefined);
  useEffect(() => {
    if (!configurado || !token) { setD(null); return; }
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m);
    supabase.rpc('abrir_link', { p_token: token, p_user_agent: navigator.userAgent }).then(({ data }) => setD(data || null));
  }, [token]);
  useEffect(() => { if (d?.lancamento) document.title = d.lancamento.nome + ' · Chaincorp'; }, [d]);

  if (d === undefined) return <div className="min-h-screen grid place-items-center muted"><Spinner /></div>;
  if (!d) return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div><Icon n="Unlink" size={36} className="muted mx-auto" /><h1 className="text-[22px] mt-3">Link indisponível</h1><p className="muted mt-1">Peça ao seu corretor um novo link.</p></div>
    </div>
  );
  const l = d.lancamento, c = d.corretor;
  const msg = 'Olá, ' + primeiroNome(c.nome) + '! Vi o material do ' + l.nome + ' e quero saber mais.';
  const galeria = Array.isArray(l.galeria) ? l.galeria : [];
  const capa = l.capa_url || galeria[0]?.url;
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="relative" style={{ background: `linear-gradient(135deg, ${l.cor1}, ${l.cor2})`, color: '#fff' }}>
        {capa && <img src={capa} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {capa && <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,14,22,.25) 0%, rgba(10,14,22,.82) 100%)' }} />}
        <div className="relative mx-auto max-w-[980px] px-4 sm:px-6 flex flex-col justify-end" style={{ minHeight: capa ? 'min(78vh, 620px)' : 0, paddingTop: 32, paddingBottom: 40 }}>
          <div className="text-[13px] tracking-[0.35em] font-medium opacity-90">CHAINCORP</div>
          {l.fase && <span className="self-start mt-5 rounded-full px-3 py-1 text-[13px] font-medium" style={{ background: 'rgba(255,255,255,.2)' }}>{l.fase}</span>}
          <h1 className="text-[36px] sm:text-[52px] leading-[1.05] font-bold mt-3">{l.nome}</h1>
          {l.local && <p className="mt-3 text-[17px] opacity-90 flex items-center gap-2"><Icon n="MapPin" size={18} />{l.local}</p>}
          {l.resumo && <p className="mt-3 text-[16px] leading-relaxed opacity-95" style={{ maxWidth: '58ch' }}>{l.resumo}</p>}
          {!capa && <img src={arteDo(l, 'feed', 720)} alt={'Imagem do ' + l.nome} className="rounded-2xl w-full shadow-2xl mt-6" style={{ maxWidth: 440 }} />}
        </div>
      </div>
      {galeria.length > 1 && <div className="mx-auto max-w-[980px] px-4 sm:px-6 pt-8">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{galeria.slice(1).map((f, i) => <figure key={i} className="flex flex-col gap-1"><img src={f.url} alt={f.legenda} loading="lazy" className="rounded-xl w-full object-cover" style={{ aspectRatio: '4/3' }} /><figcaption className="muted text-[12.5px]">{f.legenda}</figcaption></figure>)}</div>
        {l.destaques?.length > 0 && <ul className="card p-5 mt-4 flex flex-col gap-2">{l.destaques.map((x, i) => <li key={i} className="flex gap-2 text-[14.5px] leading-relaxed"><Icon n="Check" size={17} className="shrink-0 mt-0.5" style={{ color: 'var(--green)' }} /><span>{x.charAt(0).toUpperCase() + x.slice(1)}</span></li>)}</ul>}
      </div>}
      <div className="mx-auto max-w-[980px] px-4 sm:px-6 py-8 grid gap-4 md:grid-cols-3">
        {l.lamina_url && <a href={l.lamina_url} target="_blank" rel="noopener" className="card p-5 flex items-center gap-4 hover:shadow"><img src={l.lamina_url} alt="" className="rounded" style={{ width: 44, height: 56, objectFit: 'cover' }} /><span><b className="font-medium block">Resumo do projeto</b><span className="muted text-[13px]">Ver a lâmina em uma página</span></span></a>}
        {l.drive_url && <a href={l.drive_url} target="_blank" rel="noopener" className="card p-5 flex items-center gap-4 hover:shadow"><span className="avatar p-blue" style={{ width: 44, height: 44, borderRadius: 12 }}><Icon n="BookOpen" size={22} /></span><span><b className="font-medium block">Book e plantas</b><span className="muted text-[13px]">Abrir no Google Drive</span></span></a>}
        {l.youtube_url && <a href={l.youtube_url} target="_blank" rel="noopener" className="card p-5 flex items-center gap-4 hover:shadow"><span className="avatar p-red" style={{ width: 44, height: 44, borderRadius: 12 }}><Icon n="PlayCircle" size={22} /></span><span><b className="font-medium block">Apresentação em vídeo</b><span className="muted text-[13px]">Assistir no YouTube</span></span></a>}
        <div className="card p-5 flex flex-col gap-3 md:col-start-3 md:row-start-1 md:row-span-2" style={{ borderColor: 'var(--green)' }}>
          <div className="eyebrow">Seu corretor</div>
          <div className="text-[18px] font-medium">{c.nome}</div>
          {d.imobiliaria && <div className="muted text-[13px] -mt-2">{d.imobiliaria}</div>}
          {c.whatsapp ? <a className="btn btn-green" style={{ minHeight: 48 }} href={abrirWhatsApp(msg, c.whatsapp)} target="_blank" rel="noopener"><Icon n="MessageCircle" size={19} />Falar no WhatsApp</a>
            : <p className="muted text-[13px]">Responda a mensagem que você recebeu para falar com o corretor.</p>}
          <p className="muted text-[12px]">Condições, tabela e disponibilidade são confirmadas pelo corretor parceiro Chaincorp.</p>
        </div>
        {!l.drive_url && !l.youtube_url && !l.lamina_url && <div className="card p-5 md:col-span-2"><p className="leading-relaxed">O material completo deste empreendimento é enviado pelo seu corretor. Fale com {primeiroNome(c.nome)} para receber o book, as plantas e a tabela atualizada.</p></div>}
      </div>
      <p className="text-center muted text-[12px] pb-8">Chaincorp Incorporações</p>
    </div>
  );
}

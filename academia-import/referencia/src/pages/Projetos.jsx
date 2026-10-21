import React, { useEffect, useRef, useState } from 'react';
import { supabase, q, rpc } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, PageHead, Pill, Empty, Modal, Field, Switch, Tabs, Section, useLoad, LoadError, useToast, Skeleton, Spinner } from '../ui.jsx';
import { TESES, ETAPAS_VENDA, fill, abrirWhatsApp, baixarArquivo, copiarTexto, errMsg, relativo, dataHoraBR, nf } from '../lib/util.js';
import { arteDo, temArteOficial } from '../lib/arte.js';

export const registrar = (tipo, lancamento, detalhe) => { supabase.rpc('registrar_atividade', { p_tipo: tipo, p_lancamento: lancamento || null, p_detalhe: detalhe || null }); };

// Texto simples com ## títulos, - listas e **negrito**
export function TextoRico({ texto }) {
  if (!texto) return null;
  const negrito = s => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') ? <b key={i} className="font-medium">{p.slice(2, -2)}</b> : p);
  const blocos = []; let lista = null;
  texto.split('\n').forEach((l, i) => {
    const t = l.trim();
    if (/^[-·•]\s|^\d+\.\s/.test(t)) { if (!lista) { lista = []; blocos.push({ lista }); } lista.push(t.replace(/^[-·•]\s|^\d+\.\s/, '')); return; }
    lista = null;
    if (!t) return;
    if (t.startsWith('## ')) blocos.push({ h: t.slice(3) }); else blocos.push({ p: t });
  });
  return (
    <div className="flex flex-col gap-2.5 text-[14.5px] leading-relaxed" style={{ maxWidth: '72ch' }}>
      {blocos.map((b, i) => b.h ? <h3 key={i} className="text-[16px] font-medium mt-3">{b.h}</h3>
        : b.lista ? <ul key={i} className="flex flex-col gap-1.5 pl-1">{b.lista.map((x, j) => <li key={j} className="flex gap-2"><span className="dot mt-2" style={{ background: 'var(--blue)', width: 6, height: 6 }} /><span>{negrito(x)}</span></li>)}</ul>
        : <p key={i}>{negrito(b.p)}</p>)}
    </div>
  );
}

const TEXTO_PADRAO = {
  investimento: 'Olá! Separei uma oportunidade de investimento que combina com o que conversamos.\n\n*{nome}* | {local}\n{fase}\n\nVeja os detalhes aqui: {link}\n\nQualquer dúvida, estou à disposição.\n{corretor}',
  moradia: 'Olá! Lembrei de você ao conhecer este projeto para morar.\n\n*{nome}* | {local}\n{fase}\n\nDá uma olhada: {link}\n\nPosso agendar uma conversa?\n{corretor}',
  escassez: 'Olá! As unidades do *{nome}* ({local}) estão saindo rápido e as condições de lançamento são por tempo limitado.\n\nVeja antes que acabe: {link}\n\n{corretor}',
};

export default function Projetos() {
  const { path } = useNav();
  const id = path.split('/')[2];
  return id ? <Projeto id={id} /> : <ListaProjetos />;
}

function ListaProjetos() {
  const { perfil } = useAuth(); const { ir } = useNav();
  const admin = perfil.papel === 'admin';
  const [aba, setAba] = useState('projetos'); const [novo, setNovo] = useState(null);
  const d = useLoad(() => q(admin ? supabase.from('lancamentos').select('*').order('ordem') : supabase.from('lancamentos').select('*').eq('ativo', true).order('ordem')), []);
  return <>
    <PageHead eyebrow="Projetos Chaincorp" title={admin ? 'Projetos e materiais' : 'Materiais para vender'} sub={admin ? 'Edite o conteúdo que os parceiros veem: argumentos, ficha, artes, links e textos de WhatsApp' : 'Escolha um projeto para ver argumentos, baixar artes e enviar o material ao seu cliente'}>
      {admin && <button className="btn btn-filled" onClick={() => setNovo({ novo: true, nome: '', local: '', fase: 'Pré-lançamento', tags: [], cor1: '#1B3A57', cor2: '#1A73E8', ordem: ((d.data || []).length + 1) * 10, ativo: true })}><Icon n="Plus" size={18} />Novo projeto</button>}
    </PageHead>
    {!admin && <Tabs value={aba} onChange={setAba} tabs={[{ id: 'projetos', label: 'Projetos', icon: 'LayoutGrid' }, { id: 'envios', label: 'Meus envios', icon: 'History' }]} />}
    <div className={admin ? '' : 'pt-5'}>
      {aba === 'envios' ? <MeusEnvios /> : <>
        <LoadError error={d.error} retry={d.reload} />
        {d.loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} h={300} />)}</div> :
          !(d.data || []).length ? <Empty icon="Building" title="Nenhum projeto disponível" /> :
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{d.data.map(l => (
            <button key={l.id} onClick={() => ir('/projetos/' + l.id)} className="card overflow-hidden text-left flex flex-col hover:shadow transition-shadow" style={!l.ativo ? { opacity: 0.6 } : {}}>
              <div className="relative" style={{ aspectRatio: '16/9', background: `linear-gradient(135deg, ${l.cor1}, ${l.cor2})` }}>
                <img src={l.capa_url || arteDo(l, 'feed', 540)} alt="" className="w-full h-full object-cover" loading="lazy" />
                {l.fase && <span className="absolute top-3 left-3"><Pill tone={/aprova|pré/i.test(l.fase) ? 'p-amber' : 'p-blue'}>{l.fase}</Pill></span>}
                {!l.ativo && <span className="absolute top-3 right-3"><Pill tone="p-grey" icon="EyeOff">Oculto</Pill></span>}
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="text-[17px] font-medium">{l.nome}</h3>
                <div className="muted text-[13px] flex items-center gap-1"><Icon n="MapPin" size={14} />{l.local}</div>
                {l.resumo && <p className="text-[13.5px] leading-relaxed line-clamp-3">{l.resumo}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-auto pt-2 text-[12.5px]">
                  {l.preco_desde && <span><span className="muted">Preço </span><b className="font-medium">{l.preco_desde}</b></span>}
                  {l.entrega && <span><span className="muted">Entrega </span><b className="font-medium">{l.entrega}</b></span>}
                </div>
              </div>
            </button>
          ))}</div>}
      </>}
    </div>
    <EditorProjeto dados={novo} onClose={() => setNovo(null)} onSaved={id => { setNovo(null); d.reload(); if (id) ir('/projetos/' + id); }} />
  </>;
}

function Projeto({ id }) {
  const { perfil, imob } = useAuth(); const { ir } = useNav();
  const admin = perfil.papel === 'admin';
  const [edit, setEdit] = useState(null); const [aba, setAba] = useState('vender'); const [foto, setFoto] = useState(null);
  const d = useLoad(async () => {
    const [l, c, a, t] = await Promise.all([
      q(supabase.from('lancamentos').select('*').eq('id', id).single()),
      q(supabase.from('copies').select('*').eq('lancamento_id', id)),
      q(supabase.from('abordagens').select('*').eq('lancamento_id', id).eq('status', 'publicada')),
      q(supabase.from('trilhas').select('id,titulo').eq('lancamento_id', id).eq('publicada', true)),
    ]);
    return { l, c, a, t };
  }, [id]);
  useEffect(() => { if (!admin) registrar('abriu_projeto', id); }, [id]);
  if (d.loading && !d.data) return <div className="pt-6"><Skeleton h={360} /></div>;
  if (d.error) return <div className="pt-6"><LoadError error={d.error} retry={d.reload} /></div>;
  const { l, c, a, t } = d.data;
  const kit = l.kit || null;
  const galeria = Array.isArray(l.galeria) ? l.galeria : [];
  const abrir = (tipo, url) => { if (!admin) registrar(tipo, l.id); window.open(url, '_blank', 'noopener'); };
  const assinatura = perfil.nome + (imob ? ' | ' + imob.nome : ' | Corretor parceiro Chaincorp');
  const capa = l.capa_url || galeria[0]?.url;

  return <>
    <div className="pt-5"><button className="btn btn-text btn-sm -ml-2" onClick={() => ir('/projetos')}><Icon n="ArrowLeft" size={16} />Projetos</button></div>
    <section className="card overflow-hidden mt-2">
      <div className="relative" style={{ background: `linear-gradient(135deg, ${l.cor1}, ${l.cor2})`, color: '#fff' }}>
        {capa && <img src={capa} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        {capa && <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,14,22,.86) 0%, rgba(10,14,22,.62) 55%, rgba(10,14,22,.15) 100%)' }} />}
        <div className="relative p-6 sm:p-8 flex flex-col gap-3" style={{ minHeight: 300, maxWidth: 760 }}>
          <div className="flex flex-wrap gap-2">{l.fase && <span className="rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: 'rgba(255,255,255,.2)' }}>{l.fase}</span>}{(l.tags || []).map(x => <span key={x} className="rounded-full px-3 py-1 text-[12px]" style={{ background: 'rgba(255,255,255,.14)' }}>{x}</span>)}</div>
          <h1 className="text-[30px] sm:text-[38px] font-bold leading-tight">{l.nome}</h1>
          <p className="opacity-90 flex items-center gap-1.5"><Icon n="MapPin" size={16} />{l.local}</p>
          {l.resumo && <p className="text-[15px] leading-relaxed opacity-95" style={{ maxWidth: '60ch' }}>{l.resumo}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 text-[14px]">
            {l.preco_desde && <span><span className="opacity-75">Preço </span><b>{l.preco_desde}</b></span>}
            {l.entrega && <span><span className="opacity-75">Entrega </span><b>{l.entrega}</b></span>}
            {l.comissao && <span><span className="opacity-75">Comissão </span><b>{l.comissao}</b></span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {l.drive_url && <button className="btn btn-sm" style={{ background: '#fff', color: '#1F1F1F' }} onClick={() => abrir('abriu_book', l.drive_url)}><Icon n="BookOpen" size={15} />Book e plantas</button>}
            {l.tabela_url && <button className="btn btn-sm" style={{ background: '#fff', color: '#1F1F1F' }} onClick={() => abrir('abriu_tabela', l.tabela_url)}><Icon n="Table" size={15} />Tabela de vendas</button>}
            {l.youtube_url && <button className="btn btn-sm" style={{ background: '#fff', color: '#1F1F1F' }} onClick={() => abrir('abriu_video', l.youtube_url)}><Icon n="PlayCircle" size={15} />Vídeo</button>}
            {admin && <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }} onClick={() => setEdit({ ...l, copies: c })}><Icon n="PenLine" size={15} />Editar projeto</button>}
          </div>
        </div>
      </div>
      {l.aviso && <div className="px-6 py-3 flex items-start gap-2 text-[13.5px]" style={{ background: 'var(--amber-c)', color: 'var(--on-amber-c)' }}><Icon n="AlertTriangle" size={17} className="shrink-0 mt-0.5" /><span>{l.aviso}</span></div>}
    </section>

    <div className="mt-4"><Tabs value={aba} onChange={setAba} tabs={[{ id: 'vender', label: 'Como vender', icon: 'Lightbulb' }, { id: 'kit', label: 'Enviar ao cliente', icon: 'Send' }, { id: 'fotos', label: 'Fotos e materiais', icon: 'Image' }, { id: 'ficha', label: 'Ficha completa', icon: 'FileText' }]} /></div>
    <div className="pt-4">
      {aba === 'vender' && <ComoVender l={l} kit={kit} a={a} t={t} admin={admin} />}
      {aba === 'kit' && (kit?.abordagens?.length ? <KitCompleto l={l} kit={kit} copies={c} assinatura={assinatura} admin={admin} /> : <Kit l={l} copies={c} assinatura={assinatura} admin={admin} />)}
      {aba === 'fotos' && <FotosMateriais l={l} galeria={galeria} admin={admin} abrirFoto={setFoto} />}
      {aba === 'ficha' && <Section>{l.ficha ? <div className="pt-4"><TextoRico texto={l.ficha} /></div> : <p className="muted text-[13px] pt-4">Ficha ainda não cadastrada.</p>}</Section>}
    </div>
    {foto && <Lightbox fotos={galeria} inicio={foto} l={l} admin={admin} onClose={() => setFoto(null)} />}
    <EditorProjeto dados={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); d.reload(); }} />
  </>;
}

function ComoVender({ l, kit, a, t, admin }) {
  const { ir } = useNav();
  const destaques = (l.destaques || '').split('\n').map(s => s.trim()).filter(Boolean);
  const pil = kit?.pilula || {};
  const faq = kit?.faq || [];
  const extras = a.filter(x => !faq.some(f => x.titulo.includes(f.pergunta)));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 flex flex-col gap-4">
        {(pil.tese || pil.publico || pil.gatilho) && <Section title="Pílula de argumentação" icon="Sparkles">
          <div className="flex flex-col gap-4">
            {[['tese', 'A tese do imóvel', 'Lightbulb'], ['publico', 'Para quem vender', 'Users'], ['gatilho', 'Gatilho de urgência', 'Timer']].filter(([k]) => pil[k]).map(([k, tt, ic]) => (
              <div key={k} className="flex gap-3"><span className="avatar p-blue shrink-0" style={{ width: 32, height: 32 }}><Icon n={ic} size={16} /></span><div><div className="font-medium text-[14px]">{tt}</div><p className="text-[14.5px] leading-relaxed mt-0.5 whitespace-pre-line">{pil[k]}</p></div></div>
            ))}
          </div>
        </Section>}
        {kit?.numeros?.length > 0 ? <Section title="Números para ter na ponta da língua" icon="ListChecks">
          <ul className="flex flex-col gap-2.5">{kit.numeros.map(([k, v], i) => <li key={i} className="text-[14.5px] leading-relaxed">{k && <b className="font-medium">{k}: </b>}{v}</li>)}</ul>
        </Section> : <Section title="Argumentos principais" icon="Sparkles">
          {!destaques.length ? <p className="muted text-[13px]">{admin ? 'Adicione os argumentos em Editar projeto.' : 'Em breve.'}</p> :
            <ol className="flex flex-col gap-3">{destaques.map((x, i) => <li key={i} className="flex gap-3"><span className="avatar p-blue shrink-0" style={{ width: 26, height: 26, fontSize: 12 }}>{i + 1}</span><span className="text-[15px] leading-relaxed">{x}</span></li>)}</ol>}
        </Section>}
        {(kit?.regras || []).map((r, i) => <Section key={i} title={r.titulo} icon="ShieldCheck">
          {r.tabela && <div className="overflow-x-auto mb-3"><table className="tbl" style={{ minWidth: 420 }}><thead><tr>{r.tabela[0].map((h, j) => <th key={j} className={j === 0 ? 'pl-3' : ''}>{h}</th>)}</tr></thead><tbody>{r.tabela.slice(1).map((row, j) => <tr key={j}>{row.map((cel, k) => <td key={k} className={k === 0 ? 'pl-3 font-medium' : 'num'}>{cel}</td>)}</tr>)}</tbody></table></div>}
          <ul className="flex flex-col gap-2">{r.itens.map((x, j) => <li key={j} className="flex gap-2 text-[14.5px] leading-relaxed"><Icon n="Check" size={16} className="shrink-0 mt-1" style={{ color: 'var(--green)' }} /><span>{x}</span></li>)}</ul>
        </Section>)}
        {kit?.boas_praticas?.length > 0 && <Section title="Boas práticas" icon="BadgeCheck">
          <ul className="flex flex-col gap-2">{kit.boas_praticas.map((x, j) => <li key={j} className="flex gap-2 text-[14.5px] leading-relaxed"><Icon n="Dot" size={18} className="shrink-0" /><span>{x}</span></li>)}</ul>
        </Section>}
      </div>
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Section title="Perguntas do cliente" icon="MessageSquareQuote">
          {!faq.length && !extras.length ? <p className="muted text-[13px]">Veja as respostas gerais em Argumentos.</p> :
            <ul className="flex flex-col gap-3">
              {faq.map((f, i) => <ArgumentoCurto key={'f' + i} a={{ titulo: '“' + f.pergunta + '”', texto: f.resposta }} lancamento={l.id} />)}
              {extras.map(x => <ArgumentoCurto key={x.id} a={x} lancamento={l.id} />)}
            </ul>}
          <button className="btn btn-text btn-sm mt-2 -ml-2" onClick={() => ir('/argumentos')}>Todos os argumentos</button>
        </Section>
        {t.length > 0 && <Section title="Treinamento do projeto" icon="GraduationCap">
          {t.map(x => <button key={x.id} className="menu-item rounded-lg -mx-2" onClick={() => ir('/treinamento/' + x.id)}><Icon n="PlayCircle" size={18} className="muted" /><span className="flex-1">{x.titulo}</span><Icon n="ChevronRight" size={16} className="muted" /></button>)}
        </Section>}
      </div>
    </div>
  );
}

function ArgumentoCurto({ a, lancamento }) {
  const [aberto, setAberto] = useState(false); const toast = useToast();
  const copiar = async () => { registrar('usou_argumento', lancamento, a.titulo); toast(await copiarTexto(a.texto) ? 'Resposta copiada.' : 'Selecione o texto para copiar.', 'ok'); };
  return (
    <li className="soft rounded-xl">
      <button className="w-full text-left px-3.5 py-3 flex items-center gap-2 font-medium text-[14px]" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        <span className="flex-1">{a.titulo}</span><Icon n={aberto ? 'ChevronUp' : 'ChevronDown'} size={16} className="muted" />
      </button>
      {aberto && <div className="px-3.5 pb-3"><p className="text-[14px] leading-relaxed whitespace-pre-wrap">{a.texto}</p><button className="btn btn-text btn-sm mt-1 -ml-2" onClick={copiar}><Icon n="Copy" size={14} />Copiar</button></div>}
    </li>
  );
}

// Troca os campos entre colchetes do kit pelos dados do envio
const preencher = (t, v) => (t || '')
  .replace(/\[Nome do Cliente\]/gi, v.cliente || '[Nome do Cliente]')
  .replace(/\[Nome do Corretor\]/gi, v.corretor || '[Nome do Corretor]');
const pendentes = t => [...new Set((t.match(/\[[^\]]+\]/g) || []))];

function KitCompleto({ l, kit, copies, assinatura, admin }) {
  const toast = useToast(); const { pelaImob } = useNav(); const { perfil } = useAuth();
  const [op, setOp] = useState(kit.abordagens[0].tese); const [cliente, setCliente] = useState(''); const [texto, setTexto] = useState(''); const [busy, setBusy] = useState(false);
  const ab = kit.abordagens.find(x => x.tese === op) || kit.abordagens[0];
  const base = copies.find(c => c.tese === op)?.texto || (ab.texto + '\n\n👉 Conheça o projeto: {link}');
  useEffect(() => { setTexto(preencher(base, { cliente: cliente.trim(), corretor: perfil.nome })); }, [op, base]);
  useEffect(() => { setTexto(t => t.replace(/\[Nome do Cliente\]/gi, cliente.trim() || '[Nome do Cliente]')); }, [cliente]);
  const faltam = pendentes(texto);
  const imgs = kit.cards_img?.[op] || {};
  const final = link => fill(texto, { nome: l.nome, local: l.local, fase: l.fase, link, corretor: assinatura });
  const gerarLink = async () => window.location.origin + '/p/' + await rpc('criar_disparo', { p_lancamento: l.id, p_tese: op, p_pela_imobiliaria: pelaImob });
  const conferir = () => { if (faltam.length) { toast('Complete antes: ' + faltam.join(', '), 'erro'); return false; } return true; };
  const disparar = async () => {
    if (!conferir()) return;
    const win = window.open('', '_blank'); setBusy(true);
    try { const url = abrirWhatsApp(final(await gerarLink())); if (win) win.location.href = url; else window.location.href = url; toast('Pronto no WhatsApp. Envie o texto e, em seguida, o card.', 'ok'); }
    catch (e) { win?.close(); toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const copiar = async () => {
    if (!conferir()) return; setBusy(true);
    try { if (!admin) registrar('copiou_texto', l.id, op); toast(await copiarTexto(final(await gerarLink())) ? 'Texto com link rastreável copiado.' : 'Não foi possível copiar.', 'ok'); }
    catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const baixar = fmt => { if (!admin) registrar('baixou_arte', l.id, fmt); baixarArquivo(imgs[fmt], l.id + '-' + op + '-' + (fmt === 'feed' ? '1x1' : '9x16') + '.jpg'); };
  const copiarSimples = async (tx, rotulo) => { if (!admin) registrar('copiou_texto', l.id, rotulo); toast(await copiarTexto(preencher(tx, { cliente: cliente.trim(), corretor: perfil.nome })) ? 'Mensagem copiada.' : 'Não foi possível copiar.', 'ok'); };

  return <div className="flex flex-col gap-4">
    <Section title="1. Escolha a abordagem pelo perfil do cliente" icon="Users">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">{kit.abordagens.map(x => {
        const m = (kit.mapa || []).find(r => r[2] === 'Opção ' + x.opcao);
        return <button key={x.tese} onClick={() => setOp(x.tese)} className="text-left rounded-xl p-3.5 line" aria-pressed={op === x.tese} style={op === x.tese ? { borderColor: 'var(--blue)', background: 'var(--blue-c, #E8F0FE)' } : {}}>
          <div className="text-[12px] muted">Opção {x.opcao}</div><div className="font-medium">{x.titulo}</div>
          <div className="text-[12.5px] muted mt-1 leading-snug">{m ? m[1] : x.quando}</div>
        </button>;
      })}</div>
      {ab.quando && <p className="text-[13px] mt-3"><b className="font-medium">Quando usar:</b> {ab.quando}</p>}
    </Section>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <Section title="2. Personalize e envie o texto" icon="MessageCircle" className="lg:col-span-3">
        <Field label="Nome do cliente"><input id="kit-cliente" className="input" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ex.: Ana" /></Field>
        <div className="mt-3"><Field label="Mensagem" hint="O link exclusivo do cliente entra no lugar de {link} na hora do envio."><textarea id="kit-texto" className="input" rows={14} value={texto} onChange={e => setTexto(e.target.value)} style={{ fontSize: 14, lineHeight: 1.5 }} /></Field></div>
        {faltam.length > 0 && <div className="mt-2 rounded-lg px-3 py-2 text-[13px] flex gap-2" style={{ background: 'var(--amber-c)', color: 'var(--on-amber-c)' }}><Icon n="AlertTriangle" size={16} className="shrink-0 mt-0.5" /><span>Troque antes de enviar: {faltam.join(', ')}</span></div>}
        <div className="flex gap-2 mt-4">
          <button className="btn btn-green flex-1" style={{ minHeight: 46 }} onClick={disparar} disabled={busy}>{busy ? <Spinner /> : <Icon n="MessageCircle" size={18} />}Enviar no WhatsApp</button>
          <button className="btn btn-outline" style={{ minHeight: 46 }} onClick={copiar} disabled={busy}><Icon n="Copy" size={17} />Copiar</button>
        </div>
        <p className="muted text-[12px] mt-2">Quando o cliente abrir o link, você vê em Projetos › Meus envios.</p>
      </Section>
      <Section title="3. Mande o card logo depois" icon="Image" className="lg:col-span-2">
        <p className="muted text-[13px] mb-3">{ab.card || 'Card correspondente'}. Publique o 9:16 no seu Status no mesmo dia.</p>
        <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
          <button onClick={() => baixar('feed')} className="block"><img src={imgs.feed} alt={'Card 1:1 do ' + l.nome} className="rounded-lg shadow w-full" /></button>
          <button onClick={() => baixar('stories')} className="block" style={{ width: 92 }}><img src={imgs.stories} alt={'Card 9:16 do ' + l.nome} className="rounded-lg shadow w-full" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button className="btn btn-tonal" onClick={() => baixar('feed')}><Icon n="Download" size={16} />Conversa 1:1</button>
          <button className="btn btn-tonal" onClick={() => baixar('stories')}><Icon n="Download" size={16} />Status 9:16</button>
        </div>
      </Section>
    </div>
    {kit.continuidade?.length > 0 && <Section title="4. Mensagens de continuidade" icon="History">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{kit.continuidade.map((m, i) => <div key={i} className="soft rounded-xl p-3.5 flex flex-col">
        <div className="font-medium text-[13.5px]">{m.titulo}</div>
        <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap mt-1.5 flex-1">{preencher(m.texto, { cliente: cliente.trim(), corretor: perfil.nome })}</p>
        <button className="btn btn-text btn-sm mt-2 -ml-2 self-start" onClick={() => copiarSimples(m.texto, 'continuidade')}><Icon n="Copy" size={14} />Copiar</button>
      </div>)}</div>
    </Section>}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {(kit.antes?.length > 0 || kit.passos?.length > 0) && <Section title="Roteiro de uso" icon="ListChecks">
        {kit.antes?.length > 0 && <><div className="eyebrow mb-2">Antes de enviar</div><ul className="flex flex-col gap-2 mb-4">{kit.antes.map((x, i) => <li key={i} className="flex gap-2 text-[14px] leading-relaxed"><Icon n="Check" size={16} className="shrink-0 mt-1" style={{ color: 'var(--green)' }} /><span>{x}</span></li>)}</ul></>}
        {kit.passos?.length > 0 && <><div className="eyebrow mb-2">Primeiro contato</div><ol className="flex flex-col gap-2">{kit.passos.map((x, i) => <li key={i} className="flex gap-3 text-[14px] leading-relaxed"><span className="avatar p-blue shrink-0" style={{ width: 24, height: 24, fontSize: 12 }}>{i + 1}</span><span>{x}</span></li>)}</ol></>}
      </Section>}
      {kit.cadencia?.length > 0 && <Section title="Cadência sugerida" icon="Clock" pad={false}>
        <div className="overflow-x-auto"><table className="tbl" style={{ minWidth: 460 }}><thead><tr><th className="pl-5">Quando</th><th>O que fazer</th><th className="pr-5">Material</th></tr></thead>
          <tbody>{kit.cadencia.map((r, i) => <tr key={i}><td className="pl-5 font-medium whitespace-nowrap">{r[0]}</td><td>{r[1]}</td><td className="pr-5 muted">{r[2]}</td></tr>)}</tbody></table></div>
        {kit.dicas?.length > 0 && <div className="px-5 py-4 flex flex-col gap-2">{kit.dicas.map((x, i) => { const [k, ...v] = x.split(': '); return <p key={i} className="text-[13.5px] leading-relaxed">{v.length ? <><b className="font-medium">{k}:</b> {v.join(': ')}</> : x}</p>; })}</div>}
      </Section>}
    </div>
    {l.guia_url && <div className="flex justify-end"><button className="btn btn-outline" onClick={() => { if (!admin) registrar('baixou_arte', l.id, 'guia do kit'); baixarArquivo(l.guia_url, 'Kit completo ' + l.nome + '.pdf'); }}><Icon n="FileDown" size={17} />Baixar o guia completo do kit (PDF)</button></div>}
  </div>;
}

function FotosMateriais({ l, galeria, admin, abrirFoto }) {
  const baixar = (url, nome, det) => { if (!admin) registrar('baixou_arte', l.id, det); baixarArquivo(url, nome); };
  const cards = l.kit?.cards_img || {};
  return <div className="flex flex-col gap-4">
    <Section title="Fotos do projeto" icon="Image">
      {!galeria.length ? <p className="muted text-[13px]">Fotos em breve.</p> :
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{galeria.map((f, i) => (
          <figure key={i} className="flex flex-col gap-1.5">
            <button onClick={() => abrirFoto(i + 1)} className="block rounded-xl overflow-hidden" style={{ aspectRatio: '4/3' }}><img src={f.url} alt={f.legenda} loading="lazy" className="w-full h-full object-cover hover:scale-[1.03] transition-transform" /></button>
            <figcaption className="flex items-center gap-2 text-[13px]"><span className="flex-1 min-w-0 truncate">{f.legenda}</span><button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => baixar(f.url, l.id + '-' + (i + 1) + '.jpg', 'foto')} aria-label={'Baixar ' + f.legenda}><Icon n="Download" size={15} /></button></figcaption>
          </figure>
        ))}</div>}
    </Section>
    {Object.keys(cards).length > 0 && <Section title="Cards de WhatsApp" icon="MessageCircle">
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">{['investimento', 'moradia', 'escassez'].flatMap(t => ['feed', 'stories'].map(fm => cards[t]?.[fm] && (
        <button key={t + fm} onClick={() => baixar(cards[t][fm], l.id + '-' + t + '-' + (fm === 'feed' ? '1x1' : '9x16') + '.jpg', fm)} className="flex flex-col gap-1 text-left">
          <img src={cards[t][fm]} alt="" loading="lazy" className="rounded-lg shadow w-full" style={{ aspectRatio: fm === 'feed' ? '1/1' : '9/16', objectFit: 'cover' }} />
          <span className="text-[12px] muted">{TESES.find(x => x.id === t)?.label} · {fm === 'feed' ? '1:1' : '9:16'}</span>
        </button>)))}</div>
    </Section>}
    <Section title="Materiais para download" icon="FileDown">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {l.lamina_url && <button className="soft rounded-xl p-3.5 flex items-center gap-3 text-left" onClick={() => baixar(l.lamina_url, 'Lamina ' + l.nome + '.jpg', 'lâmina')}><img src={l.lamina_url} alt="" className="rounded" style={{ width: 44, height: 56, objectFit: 'cover' }} /><span className="flex-1"><b className="font-medium block">Lâmina do projeto</b><span className="muted text-[12.5px]">Resumo em uma página para enviar ao cliente</span></span><Icon n="Download" size={18} /></button>}
        {l.guia_url && <button className="soft rounded-xl p-3.5 flex items-center gap-3 text-left" onClick={() => baixar(l.guia_url, 'Kit completo ' + l.nome + '.pdf', 'guia do kit')}><span className="avatar p-red" style={{ width: 44, height: 44, borderRadius: 10 }}><Icon n="FileText" size={20} /></span><span className="flex-1"><b className="font-medium block">Guia completo do kit (PDF)</b><span className="muted text-[12.5px]">Textos, roteiro, cadência e respostas</span></span><Icon n="Download" size={18} /></button>}
        {l.drive_url && <a className="soft rounded-xl p-3.5 flex items-center gap-3" href={l.drive_url} target="_blank" rel="noopener" onClick={() => !admin && registrar('abriu_book', l.id)}><span className="avatar p-blue" style={{ width: 44, height: 44, borderRadius: 10 }}><Icon n="BookOpen" size={20} /></span><span className="flex-1"><b className="font-medium block">Book e plantas</b><span className="muted text-[12.5px]">Pasta completa do projeto</span></span><Icon n="ArrowRight" size={18} /></a>}
        {l.tabela_url && <a className="soft rounded-xl p-3.5 flex items-center gap-3" href={l.tabela_url} target="_blank" rel="noopener" onClick={() => !admin && registrar('abriu_tabela', l.id)}><span className="avatar p-green" style={{ width: 44, height: 44, borderRadius: 10 }}><Icon n="Table" size={20} /></span><span className="flex-1"><b className="font-medium block">Tabela de vendas</b><span className="muted text-[12.5px]">Confirme a vigência com a coordenação</span></span><Icon n="ArrowRight" size={18} /></a>}
      </div>
    </Section>
  </div>;
}

function Lightbox({ fotos, inicio, l, admin, onClose }) {
  const [i, setI] = useState(inicio - 1);
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI(x => (x + 1) % fotos.length); if (e.key === 'ArrowLeft') setI(x => (x - 1 + fotos.length) % fotos.length); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [fotos.length]);
  const f = fotos[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,.92)' }} onClick={onClose}>
      <div className="flex items-center gap-2 p-3 text-white" onClick={e => e.stopPropagation()}>
        <span className="flex-1 text-[14px]">{f.legenda} <span className="opacity-60">· {i + 1} de {fotos.length}</span></span>
        <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }} onClick={() => { if (!admin) registrar('baixou_arte', l.id, 'foto'); baixarArquivo(f.url, l.id + '-' + (i + 1) + '.jpg'); }}><Icon n="Download" size={15} />Baixar</button>
        <button className="icon-btn" style={{ color: '#fff' }} onClick={onClose} aria-label="Fechar"><Icon n="X" size={22} /></button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center gap-2 px-2 pb-4">
        <button className="icon-btn shrink-0" style={{ color: '#fff' }} onClick={e => { e.stopPropagation(); setI((i - 1 + fotos.length) % fotos.length); }} aria-label="Anterior"><Icon n="ArrowLeft" size={24} /></button>
        <img src={f.url} alt={f.legenda} className="max-h-full max-w-full object-contain rounded" onClick={e => e.stopPropagation()} />
        <button className="icon-btn shrink-0" style={{ color: '#fff' }} onClick={e => { e.stopPropagation(); setI((i + 1) % fotos.length); }} aria-label="Próxima"><Icon n="ArrowRight" size={24} /></button>
      </div>
    </div>
  );
}

// Envio simples para projetos novos que ainda não têm kit completo
function Kit({ l, copies, assinatura, admin }) {
  const toast = useToast(); const { pelaImob } = useNav();
  const [fmt, setFmt] = useState('feed'); const [tese, setTese] = useState('investimento'); const [busy, setBusy] = useState(false);
  const base = copies.find(c => c.tese === tese)?.texto || '';
  const texto = link => fill(base, { nome: l.nome, local: l.local, fase: l.fase, link, corretor: assinatura });
  const preRef = useRef(null);
  const gerarLink = async () => window.location.origin + '/p/' + await rpc('criar_disparo', { p_lancamento: l.id, p_tese: tese, p_pela_imobiliaria: pelaImob });
  const disparar = async () => {
    const win = window.open('', '_blank'); setBusy(true);
    try { const url = abrirWhatsApp(texto(await gerarLink())); if (win) win.location.href = url; else window.location.href = url; toast('Pronto no WhatsApp. Escolha o contato e envie.', 'ok'); }
    catch (e) { win?.close(); toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const copiar = async () => {
    setBusy(true);
    try {
      const t = texto(await gerarLink());
      if (await copiarTexto(t)) toast('Texto com link rastreável copiado.', 'ok');
      else { preRef.current.textContent = t; const r = document.createRange(); r.selectNodeContents(preRef.current); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texto selecionado. Use Copiar do seu aparelho.'); }
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const baixar = () => { if (!admin) registrar('baixou_arte', l.id, fmt); baixarArquivo(arteDo(l, fmt, 1080), l.id + '-' + (fmt === 'feed' ? '1x1' : '9x16') + '.jpg'); };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="1. Escolha a abordagem" icon="MessageCircle">
        <div className="flex flex-wrap gap-1.5 mb-3">{TESES.map(t => <button key={t.id} className="chip" aria-pressed={tese === t.id} onClick={() => setTese(t.id)}><Icon n={t.icon} size={15} />{t.label}</button>)}</div>
        <div className="wa" ref={preRef}>{texto('[link exclusivo do seu cliente]')}</div>
        <p className="muted text-[12px] mt-2">O link é criado no envio. Quando o cliente abrir, você vê em Meus envios.</p>
        <div className="flex gap-2 mt-4">
          <button className="btn btn-green flex-1" style={{ minHeight: 46 }} onClick={disparar} disabled={busy || !base}>{busy ? <Spinner /> : <Icon n="MessageCircle" size={18} />}Enviar no WhatsApp</button>
          <button className="btn btn-outline" style={{ minHeight: 46 }} onClick={copiar} disabled={busy || !base}><Icon n="Copy" size={17} />Copiar</button>
        </div>
      </Section>
      <Section title="2. Mande a arte junto" icon="Image" action={!temArteOficial(l, fmt) && <Pill tone="p-amber">Arte provisória</Pill>}>
        <div className="flex gap-1 mb-3">{[['feed', 'Feed 1:1'], ['stories', 'Status 9:16']].map(([k, v]) => <button key={k} className="chip" aria-pressed={fmt === k} onClick={() => setFmt(k)}>{v}</button>)}</div>
        <div className="soft rounded-xl p-3 flex justify-center"><img src={arteDo(l, fmt, 540)} alt={'Arte do ' + l.nome} className="rounded-lg shadow" style={{ maxHeight: 300, maxWidth: '100%' }} /></div>
        <button className="btn btn-tonal w-full mt-3" onClick={baixar}><Icon n="Download" size={17} />Baixar JPEG</button>
      </Section>
    </div>
  );
}

function MeusEnvios() {
  const { perfil } = useAuth();
  const d = useLoad(async () => {
    const links = await q(supabase.from('links').select('token, tese, criado_em, lancamentos(nome)').eq('corretor_id', perfil.id).order('criado_em', { ascending: false }).limit(200));
    const tokens = links.map(l => l.token);
    const acessos = tokens.length ? await q(supabase.from('acessos').select('token, criado_em').in('token', tokens)) : [];
    return links.map(l => { const a = acessos.filter(x => x.token === l.token); return { ...l, acessos: a.length, ultimo: a.map(x => x.criado_em).sort().slice(-1)[0] }; });
  }, []);
  useEffect(() => { const ch = supabase.channel('envios-' + perfil.id).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'acessos' }, () => d.reload()).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  const lista = d.data || []; const abertos = lista.filter(l => l.acessos > 0).length;
  return <>
    <LoadError error={d.error} retry={d.reload} />
    <div className="grid grid-cols-3 gap-3 mb-4">
      {[['Envios', lista.length], ['Clientes que abriram', abertos], ['Taxa de abertura', (lista.length ? Math.round(abertos / lista.length * 100) : 0) + '%']].map(([k, v]) => <div key={k} className="card p-4"><div className="muted text-[12px]">{k}</div><div className="num text-[24px] font-medium">{typeof v === 'number' ? nf(v) : v}</div></div>)}
    </div>
    <Section pad={false}>
      {d.loading ? <div className="p-5"><Skeleton h={120} /></div> : !lista.length ? <Empty icon="Send" title="Nenhum envio ainda">Abra um projeto e use Enviar no WhatsApp.</Empty> :
        <ul>{lista.map(l => <li key={l.token} className="flex flex-wrap items-center gap-3 px-5 py-3 line-b last:border-0">
          <span className="flex-1 min-w-[180px]"><span className="block font-medium">{l.lancamentos?.nome}</span><span className="muted text-[12px]">{dataHoraBR(l.criado_em)} · {l.tese}</span></span>
          {l.acessos > 0 ? <Pill tone="p-green" icon="Eye">Abriu {l.acessos > 1 ? l.acessos + ' vezes' : ''} · {relativo(l.ultimo)}</Pill> : <Pill>Não abriu ainda</Pill>}
        </li>)}</ul>}
    </Section>
    {lista.some(l => l.acessos > 0) && <p className="muted text-[12px] mt-3">Abriu e não respondeu? Faça o follow-up em até 48 horas. Há um roteiro pronto em Argumentos.</p>}
  </>;
}

// ------------------------------------------------------------------ edição (administrador)
function EditorProjeto({ dados, onClose, onSaved }) {
  const toast = useToast(); const [f, setF] = useState(dados); const [busy, setBusy] = useState(false); const [subindo, setSubindo] = useState(''); const [tese, setTese] = useState('investimento');
  useEffect(() => { if (dados) setF({ ...dados, textos: Object.fromEntries(TESES.map(t => [t.id, (dados.copies || []).find(c => c.tese === t.id)?.texto || (dados.novo ? TEXTO_PADRAO[t.id] : '')])) }); else setF(null); }, [dados]);
  if (!dados || !f) return null;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const id = f.id || (f.nome || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const subir = async (campo, file) => {
    if (!file) return;
    if (!/image\/(jpe?g|png|webp)/.test(file.type)) return toast('Envie uma imagem JPEG, PNG ou WebP.', 'erro');
    if (!id) return toast('Preencha o nome antes de enviar a arte.', 'erro');
    setSubindo(campo);
    try {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg';
      const path = id + '/' + (campo === 'arte_feed_url' ? 'feed' : 'stories') + '-' + Date.now() + '.' + ext;
      const { error } = await supabase.storage.from('criativos').upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw error;
      set(campo, supabase.storage.from('criativos').getPublicUrl(path).data.publicUrl);
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setSubindo(''); }
  };
  const salvar = async () => {
    setBusy(true);
    try {
      const campos = ['nome', 'local', 'fase', 'resumo', 'destaques', 'ficha', 'entrega', 'preco_desde', 'comissao', 'aviso', 'cor1', 'cor2', 'arte_feed_url', 'arte_stories_url', 'drive_url', 'tabela_url', 'youtube_url', 'ordem', 'ativo'];
      const reg = Object.fromEntries(campos.map(k => [k, f[k] === '' || f[k] === undefined ? null : f[k]]));
      reg.nome = f.nome.trim(); reg.ordem = Number(f.ordem) || 100; reg.ativo = !!f.ativo; reg.cor1 = f.cor1 || '#0B3D91'; reg.cor2 = f.cor2 || '#1A73E8';
      reg.tags = (typeof f.tags === 'string' ? f.tags.split(',') : f.tags || []).map(t => t.trim()).filter(Boolean);
      reg.atualizado_em = new Date().toISOString();
      if (f.novo) await q(supabase.from('lancamentos').insert({ id, ...reg })); else await q(supabase.from('lancamentos').update(reg).eq('id', f.id));
      const textos = TESES.map(t => ({ lancamento_id: id, tese: t.id, texto: f.textos[t.id] || '' })).filter(x => x.texto.trim());
      if (textos.length) await q(supabase.from('copies').upsert(textos));
      toast('Projeto salvo. Os parceiros já veem a nova versão.', 'ok'); onSaved(f.novo ? id : null);
    } catch (e) { toast(/duplicate|unique/i.test(e.message) ? 'Já existe um projeto com este nome.' : errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const Upload = ({ campo, label, formato }) => (
    <div className="soft rounded-xl p-3 flex items-center gap-3">
      <img src={arteDo({ ...f, id: id || 'novo' }, formato, 120)} alt="" className="rounded-md" style={{ width: formato === 'feed' ? 48 : 34, height: 48, objectFit: 'cover' }} />
      <div className="flex-1 min-w-0"><div className="font-medium text-[14px]">{label}</div><div className="muted text-[12px]">{temArteOficial(f, formato) ? 'Arte oficial enviada' : 'Usando arte provisória'}</div></div>
      <label className="btn btn-outline btn-sm cursor-pointer">{subindo === campo ? <Spinner size={15} /> : <Icon n="Upload" size={15} />}Enviar<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => subir(campo, e.target.files?.[0])} /></label>
      {f[campo] && <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => set(campo, null)} aria-label="Remover arte"><Icon n="Trash2" size={16} /></button>}
    </div>
  );
  return (
    <Modal open onClose={onClose} title={f.novo ? 'Novo projeto' : 'Editar · ' + dados.nome} width={780}
      footer={<><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={!f.nome?.trim() || busy || !!subindo} onClick={salvar}>{busy ? <Spinner /> : 'Salvar'}</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 eyebrow pt-1">Apresentação</div>
        <Field label="Nome"><input id="pj-nome" className="input" value={f.nome || ''} onChange={e => set('nome', e.target.value)} /></Field>
        <Field label="Localização"><input id="pj-local" className="input" value={f.local || ''} onChange={e => set('local', e.target.value)} /></Field>
        <div className="sm:col-span-2"><Field label="Resumo em uma frase"><textarea id="pj-resumo" className="input" rows={2} value={f.resumo || ''} onChange={e => set('resumo', e.target.value)} /></Field></div>
        <Field label="Fase"><input id="pj-fase" className="input" value={f.fase || ''} onChange={e => set('fase', e.target.value)} /></Field>
        <Field label="Etiquetas" hint="Separe por vírgula. Ex.: HIS-2, R2V"><input id="pj-tags" className="input" value={Array.isArray(f.tags) ? f.tags.join(', ') : f.tags || ''} onChange={e => set('tags', e.target.value)} /></Field>
        <Field label="Preço"><input id="pj-preco" className="input" value={f.preco_desde || ''} onChange={e => set('preco_desde', e.target.value)} placeholder="a partir de R$ 337 mil" /></Field>
        <Field label="Entrega"><input id="pj-entrega" className="input" value={f.entrega || ''} onChange={e => set('entrega', e.target.value)} placeholder="Abril/2029" /></Field>
        <Field label="Comissão"><input id="pj-comissao" className="input" value={f.comissao || ''} onChange={e => set('comissao', e.target.value)} placeholder="PF 2% · PJ 4%" /></Field>
        <Field label="Aviso importante (opcional)"><input id="pj-aviso" className="input" value={f.aviso || ''} onChange={e => set('aviso', e.target.value)} placeholder="Ex.: em aprovação, ainda não comercializável" /></Field>

        <div className="sm:col-span-2 eyebrow pt-3">Como vender</div>
        <div className="sm:col-span-2"><Field label="Argumentos principais" hint="Um argumento por linha"><textarea id="pj-dest" className="input" rows={6} value={f.destaques || ''} onChange={e => set('destaques', e.target.value)} /></Field></div>
        <div className="sm:col-span-2"><Field label="Ficha completa" hint="Use ## para títulos e - para listas"><textarea id="pj-ficha" className="input mono" style={{ fontSize: 12.5 }} rows={10} value={f.ficha || ''} onChange={e => set('ficha', e.target.value)} /></Field></div>

        <div className="sm:col-span-2 eyebrow pt-3">Materiais</div>
        <div className="sm:col-span-2"><Field label="Book e plantas (pasta do Google Drive)"><input id="pj-drive" className="input" value={f.drive_url || ''} onChange={e => set('drive_url', e.target.value)} placeholder="https://drive.google.com/..." /></Field></div>
        <Field label="Tabela de vendas (link)"><input id="pj-tabela" className="input" value={f.tabela_url || ''} onChange={e => set('tabela_url', e.target.value)} /></Field>
        <Field label="Vídeo (YouTube)"><input id="pj-yt" className="input" value={f.youtube_url || ''} onChange={e => set('youtube_url', e.target.value)} /></Field>
        <div className="sm:col-span-2 grid gap-2"><Upload campo="arte_feed_url" label="Arte Feed 1:1" formato="feed" /><Upload campo="arte_stories_url" label="Arte Status 9:16" formato="stories" /></div>

        <div className="sm:col-span-2 eyebrow pt-3">Textos de WhatsApp</div>
        <div className="sm:col-span-2 flex flex-wrap gap-1.5">{TESES.map(t => <button key={t.id} type="button" className="chip" aria-pressed={tese === t.id} onClick={() => setTese(t.id)}>{t.label}</button>)}</div>
        <div className="sm:col-span-2"><Field label={'Texto · ' + TESES.find(t => t.id === tese).label} hint="Variáveis: {nome} {local} {fase} {link} {corretor}. Sem {link} o envio não é rastreado."><textarea id="pj-texto" className="input" rows={7} value={f.textos[tese]} onChange={e => set('textos', { ...f.textos, [tese]: e.target.value })} /></Field></div>

        <div className="sm:col-span-2 eyebrow pt-3">Exibição</div>
        <Field label="Cores da arte provisória"><div className="flex gap-2"><input id="pj-cor1" type="color" value={f.cor1 || '#0B3D91'} onChange={e => set('cor1', e.target.value)} className="h-11 w-16 rounded-lg" /><input id="pj-cor2" type="color" value={f.cor2 || '#1A73E8'} onChange={e => set('cor2', e.target.value)} className="h-11 w-16 rounded-lg" /></div></Field>
        <Field label="Ordem na lista"><input id="pj-ordem" className="input num" type="number" value={f.ordem || 100} onChange={e => set('ordem', e.target.value)} /></Field>
        <div className="sm:col-span-2 flex items-center gap-3 soft rounded-xl p-3"><Switch on={f.ativo} onChange={v => set('ativo', v)} label="Visível" /><span><b className="font-medium">Visível para os parceiros</b><span className="muted text-[13px] block">Desligue para tirar o projeto da lista.</span></span></div>
      </div>
    </Modal>
  );
}

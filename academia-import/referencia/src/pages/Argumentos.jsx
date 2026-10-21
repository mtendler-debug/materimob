import React, { useEffect, useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, PageHead, Section, Pill, Empty, Modal, Field, Choice, useLoad, LoadError, useToast, Skeleton } from '../ui.jsx';
import { ETAPAS_VENDA, errMsg, copiarTexto, abrirWhatsApp } from '../lib/util.js';
import { registrar } from './Projetos.jsx';

const EDITORES = ['admin'];

export default function Argumentos() {
  const { params } = useNav();
  return <>
    <PageHead eyebrow="Argumentos de venda" title="O que dizer em cada momento da venda" sub="Primeira mensagem, qualificação, apresentação, respostas às objeções e fechamento. Copie ou envie direto no WhatsApp." />
    <Biblioteca etapaInicial={params.get('etapa')} buscaInicial={params.get('busca')} />
  </>;
}

function Biblioteca({ etapaInicial, buscaInicial }) {
  const { perfil } = useAuth(); const toast = useToast();
  const editor = EDITORES.includes(perfil.papel);
  const [etapa, setEtapa] = useState(etapaInicial || 'todas'); const [busca, setBusca] = useState(buscaInicial || ''); const [projeto, setProjeto] = useState('todos');
  const [edit, setEdit] = useState(null);
  const d = useLoad(() => q(supabase.from('abordagens').select('*, lancamentos(nome)').neq('status', 'arquivada').order('usos', { ascending: false })), []);
  useEffect(() => { if (etapaInicial) setEtapa(etapaInicial); }, [etapaInicial]);
  const projetos = [...new Map((d.data || []).filter(a => a.lancamento_id).map(a => [a.lancamento_id, a.lancamentos?.nome])).entries()];
  const lista = (d.data || []).filter(a => (etapa === 'todas' || a.etapa === etapa) && (projeto === 'todos' || (projeto === 'gerais' ? !a.lancamento_id : a.lancamento_id === projeto)) && (!busca || (a.titulo + ' ' + a.texto).toLowerCase().includes(busca.toLowerCase())));
  const sugeridas = (d.data || []).filter(a => a.status === 'sugerida');
  const usar = async (a, modo) => {
    supabase.rpc('contar_uso_abordagem', { p_id: a.id }); registrar('usou_argumento', a.lancamento_id, a.titulo);
    if (modo === 'wa') { window.open(abrirWhatsApp(a.texto), '_blank', 'noopener'); return; }
    toast(await copiarTexto(a.texto) ? 'Texto copiado. Ajuste os campos entre colchetes antes de enviar.' : 'Não foi possível copiar. Selecione o texto manualmente.', 'ok');
  };
  const decidir = async (a, status) => { try { await q(supabase.from('abordagens').update({ status }).eq('id', a.id)); toast(status === 'publicada' ? 'Sugestão publicada para toda a rede.' : 'Sugestão arquivada.', 'ok'); d.reload(); } catch (e) { toast(errMsg(e), 'erro'); } };
  return <>
    <LoadError error={d.error} retry={d.reload} />
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button className="chip" aria-pressed={etapa === 'todas'} onClick={() => setEtapa('todas')}>Todas</button>
      {Object.entries(ETAPAS_VENDA).map(([k, v]) => <button key={k} className="chip" aria-pressed={etapa === k} onClick={() => setEtapa(k)}>{v}</button>)}
      <div className="flex-1" />
      <select id="bib-projeto" className="input" style={{ maxWidth: 200, minHeight: 36, padding: '4px 10px' }} value={projeto} onChange={e => setProjeto(e.target.value)}><option value="todos">Todos os projetos</option><option value="gerais">Só gerais</option>{projetos.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
      <input id="bib-busca" className="input" style={{ maxWidth: 240, minHeight: 36 }} placeholder="Buscar" value={busca} onChange={e => setBusca(e.target.value)} />
      <button className="btn btn-tonal" onClick={() => setEdit({ etapa: etapa === 'todas' ? 'objecao' : etapa, titulo: '', texto: '' })}><Icon n={editor ? 'Plus' : 'Lightbulb'} size={17} />{editor ? 'Novo roteiro' : 'Sugerir roteiro'}</button>
    </div>
    {editor && sugeridas.length > 0 && <Section title={'Sugestões dos corretores (' + sugeridas.length + ')'} icon="Lightbulb" className="mb-4">
      <ul className="flex flex-col gap-3">{sugeridas.map(a => <li key={a.id} className="soft rounded-xl p-3.5"><div className="flex flex-wrap items-center gap-2"><Pill tone="p-amber">{ETAPAS_VENDA[a.etapa]}</Pill><b className="font-medium">{a.titulo}</b><span className="muted text-[12px]">por {a.autor_nome}</span></div><p className="text-[14px] mt-2 whitespace-pre-wrap">{a.texto}</p>
        <div className="flex gap-2 mt-3"><button className="btn btn-green btn-sm" onClick={() => decidir(a, 'publicada')}>Publicar</button><button className="btn btn-outline btn-sm" onClick={() => setEdit({ ...a })}>Editar</button><button className="btn btn-danger btn-sm" onClick={() => decidir(a, 'arquivada')}>Arquivar</button></div></li>)}</ul>
    </Section>}
    {d.loading ? <Skeleton h={200} /> : !lista.length ? <Empty icon="MessageSquareQuote" title="Nenhum roteiro nesta etapa" /> :
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{lista.filter(a => a.status === 'publicada' || a.autor_id === perfil.id).map(a => (
        <article key={a.id} className="card p-5 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2"><Pill tone="p-blue">{ETAPAS_VENDA[a.etapa]}</Pill>{a.lancamentos?.nome && <Pill tone="p-grey" icon="Building">{a.lancamentos.nome}</Pill>}{a.status === 'sugerida' && <Pill tone="p-amber">Sua sugestão em análise</Pill>}{editor && <button className="btn btn-text btn-sm ml-auto" onClick={() => setEdit({ ...a })}><Icon n="PenLine" size={15} /></button>}</div>
          <h3 className="font-medium text-[16px] leading-snug">{a.titulo}</h3>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap flex-1">{a.texto}</p>
          <div className="flex flex-wrap items-center gap-2 pt-1"><button className="btn btn-outline btn-sm" onClick={() => usar(a, 'copiar')}><Icon n="Copy" size={15} />Copiar</button><button className="btn btn-green btn-sm" onClick={() => usar(a, 'wa')}><Icon n="MessageCircle" size={15} />WhatsApp</button><span className="muted text-[12px] ml-auto">{a.usos} usos</span></div>
        </article>
      ))}</div>}
    <EditorAbordagem dados={edit} editor={editor} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); d.reload(); }} />
  </>;
}

function EditorAbordagem({ dados, editor, onClose, onSaved }) {
  const { perfil } = useAuth(); const toast = useToast(); const [f, setF] = useState(dados); const [busy, setBusy] = useState(false);
  const lancs = useLoad(() => q(supabase.from('lancamentos').select('id,nome').order('ordem')), []);
  useEffect(() => setF(dados), [dados]);
  if (!dados || !f) return null;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const salvar = async () => {
    setBusy(true);
    try {
      const reg = { etapa: f.etapa, titulo: f.titulo.trim(), texto: f.texto.trim(), lancamento_id: f.lancamento_id || null };
      if (f.id) await q(supabase.from('abordagens').update(reg).eq('id', f.id));
      else await q(supabase.from('abordagens').insert({ ...reg, status: editor ? 'publicada' : 'sugerida', autor_id: perfil.id, autor_nome: perfil.nome }));
      toast(editor ? 'Roteiro publicado.' : 'Sugestão enviada. A Chaincorp revisa e publica para a rede.', 'ok'); onSaved();
    } catch (e) { toast(/duplicate|unique/i.test(e.message) ? 'Já existe um roteiro com este título.' : errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Editar roteiro' : editor ? 'Novo roteiro' : 'Sugerir um roteiro'} width={640}
      footer={<><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={!f.titulo?.trim() || !f.texto?.trim() || busy} onClick={salvar}>{editor || f.id ? 'Salvar' : 'Enviar sugestão'}</button></>}>
      <div className="flex flex-col gap-3">
        <Field label="Etapa da venda"><Choice value={f.etapa} onChange={v => set('etapa', v)} options={Object.entries(ETAPAS_VENDA).map(([k, v]) => ({ value: k, label: v }))} /></Field>
        <Field label="Título" hint="Para objeções, escreva a frase do cliente. Ex.: “SCP é seguro?”"><input id="ab-titulo" className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} /></Field>
        <Field label="Texto" hint="Use [nome] e [empreendimento] para o corretor completar."><textarea id="ab-texto" className="input" rows={7} value={f.texto} onChange={e => set('texto', e.target.value)} /></Field>
        <Field label="Lançamento (opcional)"><select id="ab-lanc" className="input" value={f.lancamento_id || ''} onChange={e => set('lancamento_id', e.target.value)}><option value="">Vale para todos</option>{(lancs.data || []).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
      </div>
    </Modal>
  );
}

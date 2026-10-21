import React, { useEffect, useMemo, useState } from 'react';
import { supabase, q, rpc } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, PageHead, Section, Pill, Empty, Modal, Field, Choice, Tabs, useLoad, LoadError, useToast, Skeleton, Switch, ErrorBox, Spinner } from '../ui.jsx';
import { ETAPAS_VENDA, pct, dataBR, errMsg, copiarTexto, abrirWhatsApp } from '../lib/util.js';

const EDITORES = ['admin'];
const TIPO_AULA = { video: ['Vídeo', 'PlayCircle'], leitura: ['Leitura', 'BookOpen'], material: ['Material', 'FileDown'], roteiro: ['Roteiro', 'MessageSquareQuote'] };

const certificada = t => t.aulas_total > 0 && t.aulas_feitas >= t.aulas_total && (!t.tem_quiz || t.aprovado);

export default function Academia() {
  const { path } = useNav();
  const id = path.split('/')[2];
  if (id) return <Trilha id={Number(id)} />;
  return <>
    <PageHead eyebrow="Treinamento Chaincorp" title="Aprenda a vender cada projeto" sub="Trilhas curtas com aulas, vídeos e quiz. Ao concluir, você recebe o certificado." />
    <ListaTrilhas />
  </>;
}

// ------------------------------------------------------------------ trilhas
function ListaTrilhas() {
  const { perfil } = useAuth(); const { ir } = useNav();
  const editor = EDITORES.includes(perfil.papel);
  const [editando, setEditando] = useState(null);
  const d = useLoad(async () => {
    let qy = supabase.from('trilhas').select('*, lancamentos(nome)').order('ordem');
    const [t, m] = await Promise.all([q(qy), rpc('minha_academia')]);
    return t.map(x => ({ ...x, ...(m.find(y => y.trilha_id === x.id) || { aulas_total: 0, aulas_feitas: 0 }) }));
  }, []);
  const lista = d.data || [];
  const cert = lista.filter(t => t.publicada && certificada(t)).length;
  const pub = lista.filter(t => t.publicada).length;
  return <>
    <LoadError error={d.error} retry={d.reload} />
    <div className="card p-5 flex flex-wrap items-center gap-4 mb-4">
      <span className="avatar p-green" style={{ width: 48, height: 48, borderRadius: 14 }}><Icon n="Award" size={24} /></span>
      <div className="flex-1 min-w-[200px]"><div className="font-medium">{cert} de {pub} certificados conquistados</div><div className="progress mt-2"><span style={{ width: pct(cert, pub) + '%' }} /></div></div>
      {editor && <button className="btn btn-filled" onClick={() => setEditando({ titulo: '', descricao: '', nivel: (lista.length ? Math.max(...lista.map(x => x.nivel)) : 0) + 1, ordem: (lista.length + 1) * 10, publicada: false, nota_minima: 70 })}><Icon n="Plus" size={18} />Nova trilha</button>}
    </div>
    {d.loading ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} h={180} />)}</div> :
      !lista.length ? <Empty icon="GraduationCap" title="Nenhuma trilha publicada">{editor ? 'Crie a primeira trilha.' : 'Em breve a Chaincorp publica os primeiros conteúdos.'}</Empty> :
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{lista.map(t => {
        const ok = certificada(t);
        return (
          <button key={t.id} onClick={() => ir('/treinamento/' + t.id)} className="card p-5 text-left flex flex-col gap-3 hover:shadow transition-shadow" style={!t.publicada ? { borderStyle: 'dashed' } : {}}>
            <div className="flex items-center justify-between gap-2">
              <Pill tone={t.lancamento_id ? 'p-blue' : 'p-grey'} icon={t.lancamento_id ? 'Building' : 'Layers'}>{t.lancamento_id ? 'Produto' : 'Nível ' + t.nivel}</Pill>
              {ok ? <Pill tone="p-green" icon="Award">Certificado</Pill> : !t.publicada ? <Pill tone="p-amber">Rascunho</Pill> : t.aulas_feitas > 0 ? <Pill tone="p-blue">Em andamento</Pill> : null}
            </div>
            <h3 className="text-[17px] font-medium leading-snug">{t.titulo}</h3>
            <p className="muted text-[13px] leading-relaxed line-clamp-3">{t.descricao}</p>
            <div className="mt-auto flex items-center gap-3 pt-1"><div className="progress flex-1"><span style={{ width: pct(t.aulas_feitas, t.aulas_total) + '%' }} /></div><span className="num text-[12px] muted">{t.aulas_feitas}/{t.aulas_total} aulas{t.tem_quiz ? ' · quiz' : ''}</span></div>
          </button>
        );
      })}</div>}
    <EditorTrilha dados={editando} onClose={() => setEditando(null)} onSaved={id => { setEditando(null); d.reload(); if (id) ir('/treinamento/' + id); }} />
  </>;
}

function EditorTrilha({ dados, onClose, onSaved }) {
  const toast = useToast(); const [f, setF] = useState(dados); const [busy, setBusy] = useState(false);
  const lancs = useLoad(() => q(supabase.from('lancamentos').select('id,nome').order('ordem')), []);
  useEffect(() => setF(dados), [dados]);
  if (!dados || !f) return null;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const salvar = async () => {
    setBusy(true);
    try {
      const reg = { titulo: f.titulo.trim(), descricao: f.descricao, nivel: Number(f.nivel) || 1, ordem: Number(f.ordem) || 100, publicada: !!f.publicada, nota_minima: Number(f.nota_minima) || 70, lancamento_id: f.lancamento_id || null };
      const r = f.id ? await q(supabase.from('trilhas').update(reg).eq('id', f.id).select().single()) : await q(supabase.from('trilhas').insert(reg).select().single());
      toast(f.id ? 'Trilha atualizada.' : 'Trilha criada. Agora adicione as aulas.', 'ok'); onSaved(f.id ? null : r.id);
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const apagar = async () => {
    if (!f.confirmar) return set('confirmar', true);
    try { await q(supabase.from('trilhas').delete().eq('id', f.id)); toast('Trilha excluída.'); onSaved(null); window.history.back(); } catch (e) { toast(errMsg(e), 'erro'); }
  };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Editar trilha' : 'Nova trilha'} width={620}
      footer={<>{f.id && <button className="btn btn-danger" onClick={apagar}>{f.confirmar ? 'Confirmar exclusão' : 'Excluir'}</button>}<span className="flex-1" /><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={!f.titulo?.trim() || busy} onClick={salvar}>Salvar</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label="Título"><input id="tr-titulo" className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ex.: Nível 2 · Enquadramento HIS-2, HMP e R2V" /></Field></div>
        <div className="sm:col-span-2"><Field label="Descrição"><textarea id="tr-desc" className="input" rows={3} value={f.descricao || ''} onChange={e => set('descricao', e.target.value)} /></Field></div>
        <Field label="Nível"><input id="tr-nivel" className="input num" type="number" min="1" value={f.nivel} onChange={e => set('nivel', e.target.value)} /></Field>
        <Field label="Ordem na lista"><input id="tr-ordem" className="input num" type="number" value={f.ordem} onChange={e => set('ordem', e.target.value)} /></Field>
        <Field label="Trilha de produto (opcional)"><select id="tr-lanc" className="input" value={f.lancamento_id || ''} onChange={e => set('lancamento_id', e.target.value)}><option value="">Não é de produto</option>{(lancs.data || []).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
        <Field label="Nota mínima no quiz (%)"><input id="tr-nota" className="input num" type="number" min="0" max="100" value={f.nota_minima} onChange={e => set('nota_minima', e.target.value)} /></Field>
        <div className="sm:col-span-2 flex items-center gap-3 soft rounded-xl p-3"><Switch on={f.publicada} onChange={v => set('publicada', v)} label="Publicada" /><span><b className="font-medium">Publicada</b><span className="muted text-[13px] block">Rascunhos só aparecem para o administrador.</span></span></div>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ uma trilha
function embedVideo(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?rel=0';
  const dr = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (dr) return 'https://drive.google.com/file/d/' + dr[1] + '/preview';
  return null;
}

function Trilha({ id }) {
  const { perfil } = useAuth(); const { ir } = useNav(); const toast = useToast();
  const editor = EDITORES.includes(perfil.papel);
  const [sel, setSel] = useState(null);
  const [editTrilha, setEditTrilha] = useState(null); const [editAula, setEditAula] = useState(null); const [editQuiz, setEditQuiz] = useState(false);
  const d = useLoad(async () => {
    const [t, aulas, feitas, tent] = await Promise.all([
      q(supabase.from('trilhas').select('*, lancamentos(nome)').eq('id', id).single()),
      q(supabase.from('aulas').select('*').eq('trilha_id', id).order('ordem').order('id')),
      q(supabase.from('progresso_aulas').select('aula_id, concluida_em').eq('usuario_id', perfil.id)),
      q(supabase.from('tentativas_quiz').select('*').eq('trilha_id', id).eq('usuario_id', perfil.id).order('criado_em', { ascending: false })),
    ]);
    const quiz = await rpc('quiz_da_trilha', { p_trilha: id });
    return { t, aulas, feitas: new Map(feitas.map(f => [f.aula_id, f.concluida_em])), tent, quiz };
  }, [id]);
  const D = d.data;
  useEffect(() => { if (D && sel == null) { const prox = D.aulas.find(a => !D.feitas.has(a.id)); setSel(prox ? prox.id : D.aulas[0]?.id ?? 'quiz'); } }, [D]);
  if (d.loading && !D) return <div className="pt-6"><Skeleton h={300} /></div>;
  if (d.error) return <div className="pt-6"><LoadError error={d.error} retry={d.reload} /></div>;
  const { t, aulas, feitas, tent, quiz } = D;
  const feitasN = aulas.filter(a => feitas.has(a.id)).length;
  const aprovado = tent.some(x => x.aprovado);
  const ok = aulas.length > 0 && feitasN === aulas.length && (!quiz.length || aprovado);
  const dataCert = ok ? [...aulas.map(a => feitas.get(a.id)), ...tent.filter(x => x.aprovado).map(x => x.criado_em)].sort().slice(-1)[0] : null;
  const aula = aulas.find(a => a.id === sel);

  const marcar = async (a, feito) => {
    try {
      if (feito) await q(supabase.from('progresso_aulas').insert({ usuario_id: perfil.id, aula_id: a.id }));
      else await q(supabase.from('progresso_aulas').delete().eq('usuario_id', perfil.id).eq('aula_id', a.id));
      await d.reload();
      if (feito) { const i = aulas.findIndex(x => x.id === a.id); const prox = aulas.slice(i + 1).find(x => !feitas.has(x.id)); setSel(prox ? prox.id : quiz.length ? 'quiz' : a.id); }
    } catch (e) { toast(errMsg(e), 'erro'); }
  };

  return <>
    <div className="pt-5"><button className="btn btn-text btn-sm -ml-2" onClick={() => ir('/treinamento')}><Icon n="ArrowLeft" size={16} />Treinamento</button></div>
    <PageHead eyebrow={t.lancamento_id ? 'Trilha de produto · ' + (t.lancamentos?.nome || '') : 'Nível ' + t.nivel} title={t.titulo} sub={t.descricao}>
      {editor && <button className="btn btn-outline" onClick={() => setEditTrilha({ ...t })}><Icon n="PenLine" size={16} />Editar trilha</button>}
    </PageHead>
    {!t.publicada && <div className="card p-3 mb-4 flex items-center gap-2 text-[13px]" style={{ background: 'var(--amber-c)', color: 'var(--on-amber-c)', borderColor: 'transparent' }}><Icon n="EyeOff" size={16} />Rascunho: só o administrador vê esta trilha.</div>}
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
      <aside className="card p-2 self-start min-w-0">
        <div className="px-3 py-2"><div className="progress"><span style={{ width: pct(feitasN, aulas.length) + '%' }} /></div><div className="muted text-[12px] mt-1.5">{feitasN} de {aulas.length} aulas concluídas</div></div>
        <ol>{aulas.map((a, i) => {
          const f = feitas.has(a.id);
          return <li key={a.id}><button className="menu-item rounded-lg" aria-current={sel === a.id} onClick={() => setSel(a.id)}>
            <span className="avatar" style={{ width: 26, height: 26, fontSize: 12, background: f ? 'var(--green)' : 'var(--soft)', color: f ? 'var(--on-green)' : 'var(--muted)' }}>{f ? <Icon n="Check" size={14} /> : i + 1}</span>
            <span className="flex-1 min-w-0"><span className="block text-[14px] leading-snug">{a.titulo}</span><span className="muted text-[11px]">{TIPO_AULA[a.tipo]?.[0]}{a.duracao_min ? ' · ' + a.duracao_min + ' min' : ''}</span></span>
          </button></li>;
        })}</ol>
        {(quiz.length > 0 || editor) && <button className="menu-item rounded-lg" aria-current={sel === 'quiz'} onClick={() => setSel('quiz')}>
          <span className="avatar" style={{ width: 26, height: 26, background: aprovado ? 'var(--green)' : 'var(--blue-c)', color: aprovado ? 'var(--on-green)' : 'var(--on-blue-c)' }}><Icon n={aprovado ? 'Check' : 'ListChecks'} size={14} /></span>
          <span className="flex-1"><span className="block text-[14px]">Quiz de certificação</span><span className="muted text-[11px]">{quiz.length} perguntas · mínimo {t.nota_minima}%</span></span>
        </button>}
        {ok && <button className="menu-item rounded-lg" aria-current={sel === 'cert'} onClick={() => setSel('cert')}><span className="avatar p-green" style={{ width: 26, height: 26 }}><Icon n="Award" size={14} /></span><span className="flex-1 text-[14px]">Seu certificado</span></button>}
        {editor && <div className="p-2 flex flex-col gap-1 line-t mt-1"><button className="btn btn-text btn-sm justify-start" onClick={() => setEditAula({ trilha_id: id, titulo: '', tipo: 'leitura', conteudo: '', ordem: (aulas.length + 1) })}><Icon n="Plus" size={15} />Adicionar aula</button><button className="btn btn-text btn-sm justify-start" onClick={() => setEditQuiz(true)}><Icon n="ListChecks" size={15} />Editar quiz</button></div>}
      </aside>
      <div className="min-w-0">
        {sel === 'quiz' ? <Quiz trilha={t} perguntas={quiz} tentativas={tent} pronto={feitasN === aulas.length} onDone={d.reload} onCert={() => setSel('cert')} />
          : sel === 'cert' && ok ? <Certificado nome={perfil.nome} trilha={t.titulo} data={dataCert} />
          : aula ? <Aula aula={aula} feita={feitas.has(aula.id)} onMarcar={f => marcar(aula, f)} editor={editor} onEditar={() => setEditAula({ ...aula })} />
          : <Empty icon="BookOpen" title="Nenhuma aula nesta trilha ainda">{editor ? 'Use Adicionar aula no menu da trilha.' : ''}</Empty>}
      </div>
    </div>
    <EditorTrilha dados={editTrilha} onClose={() => setEditTrilha(null)} onSaved={() => { setEditTrilha(null); d.reload(); }} />
    <EditorAula dados={editAula} onClose={() => setEditAula(null)} onSaved={nid => { setEditAula(null); d.reload(); if (nid) setSel(nid); }} />
    {editQuiz && <EditorQuiz trilhaId={id} onClose={() => { setEditQuiz(false); d.reload(); }} />}
  </>;
}

function Aula({ aula, feita, onMarcar, editor, onEditar }) {
  const emb = embedVideo(aula.video_url);
  return (
    <article className="card overflow-hidden rise" key={aula.id}>
      {emb ? <div style={{ aspectRatio: '16/9', maxWidth: '100%', background: '#000' }}><iframe src={emb} title={aula.titulo} className="w-full h-full" style={{ border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen /></div>
        : aula.tipo === 'video' ? <div className="soft p-6 text-center muted text-[13px]"><Icon n="VideoOff" size={26} className="mx-auto mb-2" />{editor ? 'Cole o link do YouTube ou do Google Drive em Editar aula para o vídeo aparecer aqui.' : 'O vídeo desta aula será publicado em breve.'}</div> : null}
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 mb-2"><Pill tone="p-blue" icon={TIPO_AULA[aula.tipo]?.[1]}>{TIPO_AULA[aula.tipo]?.[0]}</Pill>{aula.duracao_min && <span className="muted text-[12px]">{aula.duracao_min} min</span>}{editor && <button className="btn btn-text btn-sm ml-auto" onClick={onEditar}><Icon n="PenLine" size={15} />Editar aula</button>}</div>
        <h2 className="text-[22px] font-normal leading-snug">{aula.titulo}</h2>
        {aula.conteudo && <div className="prose-hub mt-4">{aula.conteudo}</div>}
        {(aula.material_url || (aula.video_url && !emb)) && <div className="flex flex-wrap gap-2 mt-5">
          {aula.material_url && <a className="btn btn-outline" href={aula.material_url} target="_blank" rel="noopener"><Icon n="FileDown" size={16} />Abrir material</a>}
          {aula.video_url && !emb && <a className="btn btn-outline" href={aula.video_url} target="_blank" rel="noopener"><Icon n="PlayCircle" size={16} />Assistir vídeo</a>}
        </div>}
        <div className="line-t mt-6 pt-5 flex flex-wrap items-center gap-3">
          {feita ? <><Pill tone="p-green" icon="CheckCircle2">Aula concluída</Pill><button className="btn btn-text btn-sm" onClick={() => onMarcar(false)}>Desmarcar</button></>
            : <button className="btn btn-green" onClick={() => onMarcar(true)}><Icon n="Check" size={18} />Concluí esta aula</button>}
        </div>
      </div>
    </article>
  );
}

function Quiz({ trilha, perguntas, tentativas, pronto, onDone, onCert }) {
  const toast = useToast();
  const [resp, setResp] = useState({}); const [res, setRes] = useState(null); const [busy, setBusy] = useState(false);
  const aprovado = tentativas.some(x => x.aprovado);
  if (!perguntas.length) return <div className="card p-6"><Empty icon="ListChecks" title="Esta trilha ainda não tem quiz">A certificação acontece ao concluir todas as aulas.</Empty></div>;
  const enviar = async () => {
    setBusy(true);
    try { const r = await rpc('responder_quiz', { p_trilha: trilha.id, p_respostas: resp }); setRes(r); onDone(); }
    catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const corr = res ? Object.fromEntries(res.correcao.map(c => [c.id, c])) : {};
  return (
    <div className="card p-5 sm:p-7 rise">
      <div className="flex flex-wrap items-center gap-2"><Pill tone="p-blue" icon="ListChecks">Quiz de certificação</Pill><span className="muted text-[12px]">Mínimo de {trilha.nota_minima}% de acertos</span>{aprovado && <Pill tone="p-green" icon="Award">Você já foi aprovado</Pill>}</div>
      {!pronto && !aprovado && <p className="mt-3 text-[13px] rounded-lg p-3" style={{ background: 'var(--amber-c)', color: 'var(--on-amber-c)' }}>Recomendamos concluir todas as aulas antes do quiz. O certificado exige as duas coisas.</p>}
      {res && <div className="mt-4 rounded-xl p-4 flex flex-wrap items-center gap-3" style={{ background: res.aprovado ? 'var(--green-c)' : 'var(--red-c)', color: res.aprovado ? 'var(--on-green-c)' : 'var(--on-red-c)' }}>
        <Icon n={res.aprovado ? 'PartyPopper' : 'RotateCcw'} size={22} /><span className="flex-1"><b>{res.acertos} de {res.total}</b> · {res.aprovado ? 'Aprovado!' : 'Ainda não foi desta vez. Revise as explicações e tente de novo.'}</span>
        {res.aprovado && pronto && <button className="btn btn-green btn-sm" onClick={onCert}>Ver certificado</button>}
        {!res.aprovado && <button className="btn btn-outline btn-sm" onClick={() => { setRes(null); setResp({}); }}>Refazer</button>}
      </div>}
      <ol className="flex flex-col gap-6 mt-6">{perguntas.map((p, i) => {
        const c = corr[p.id];
        return <li key={p.id}>
          <div className="font-medium mb-3"><span className="num muted mr-2">{i + 1}.</span>{p.enunciado}</div>
          <div className="flex flex-col gap-2">{p.opcoes.map((o, j) => {
            const marcada = resp[p.id] === j; const certa = c && c.correta === j; const errada = c && marcada && !certa;
            return <label key={j} className="flex items-center gap-3 rounded-xl px-3.5 py-3 cursor-pointer" style={{ border: '1px solid ' + (certa ? 'var(--green)' : errada ? 'var(--red)' : marcada ? 'var(--blue)' : 'var(--line)'), background: certa ? 'var(--green-c)' : errada ? 'var(--red-c)' : marcada ? 'var(--blue-c)' : 'var(--surface)' }}>
              <input type="radio" name={'q' + p.id} id={'q' + p.id + '-' + j} checked={marcada} disabled={!!res} onChange={() => setResp(r => ({ ...r, [p.id]: j }))} style={{ accentColor: 'var(--blue)' }} />
              <span className="flex-1 text-[14px]">{o}</span>{certa && <Icon n="CheckCircle2" size={18} />}{errada && <Icon n="XCircle" size={18} />}
            </label>;
          })}</div>
          {c?.explicacao && <p className="muted text-[13px] mt-2">{c.explicacao}</p>}
        </li>;
      })}</ol>
      {!res && <div className="flex justify-end mt-6"><button className="btn btn-filled" disabled={Object.keys(resp).length < perguntas.length || busy} onClick={enviar}>{busy ? <Spinner /> : <><Icon n="Send" size={17} />Enviar respostas</>}</button></div>}
      {tentativas.length > 0 && !res && <p className="muted text-[12px] mt-4">Tentativas anteriores: {tentativas.slice(0, 5).map(x => x.acertos + '/' + x.total).join(' · ')}</p>}
    </div>
  );
}

function Certificado({ nome, trilha, data }) {
  return (
    <div className="card p-6 sm:p-10 rise text-center" style={{ borderWidth: 2, borderColor: 'var(--green)' }}>
      <span className="avatar p-green mx-auto" style={{ width: 72, height: 72 }}><Icon n="Award" size={36} /></span>
      <div className="eyebrow mt-5">Treinamento Chaincorp</div>
      <h2 className="text-[26px] font-normal mt-2">Certificado de conclusão</h2>
      <p className="mt-4 text-[15px]">Certificamos que <b>{nome}</b> concluiu a trilha</p>
      <p className="text-[20px] mt-2 font-medium" style={{ color: 'var(--blue)' }}>{trilha}</p>
      <p className="muted mt-4 text-[13px]">Concluído em {dataBR(data)}</p>
      <p className="muted mt-6 text-[12px]">Tire um print desta tela para compartilhar. A conclusão fica registrada e aparece para o seu gestor e para a Chaincorp.</p>
    </div>
  );
}

function EditorAula({ dados, onClose, onSaved }) {
  const toast = useToast(); const [f, setF] = useState(dados); const [busy, setBusy] = useState(false);
  useEffect(() => setF(dados), [dados]);
  if (!dados || !f) return null;
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const salvar = async () => {
    setBusy(true);
    try {
      const reg = { trilha_id: f.trilha_id, titulo: f.titulo.trim(), tipo: f.tipo, conteudo: f.conteudo, video_url: f.video_url || null, material_url: f.material_url || null, duracao_min: f.duracao_min ? Number(f.duracao_min) : null, ordem: Number(f.ordem) || 100 };
      const r = f.id ? await q(supabase.from('aulas').update(reg).eq('id', f.id).select().single()) : await q(supabase.from('aulas').insert(reg).select().single());
      toast('Aula salva.', 'ok'); onSaved(r.id);
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  const apagar = async () => { if (!f.confirmar) return set('confirmar', true); try { await q(supabase.from('aulas').delete().eq('id', f.id)); toast('Aula excluída.'); onSaved(null); } catch (e) { toast(errMsg(e), 'erro'); } };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Editar aula' : 'Nova aula'} width={720}
      footer={<>{f.id && <button className="btn btn-danger" onClick={apagar}>{f.confirmar ? 'Confirmar exclusão' : 'Excluir'}</button>}<span className="flex-1" /><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={!f.titulo?.trim() || busy} onClick={salvar}>Salvar</button></>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3"><Field label="Título"><input id="au-titulo" className="input" value={f.titulo} onChange={e => set('titulo', e.target.value)} /></Field></div>
        <div className="sm:col-span-3"><Field label="Tipo"><Choice value={f.tipo} onChange={v => set('tipo', v)} options={Object.entries(TIPO_AULA).map(([k, v]) => ({ value: k, label: v[0] }))} /></Field></div>
        <div className="sm:col-span-3"><Field label="Conteúdo" hint="Texto corrido. Quebras de linha são mantidas."><textarea id="au-conteudo" className="input" rows={10} value={f.conteudo || ''} onChange={e => set('conteudo', e.target.value)} /></Field></div>
        <div className="sm:col-span-3"><Field label="Link do vídeo (YouTube ou Google Drive)"><input id="au-video" className="input" value={f.video_url || ''} onChange={e => set('video_url', e.target.value)} placeholder="https://youtu.be/..." /></Field></div>
        <div className="sm:col-span-3"><Field label="Link de material (PDF, apresentação, pasta do Drive)"><input id="au-material" className="input" value={f.material_url || ''} onChange={e => set('material_url', e.target.value)} placeholder="https://drive.google.com/..." /></Field></div>
        <Field label="Duração (min)"><input id="au-dur" className="input num" type="number" min="1" value={f.duracao_min || ''} onChange={e => set('duracao_min', e.target.value)} /></Field>
        <Field label="Ordem"><input id="au-ordem" className="input num" type="number" value={f.ordem} onChange={e => set('ordem', e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

function EditorQuiz({ trilhaId, onClose }) {
  const toast = useToast();
  const d = useLoad(() => q(supabase.from('quiz_perguntas').select('*').eq('trilha_id', trilhaId).order('ordem').order('id')), [trilhaId]);
  const [lista, setLista] = useState(null);
  useEffect(() => { if (d.data) setLista(d.data.map(p => ({ ...p, opcoes: [...p.opcoes, '', '', '', ''].slice(0, Math.max(4, p.opcoes.length)) }))); }, [d.data]);
  const [busy, setBusy] = useState(false);
  const upd = (i, k, v) => setLista(l => l.map((p, j) => j === i ? { ...p, [k]: v } : p));
  const salvar = async () => {
    for (const p of lista) { const ops = p.opcoes.filter(o => o.trim()); if (!p.enunciado.trim() || ops.length < 2) return toast('Cada pergunta precisa de enunciado e pelo menos duas opções.', 'erro'); if (!p.opcoes[p.correta]?.trim()) return toast('Marque uma resposta correta preenchida em cada pergunta.', 'erro'); }
    setBusy(true);
    try {
      const antigos = (d.data || []).map(p => p.id); const atuais = lista.filter(p => p.id).map(p => p.id);
      const remover = antigos.filter(x => !atuais.includes(x));
      if (remover.length) await q(supabase.from('quiz_perguntas').delete().in('id', remover));
      for (const [i, p] of lista.entries()) {
        const ops = p.opcoes.map(o => o.trim()); const validas = ops.filter(Boolean); const correta = validas.indexOf(ops[p.correta]);
        const reg = { trilha_id: trilhaId, enunciado: p.enunciado.trim(), opcoes: validas, correta, explicacao: p.explicacao || null, ordem: i + 1 };
        if (p.id) await q(supabase.from('quiz_perguntas').update(reg).eq('id', p.id)); else await q(supabase.from('quiz_perguntas').insert(reg));
      }
      toast('Quiz salvo.', 'ok'); onClose();
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  return (
    <Modal open onClose={onClose} title="Quiz de certificação" width={760}
      footer={<><button className="btn btn-text" onClick={() => setLista(l => [...l, { enunciado: '', opcoes: ['', '', '', ''], correta: 0, explicacao: '' }])}><Icon n="Plus" size={16} />Pergunta</button><span className="flex-1" /><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={busy || !lista} onClick={salvar}>Salvar quiz</button></>}>
      {!lista ? <Skeleton h={200} /> : !lista.length ? <Empty icon="ListChecks" title="Sem perguntas">Adicione a primeira pergunta.</Empty> :
        <ol className="flex flex-col gap-5">{lista.map((p, i) => (
          <li key={p.id || 'n' + i} className="soft rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2"><span className="num muted pt-3">{i + 1}.</span><textarea id={'qz-en-' + i} className="input" rows={2} value={p.enunciado} onChange={e => upd(i, 'enunciado', e.target.value)} placeholder="Enunciado" /><button className="icon-btn" onClick={() => setLista(l => l.filter((_, j) => j !== i))} aria-label="Remover pergunta"><Icon n="Trash2" size={17} /></button></div>
            {p.opcoes.map((o, j) => <label key={j} className="flex items-center gap-2"><input type="radio" name={'cor' + i} checked={p.correta === j} onChange={() => upd(i, 'correta', j)} title="Resposta correta" style={{ accentColor: 'var(--green)' }} /><input id={'qz-op-' + i + '-' + j} className="input" value={o} onChange={e => upd(i, 'opcoes', p.opcoes.map((x, k) => k === j ? e.target.value : x))} placeholder={'Opção ' + (j + 1)} /></label>)}
            <input id={'qz-ex-' + i} className="input" value={p.explicacao || ''} onChange={e => upd(i, 'explicacao', e.target.value)} placeholder="Explicação mostrada depois da resposta" />
          </li>))}</ol>}
      <p className="muted text-[12px] mt-3">Marque a bolinha ao lado da opção correta. O gabarito nunca é enviado ao navegador do corretor.</p>
    </Modal>
  );
}


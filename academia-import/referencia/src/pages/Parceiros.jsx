import React, { useEffect, useState } from 'react';
import { supabase, q, rpc } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, PageHead, Pill, Section, Tabs, Avatar, Empty, Modal, Field, Choice, useLoad, LoadError, Skeleton, useToast } from '../ui.jsx';
import { ATIVIDADES, PAPEIS, relativo, dataBR, nf, pct, errMsg, diasDesde } from '../lib/util.js';

// ---------------------------------------------------------------- componentes compartilhados
export function LinhaDoTempo({ usuario, limite = 40, compacta, vazio = 'Nenhuma atividade ainda.' }) {
  const d = useLoad(() => rpc('linha_do_tempo', { p_usuario: usuario || null, p_limite: limite }), [usuario, limite]);
  useEffect(() => { const ch = supabase.channel('tl-' + (usuario || 'all')).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'atividades' }, () => d.reload()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [usuario]);
  if (d.loading && !d.data) return <Skeleton h={120} />;
  if (d.error) return <LoadError error={d.error} retry={d.reload} />;
  if (!d.data.length) return <p className="muted text-[13px] py-2">{vazio}</p>;
  return (
    <ol className="flex flex-col">
      {d.data.map(a => {
        const [txt, ic] = ATIVIDADES[a.tipo] || [a.tipo, 'Dot'];
        const destaque = a.tipo === 'cliente_abriu' || a.tipo.startsWith('negocio_') || a.tipo === 'certificou';
        return (
          <li key={a.id} className="flex items-start gap-3 py-2.5 line-b last:border-0">
            <span className={'avatar ' + (destaque ? 'p-green' : 'p-grey')} style={{ width: 30, height: 30 }}><Icon n={ic} size={15} /></span>
            <span className="flex-1 min-w-0 text-[13.5px] leading-snug">
              {!compacta && <b className="font-medium">{a.nome} </b>}{txt}{a.lancamento ? <b className="font-medium"> {a.lancamento}</b> : ''}{a.detalhe && !['investimento', 'moradia', 'escassez', 'feed', 'stories'].includes(a.detalhe) ? (a.lancamento ? <span className="muted"> · {a.detalhe}</span> : <b className="font-medium"> {a.detalhe}</b>) : ''}
              {!compacta && a.imobiliaria && <span className="muted block text-[12px]">{a.imobiliaria}</span>}
            </span>
            <span className="muted text-[12px] whitespace-nowrap">{relativo(a.criado_em)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TabelaParceiros({ lista, onAbrir, mostrarImob = true }) {
  return (
    <div className="overflow-x-auto"><table className="tbl" style={{ minWidth: 820 }}>
      <thead><tr><th className="pl-5">Parceiro</th>{mostrarImob && <th>Imobiliária</th>}<th>Último acesso</th><th className="text-right">Materiais</th><th className="text-right">Envios</th><th className="text-right">Clientes abriram</th><th>Treinamento</th><th className="text-right pr-5">Negócios</th></tr></thead>
      <tbody>{lista.map(p => {
        const dd = diasDesde(p.ultimo_acesso);
        return (
          <tr key={p.id} className={onAbrir ? 'cursor-pointer' : ''} onClick={() => onAbrir?.(p)}>
            <td className="pl-5"><div className="flex items-center gap-3"><Avatar nome={p.nome} size={32} tone={p.status === 'ATIVO' ? 'p-blue' : 'p-amber'} /><div className="min-w-0"><div className="font-medium flex items-center gap-2">{p.nome}{p.papel === 'gestor' && <Pill tone="p-blue">Gestor</Pill>}{p.status === 'PENDENTE_APROVACAO' && <Pill tone="p-amber">Pendente</Pill>}{p.status === 'REJEITADO' && <Pill tone="p-red">Bloqueado</Pill>}</div><div className="muted text-[12px]">{p.whatsapp || p.email}</div></div></div></td>
            {mostrarImob && <td className="text-[13px]">{p.imobiliaria || <span className="muted">Autônomo</span>}</td>}
            <td className="text-[13px]">{p.ultimo_acesso ? <span style={{ color: dd > 7 ? 'var(--red)' : 'inherit' }}>{relativo(p.ultimo_acesso)}</span> : <span className="muted">nunca</span>}</td>
            <td className="num text-right">{nf(p.materiais)}</td>
            <td className="num text-right">{nf(p.envios)}</td>
            <td className="num text-right">{p.aberturas > 0 ? <b className="font-medium" style={{ color: 'var(--green)' }}>{nf(p.aberturas)}</b> : 0}</td>
            <td><div className="flex items-center gap-2"><div className="progress" style={{ width: 56 }}><span style={{ width: pct(p.certificados, p.trilhas_total) + '%' }} /></div><span className="num text-[12px] muted">{p.certificados}/{p.trilhas_total}</span></div></td>
            <td className="num text-right pr-5">{nf(p.negocios)}{p.vendas > 0 && <span style={{ color: 'var(--green)' }}> · {p.vendas} venda{p.vendas > 1 ? 's' : ''}</span>}</td>
          </tr>
        );
      })}</tbody>
    </table></div>
  );
}

// ---------------------------------------------------------------- página do administrador
export default function Parceiros() {
  const { path, ir } = useNav();
  const id = path.split('/')[2];
  const [aba, setAba] = useState('corretores'); const [busca, setBusca] = useState(''); const [filtro, setFiltro] = useState('ativos');
  const d = useLoad(() => rpc('resumo_parceiros', { p_imob: null }), []);
  useEffect(() => { const ch = supabase.channel('parc').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => d.reload()).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  const todos = d.data || [];
  const pend = todos.filter(p => p.status === 'PENDENTE_APROVACAO');
  if (id) return <DetalheParceiro id={id} lista={todos} recarregar={d.reload} />;
  const lista = todos.filter(p => (filtro === 'todos' || (filtro === 'ativos' ? p.status === 'ATIVO' : filtro === 'parados' ? p.status === 'ATIVO' && (diasDesde(p.ultimo_acesso) ?? 99) > 7 : p.status === 'REJEITADO'))
    && (!busca || (p.nome + ' ' + p.email + ' ' + (p.imobiliaria || '')).toLowerCase().includes(busca.toLowerCase())));
  const imobs = Object.values(todos.filter(p => p.status === 'ATIVO').reduce((acc, p) => {
    const k = p.imobiliaria || 'Corretores autônomos';
    acc[k] = acc[k] || { nome: k, corretores: 0, ativos7: 0, materiais: 0, envios: 0, aberturas: 0, certificados: 0, negocios: 0, vendas: 0, gestor: null };
    const a = acc[k]; a.corretores++; if ((diasDesde(p.ultimo_acesso) ?? 99) <= 7) a.ativos7++;
    ['materiais', 'envios', 'aberturas', 'negocios', 'vendas'].forEach(x => a[x] += Number(p[x])); if (p.certificados > 0) a.certificados++; if (p.papel === 'gestor') a.gestor = p.nome;
    return acc;
  }, {})).sort((x, y) => y.envios + y.materiais - (x.envios + x.materiais));

  return <>
    <PageHead eyebrow="Gestão de parceiros" title="Corretores e imobiliárias" sub="Libere acessos e acompanhe o que cada parceiro está fazendo na plataforma" />
    <Tabs value={aba} onChange={setAba} tabs={[{ id: 'corretores', label: 'Corretores', icon: 'Users' }, { id: 'imobiliarias', label: 'Imobiliárias', icon: 'Building2' }, { id: 'pendentes', label: 'Acessos pendentes', icon: 'UserPlus', badge: pend.length }]} />
    <LoadError error={d.error} retry={d.reload} />
    <div className="pt-5">
      {aba === 'corretores' && <>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[['ativos', 'Ativos'], ['parados', 'Sem acessar há 7 dias'], ['bloqueados', 'Bloqueados'], ['todos', 'Todos']].map(([k, l]) => <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>)}
          <span className="flex-1" />
          <input id="parc-busca" className="input" style={{ maxWidth: 260, minHeight: 36 }} placeholder="Buscar nome ou imobiliária" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <Section pad={false}>{d.loading ? <div className="p-5"><Skeleton h={200} /></div> : !lista.length ? <Empty icon="Users" title="Ninguém neste filtro" /> : <TabelaParceiros lista={lista} onAbrir={p => ir('/parceiros/' + p.id)} />}</Section>
      </>}
      {aba === 'imobiliarias' && <Section pad={false}>{d.loading ? <div className="p-5"><Skeleton h={160} /></div> : !imobs.length ? <Empty icon="Building2" title="Nenhuma imobiliária com corretores ativos" /> :
        <div className="overflow-x-auto"><table className="tbl" style={{ minWidth: 760 }}>
          <thead><tr><th className="pl-5">Imobiliária</th><th className="text-right">Corretores</th><th className="text-right">Ativos 7 dias</th><th className="text-right">Materiais</th><th className="text-right">Envios</th><th className="text-right">Clientes abriram</th><th className="text-right">Certificados</th><th className="text-right pr-5">Negócios</th></tr></thead>
          <tbody>{imobs.map(i => <tr key={i.nome} className="cursor-pointer" onClick={() => { setBusca(i.nome === 'Corretores autônomos' ? '' : i.nome); setFiltro('ativos'); setAba('corretores'); }}>
            <td className="pl-5"><div className="font-medium">{i.nome}</div>{i.gestor && <div className="muted text-[12px]">Gestor: {i.gestor}</div>}</td>
            <td className="num text-right">{i.corretores}</td><td className="num text-right">{i.ativos7}</td><td className="num text-right">{nf(i.materiais)}</td><td className="num text-right">{nf(i.envios)}</td><td className="num text-right">{nf(i.aberturas)}</td><td className="num text-right">{i.certificados}</td><td className="num text-right pr-5">{i.negocios}{i.vendas ? ' · ' + i.vendas + ' vendas' : ''}</td>
          </tr>)}</tbody>
        </table></div>}</Section>}
      {aba === 'pendentes' && <Pendentes lista={pend} recarregar={d.reload} />}
    </div>
  </>;
}

function Pendentes({ lista, recarregar }) {
  const toast = useToast();
  const decidir = async (p, ok) => { try { await rpc('decidir_acesso', { p_usuario: p.id, p_aprovar: ok }); toast(ok ? 'Acesso de ' + p.nome + ' liberado.' : 'Cadastro de ' + p.nome + ' recusado.', ok ? 'ok' : null); recarregar(); } catch (e) { toast(errMsg(e), 'erro'); } };
  if (!lista.length) return <div className="card"><Empty icon="Inbox" title="Nenhum cadastro aguardando">Quando alguém criar o acesso, aparece aqui na hora.</Empty></div>;
  return (
    <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>{lista.map(p => (
      <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
        <Avatar nome={p.nome} tone="p-amber" />
        <div className="min-w-0 flex-1" style={{ minWidth: 200 }}>
          <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{p.nome}</span><Pill tone="p-blue">{PAPEIS[p.papel]}</Pill></div>
          <div className="muted text-[13px] mt-0.5 break-all">{[p.email, p.whatsapp, p.creci && 'CRECI ' + p.creci].filter(Boolean).join(' · ')}</div>
          <div className="muted text-[12px] mt-0.5">{p.imobiliaria || 'Autônomo'} · cadastrado {relativo(p.criado_em)}</div>
        </div>
        <div className="flex gap-2"><button className="btn btn-danger btn-sm" onClick={() => decidir(p, false)}>Recusar</button><button className="btn btn-green btn-sm" onClick={() => decidir(p, true)}><Icon n="Check" size={16} />Liberar acesso</button></div>
      </div>
    ))}</div>
  );
}

function DetalheParceiro({ id, lista, recarregar }) {
  const { ir } = useNav(); const toast = useToast();
  const p = lista.find(x => x.id === id);
  const [edit, setEdit] = useState(false);
  const imobs = useLoad(() => q(supabase.from('imobiliarias').select('id,nome').order('nome')), []);
  const [f, setF] = useState(null);
  useEffect(() => { if (p) setF({ papel: p.papel, imobiliaria_id: p.imobiliaria_id || '' }); }, [p?.id, p?.papel, p?.imobiliaria_id]);
  if (!p) return <div className="pt-6">{lista.length ? <Empty icon="UserX" title="Parceiro não encontrado" /> : <Skeleton h={300} />}</div>;
  const decidir = async ok => { try { await rpc('decidir_acesso', { p_usuario: p.id, p_aprovar: ok }); toast(ok ? 'Acesso liberado.' : 'Acesso bloqueado.', ok ? 'ok' : null); recarregar(); } catch (e) { toast(errMsg(e), 'erro'); } };
  const salvar = async () => { try { await rpc('editar_parceiro', { p_usuario: p.id, p_papel: f.papel, p_imobiliaria: f.imobiliaria_id || null }); toast('Parceiro atualizado.', 'ok'); setEdit(false); recarregar(); } catch (e) { toast(errMsg(e), 'erro'); } };
  const zap = (p.whatsapp || '').replace(/\D/g, '');
  return <>
    <div className="pt-5"><button className="btn btn-text btn-sm -ml-2" onClick={() => ir('/parceiros')}><Icon n="ArrowLeft" size={16} />Parceiros</button></div>
    <PageHead eyebrow={PAPEIS[p.papel] + (p.imobiliaria ? ' · ' + p.imobiliaria : ' · Autônomo')} title={p.nome} sub={[p.email, p.whatsapp, p.creci && 'CRECI ' + p.creci].filter(Boolean).join(' · ')}>
      {zap && <a className="btn btn-green" href={'https://wa.me/55' + zap} target="_blank" rel="noopener"><Icon n="MessageCircle" size={17} />WhatsApp</a>}
      <button className="btn btn-outline" onClick={() => setEdit(true)}><Icon n="PenLine" size={16} />Editar</button>
      {p.status === 'ATIVO' ? <button className="btn btn-danger" onClick={() => decidir(false)}>Bloquear</button> : <button className="btn btn-filled" onClick={() => decidir(true)}>Liberar acesso</button>}
    </PageHead>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {[['Último acesso', p.ultimo_acesso ? relativo(p.ultimo_acesso) : 'nunca'], ['Materiais abertos', nf(p.materiais)], ['Envios', nf(p.envios)], ['Clientes abriram', nf(p.aberturas)], ['Certificados', p.certificados + '/' + p.trilhas_total], ['Negócios', p.negocios + (p.vendas ? ' · ' + p.vendas + ' vendas' : '')]].map(([k, v]) =>
        <div key={k} className="card p-3"><div className="muted text-[12px]">{k}</div><div className="text-[18px] font-medium num mt-0.5">{v}</div></div>)}
    </div>
    <Section title="O que fez na plataforma" icon="Activity"><LinhaDoTempo usuario={p.id} limite={100} compacta vazio="Ainda não usou a plataforma." /></Section>
    <p className="muted text-[12px] mt-2">Cadastrado em {dataBR(p.criado_em)}.</p>
    {edit && f && <Modal open onClose={() => setEdit(false)} title={'Editar ' + p.nome} footer={<><button className="btn btn-text" onClick={() => setEdit(false)}>Cancelar</button><button className="btn btn-filled" onClick={salvar}>Salvar</button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Perfil"><Choice value={f.papel} onChange={v => setF({ ...f, papel: v })} options={[{ value: 'corretor', label: 'Corretor' }, { value: 'gestor', label: 'Gestor da imobiliária' }]} /></Field>
        <Field label="Imobiliária" hint="O gestor vê a atividade e os negócios dos corretores da mesma imobiliária.">
          <select id="pp-imob" className="input" value={f.imobiliaria_id} onChange={e => setF({ ...f, imobiliaria_id: e.target.value })}><option value="">Autônomo</option>{(imobs.data || []).map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}</select>
        </Field>
      </div>
    </Modal>}
  </>;
}

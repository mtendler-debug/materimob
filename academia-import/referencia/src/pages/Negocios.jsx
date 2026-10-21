import React, { useEffect, useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, PageHead, Pill, Empty, Modal, Field, Choice, Section, useLoad, LoadError, useToast, Skeleton, ErrorBox, Spinner, Kpi } from '../ui.jsx';
import { STATUS_NEG, brl, brlCurto, maskMoney, moneyValue, maskPhone, errMsg, dataBR, nf } from '../lib/util.js';

const ABERTOS = ['em_negociacao', 'proposta_enviada', 'aprovada'];

export default function Negocios() {
  const { perfil } = useAuth(); const { params } = useNav();
  const admin = perfil.papel === 'admin', gestor = perfil.papel === 'gestor';
  const [filtro, setFiltro] = useState('abertos'); const [quem, setQuem] = useState(admin ? 'todos' : 'meus');
  const [edit, setEdit] = useState(params.get('novo') ? {} : null);
  const d = useLoad(() => q(supabase.from('negocios').select('*, lancamentos(nome), profiles!negocios_corretor_id_fkey(nome), imobiliarias(nome)').order('atualizado_em', { ascending: false })), []);
  useEffect(() => { const ch = supabase.channel('neg-' + perfil.id).on('postgres_changes', { event: '*', schema: 'public', table: 'negocios' }, () => d.reload()).subscribe(); return () => { supabase.removeChannel(ch); }; }, []);
  const todos = (d.data || []).filter(n => quem === 'todos' || (quem === 'meus' ? n.corretor_id === perfil.id : n.corretor_id !== perfil.id));
  const lista = todos.filter(n => filtro === 'todos' || (filtro === 'abertos' ? ABERTOS.includes(n.status) : n.status === filtro));
  const soma = s => todos.filter(n => s.includes(n.status)).reduce((a, n) => a + Number(n.valor || 0), 0);
  const podeEditar = n => admin || n.corretor_id === perfil.id;

  return <>
    <PageHead eyebrow={admin ? 'Negócios da rede' : 'Meus negócios'} title={admin ? 'Clientes em atendimento pelos parceiros' : 'Clientes que você está atendendo'} sub="Registre o cliente, o projeto e o valor, e atualize o andamento até a venda">
      {!admin && <button className="btn btn-filled" onClick={() => setEdit({})}><Icon n="Plus" size={18} />Novo negócio</button>}
    </PageHead>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi icon="Handshake" label="Em andamento" value={nf(todos.filter(n => ABERTOS.includes(n.status)).length)} hint={brlCurto(soma(ABERTOS)) + ' em potencial'} loading={d.loading} />
      <Kpi icon="FileText" label="Propostas enviadas" value={nf(todos.filter(n => n.status === 'proposta_enviada').length)} tone="p-amber" loading={d.loading} />
      <Kpi icon="Trophy" label="Vendas" value={nf(todos.filter(n => n.status === 'vendida').length)} hint={brlCurto(soma(['vendida'])) + ' vendidos'} tone="p-green" loading={d.loading} />
      <Kpi icon="XCircle" label="Perdidos" value={nf(todos.filter(n => n.status === 'perdida').length)} tone="p-grey" loading={d.loading} />
    </div>
    <div className="flex flex-wrap items-center gap-2 pt-5 pb-3">
      {[['abertos', 'Em andamento'], ['vendida', 'Vendidos'], ['perdida', 'Perdidos'], ['todos', 'Todos']].map(([k, l]) => <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{l}</button>)}
      {gestor && <><span className="flex-1" /><button className="chip" aria-pressed={quem === 'meus'} onClick={() => setQuem('meus')}>Meus</button><button className="chip" aria-pressed={quem === 'equipe'} onClick={() => setQuem('equipe')}>Da equipe</button><button className="chip" aria-pressed={quem === 'todos'} onClick={() => setQuem('todos')}>Todos</button></>}
    </div>
    <LoadError error={d.error} retry={d.reload} />
    <Section pad={false}>
      {d.loading ? <div className="p-5"><Skeleton h={120} /></div> : !lista.length ? <Empty icon="Handshake" title="Nenhum negócio aqui">{admin ? 'Os negócios registrados pelos parceiros aparecem nesta lista.' : 'Quando um cliente demonstrar interesse real, registre em Novo negócio. Assim o coordenador acompanha e ajuda você a fechar.'}</Empty> :
        <ul>{lista.map(n => (
          <li key={n.id}><button className="w-full text-left flex flex-wrap items-center gap-3 px-5 py-3.5 line-b hover:bg-[var(--soft)]" onClick={() => podeEditar(n) ? setEdit(n) : null} style={!podeEditar(n) ? { cursor: 'default' } : {}}>
            <span className="flex-1 min-w-[200px]">
              <span className="block font-medium">{n.cliente}</span>
              <span className="muted text-[12.5px]">{[n.lancamentos?.nome, n.unidade, (admin || n.corretor_id !== perfil.id) && n.profiles?.nome, admin && n.imobiliarias?.nome].filter(Boolean).join(' · ')}</span>
            </span>
            {n.valor && <span className="num text-[14px] font-medium">{brl(n.valor)}</span>}
            <span className="muted text-[12px] hidden sm:block w-20 text-right">{dataBR(n.atualizado_em)}</span>
            <Pill tone={STATUS_NEG[n.status][1]}>{STATUS_NEG[n.status][0]}</Pill>
          </button></li>
        ))}</ul>}
    </Section>
    {gestor && quem !== 'meus' && <p className="muted text-[12px] mt-2">Você vê os negócios da sua equipe. Só o próprio corretor e a Chaincorp alteram cada um.</p>}
    <EditorNegocio dados={edit} admin={admin} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); d.reload(); }} />
  </>;
}

function EditorNegocio({ dados, admin, onClose, onSaved }) {
  const { perfil } = useAuth(); const toast = useToast();
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [apagar, setApagar] = useState(false);
  const lancs = useLoad(() => q(supabase.from('lancamentos').select('id,nome').eq('ativo', true).order('ordem')), []);
  useEffect(() => { setF(dados ? { status: 'em_negociacao', ...dados, valorTxt: dados.valor ? maskMoney(String(Math.round(dados.valor * 100))) : '' } : null); setErr(''); setApagar(false); }, [dados]);
  if (!dados || !f) return null;
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(''); };
  const salvar = async () => {
    if (!f.cliente?.trim()) return setErr('Informe o nome do cliente.');
    if (!f.lancamento_id) return setErr('Escolha o projeto.');
    setBusy(true);
    try {
      const reg = { cliente: f.cliente.trim(), contato: f.contato || null, lancamento_id: f.lancamento_id, unidade: f.unidade || null, valor: f.valorTxt ? moneyValue(f.valorTxt) : null, status: f.status, observacao: f.observacao || null };
      if (f.id) await q(supabase.from('negocios').update(reg).eq('id', f.id));
      else await q(supabase.from('negocios').insert({ ...reg, corretor_id: perfil.id }));
      toast(f.id ? 'Negócio atualizado.' : 'Negócio registrado. O coordenador já consegue acompanhar.', 'ok'); onSaved();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  const remover = async () => { if (!apagar) return setApagar(true); try { await q(supabase.from('negocios').delete().eq('id', f.id)); toast('Negócio removido.'); onSaved(); } catch (e) { setErr(errMsg(e)); } };
  return (
    <Modal open onClose={onClose} title={f.id ? 'Negócio · ' + (dados.cliente || '') : 'Novo negócio'} width={620}
      footer={<>{f.id && <button className="btn btn-danger" onClick={remover}>{apagar ? 'Confirmar remoção' : 'Remover'}</button>}<span className="flex-1" /><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={busy} onClick={salvar}>{busy ? <Spinner /> : 'Salvar'}</button></>}>
      {admin && f.id && dados.profiles?.nome && <p className="muted text-[13px] mb-3">Registrado por <b style={{ color: 'var(--fg)' }}>{dados.profiles.nome}</b>{dados.imobiliarias?.nome ? ' · ' + dados.imobiliarias.nome : ''}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cliente"><input id="ng-cliente" className="input" value={f.cliente || ''} onChange={e => set('cliente', e.target.value)} placeholder="Nome do cliente" /></Field>
        <Field label="Telefone (opcional)"><input id="ng-contato" className="input num" inputMode="numeric" value={f.contato || ''} onChange={e => set('contato', maskPhone(e.target.value))} /></Field>
        <Field label="Projeto"><select id="ng-proj" className="input" value={f.lancamento_id || ''} onChange={e => set('lancamento_id', e.target.value)}><option value="">Selecione</option>{(lancs.data || []).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></Field>
        <Field label="Unidade (opcional)"><input id="ng-unid" className="input" value={f.unidade || ''} onChange={e => set('unidade', e.target.value)} placeholder="Ex.: Studio 708" /></Field>
        <Field label="Valor da unidade (opcional)"><input id="ng-valor" className="input num" inputMode="numeric" value={f.valorTxt} onChange={e => set('valorTxt', maskMoney(e.target.value))} placeholder="R$ 0,00" /></Field>
        <div className="sm:col-span-2"><Field label="Andamento"><Choice value={f.status} onChange={v => set('status', v)} options={Object.entries(STATUS_NEG).map(([k, v]) => ({ value: k, label: v[0] }))} /></Field></div>
        <div className="sm:col-span-2"><Field label="Observações"><textarea id="ng-obs" className="input" rows={3} value={f.observacao || ''} onChange={e => set('observacao', e.target.value)} placeholder="Perfil do cliente, próximos passos, dúvidas para o coordenador" /></Field></div>
      </div>
      {err && <div className="mt-4"><ErrorBox>{err}</ErrorBox></div>}
    </Modal>
  );
}

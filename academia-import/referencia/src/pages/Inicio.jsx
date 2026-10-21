import React, { useState } from 'react';
import { supabase, q, rpc } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { useNav } from '../nav.js';
import { Icon, Kpi, PageHead, Section, Pill, Avatar, Empty, Modal, Field, Choice, useLoad, LoadError, useToast, Skeleton } from '../ui.jsx';
import { brlCurto, nf, pct, diasDesde, relativo, primeiroNome, errMsg } from '../lib/util.js';
import { arteDo } from '../lib/arte.js';
import { LinhaDoTempo } from './Parceiros.jsx';

export default function Inicio() {
  const { perfil } = useAuth();
  return perfil.papel === 'admin' ? <VisaoGeral /> : <InicioParceiro />;
}

// ---------------------------------------------------------------- avisos
export function Comunicados({ limite = 3 }) {
  const { perfil } = useAuth();
  const { data } = useLoad(() => q(supabase.from('comunicados').select('*').order('criado_em', { ascending: false }).limit(10)), []);
  const lista = (data || []).filter(c => c.publico === 'todos' || (c.publico === 'gestores' && perfil.papel === 'gestor') || (c.publico === 'corretores' && perfil.papel === 'corretor')).slice(0, limite);
  if (!lista.length) return null;
  return (
    <Section title="Avisos da Chaincorp" icon="Megaphone" className="mb-4">
      <ul className="flex flex-col gap-3">{lista.map(c => (
        <li key={c.id} className="soft rounded-xl p-3.5">
          <div className="flex justify-between gap-2 text-[12px] muted"><span>{c.autor_nome || 'Chaincorp'}</span><span>{relativo(c.criado_em)}</span></div>
          <p className="text-[14px] mt-1 whitespace-pre-wrap">{c.mensagem}</p>
        </li>
      ))}</ul>
    </Section>
  );
}

export function NovoComunicado({ open, onClose, onSent }) {
  const { perfil } = useAuth(); const toast = useToast();
  const [publico, setPublico] = useState('todos'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const enviar = async () => {
    setBusy(true);
    try {
      await q(supabase.from('comunicados').insert({ publico, mensagem: msg.trim(), autor_id: perfil.id, autor_nome: perfil.nome }));
      toast('Aviso publicado para ' + { todos: 'toda a rede', gestores: 'os gestores', corretores: 'os corretores' }[publico] + '.', 'ok');
      setMsg(''); onSent?.(); onClose();
    } catch (e) { toast(errMsg(e), 'erro'); } finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Novo aviso" footer={<><button className="btn btn-text" onClick={onClose}>Cancelar</button><button className="btn btn-filled" disabled={busy || msg.trim().length < 3} onClick={enviar}>Publicar</button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Para quem"><Choice value={publico} onChange={setPublico} options={[{ value: 'todos', label: 'Todos' }, { value: 'corretores', label: 'Corretores' }, { value: 'gestores', label: 'Gestores' }]} /></Field>
        <Field label="Mensagem"><textarea id="com-msg" className="input" rows={5} value={msg} onChange={e => setMsg(e.target.value)} placeholder="Ex.: Nova tabela do Vici disponível. Condição especial até sexta." /></Field>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- corretor e gestor
function InicioParceiro() {
  const { perfil, imob } = useAuth(); const { ir } = useNav();
  const n = useLoad(() => rpc('meus_numeros'), []);
  const tr = useLoad(async () => {
    const [t, m] = await Promise.all([q(supabase.from('trilhas').select('id,titulo,nivel,ordem').eq('publicada', true).order('ordem')), rpc('minha_academia')]);
    return (t || []).map(x => ({ ...x, ...((m || []).find(y => y.trilha_id === x.id) || {}) }));
  }, []);
  const pj = useLoad(() => q(supabase.from('lancamentos').select('*').eq('ativo', true).order('ordem')), []);
  const trilhas = tr.data || [];
  const cert = trilhas.filter(t => t.aprovado || (!t.tem_quiz && t.aulas_total && t.aulas_feitas >= t.aulas_total)).length;
  const prox = trilhas.find(t => !(t.aprovado || (!t.tem_quiz && t.aulas_total && t.aulas_feitas >= t.aulas_total)));
  const num = n.data || {};
  return <>
    <PageHead eyebrow={imob?.nome || 'Corretor parceiro'} title={'Olá, ' + primeiroNome(perfil.nome)} sub="Tudo o que você precisa para apresentar e vender os projetos Chaincorp">
      <button className="btn btn-outline" onClick={() => ir('/negocios?novo=1')}><Icon n="Plus" size={17} />Novo negócio</button>
      <button className="btn btn-filled" onClick={() => ir('/projetos')}><Icon n="Send" size={17} />Enviar material</button>
    </PageHead>
    <Comunicados />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi icon="Send" label="Materiais enviados" value={nf(num.envios)} loading={n.loading} />
      <Kpi icon="Eye" label="Clientes que abriram" value={nf(num.aberturas)} tone="p-green" loading={n.loading} />
      <Kpi icon="Handshake" label="Negócios" value={nf(num.negocios)} loading={n.loading} />
      <Kpi icon="Trophy" label="Vendas" value={nf(num.vendas)} tone="p-amber" loading={n.loading} />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <Section title="Seu treinamento" icon="GraduationCap" className="lg:col-span-1">
        {tr.loading ? <Skeleton h={120} /> : !trilhas.length ? <p className="muted text-[13px]">Os treinamentos aparecem aqui.</p> : <>
          <div className="flex items-center gap-3 mb-3"><div className="progress flex-1"><span style={{ width: pct(cert, trilhas.length) + '%' }} /></div><span className="num text-[13px]">{cert}/{trilhas.length}</span></div>
          {prox ? <button className="soft rounded-xl p-3.5 w-full text-left hover:shadow" onClick={() => ir('/treinamento/' + prox.id)}>
            <div className="muted text-[12px]">{prox.aulas_feitas ? 'Continue de onde parou' : 'Próximo passo'}</div>
            <div className="font-medium mt-0.5">{prox.titulo}</div>
            <div className="muted text-[12px] mt-1">{prox.aulas_feitas || 0} de {prox.aulas_total || 0} aulas{prox.tem_quiz ? ' · com quiz' : ''}</div>
          </button> : <div className="soft rounded-xl p-3.5 flex items-center gap-2"><Icon n="Award" size={18} />Você concluiu todo o treinamento.</div>}
          <button className="btn btn-text btn-sm mt-2 -ml-2" onClick={() => ir('/treinamento')}>Ver todas as trilhas<Icon n="ArrowRight" size={15} /></button>
        </>}
      </Section>
      <Section title="Projetos para vender" icon="Building2" className="lg:col-span-2">
        {pj.loading ? <Skeleton h={160} /> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{(pj.data || []).map(l => (
          <button key={l.id} onClick={() => ir('/projetos/' + l.id)} className="rounded-xl overflow-hidden text-left line hover:shadow">
            <div style={{ aspectRatio: '16/10', background: `linear-gradient(135deg, ${l.cor1}, ${l.cor2})` }}><img src={arteDo(l, 'feed', 320)} alt="" className="w-full h-full object-cover" /></div>
            <div className="p-2.5"><div className="font-medium text-[14px] leading-tight">{l.nome}</div><div className="muted text-[12px] mt-0.5 truncate">{l.preco_desde || l.fase}</div></div>
          </button>
        ))}</div>}
      </Section>
    </div>
    <Section title="Argumentos de venda" icon="Lightbulb" className="mt-4">
      <div className="flex flex-wrap items-center gap-3"><p className="text-[14px] flex-1 min-w-[220px]">Respostas prontas para as objeções mais comuns e para escolher o projeto certo para cada cliente.</p><button className="btn btn-tonal" onClick={() => ir('/argumentos')}>Ver argumentos</button></div>
    </Section>
  </>;
}

// ---------------------------------------------------------------- administrador
function VisaoGeral() {
  const { perfil } = useAuth(); const { ir } = useNav();
  const [aviso, setAviso] = useState(false);
  const p = useLoad(() => rpc('painel_admin'), []);
  const r = useLoad(() => rpc('resumo_parceiros', { p_imob: null }), []);
  const k = p.data || {};
  const ativos = (r.data || []).filter(x => x.status === 'ATIVO' && x.papel !== 'admin');
  const parados = ativos.filter(x => (diasDesde(x.ultimo_acesso) ?? 99) > 7).sort((a, b) => (diasDesde(b.ultimo_acesso) ?? 999) - (diasDesde(a.ultimo_acesso) ?? 999));
  const top = [...ativos].map(x => ({ ...x, pts: Number(x.materiais) + Number(x.envios) * 3 + Number(x.aulas) * 2 + Number(x.negocios) * 5 })).filter(x => x.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 5);
  return <>
    <PageHead eyebrow="Gestão de parcerias" title={'Olá, ' + primeiroNome(perfil.nome)} sub="O que os corretores parceiros estão fazendo na plataforma">
      <button className="btn btn-outline" onClick={() => setAviso(true)}><Icon n="Megaphone" size={17} />Publicar aviso</button>
    </PageHead>
    <LoadError error={p.error || r.error} retry={() => { p.reload(); r.reload(); }} />
    {k.pendentes > 0 && <button className="card w-full text-left flex items-center gap-3 p-4 mb-4" style={{ background: 'var(--amber-soft, #FEF7E0)' }} onClick={() => ir('/parceiros')}>
      <Icon n="UserPlus" size={20} /><span className="flex-1"><b className="font-medium">{k.pendentes} cadastro{k.pendentes > 1 ? 's' : ''} aguardando liberação</b><span className="muted block text-[13px]">Confira e libere o acesso</span></span><Icon n="ArrowRight" size={18} />
    </button>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi icon="Users" label="Parceiros ativos" value={nf(k.parceiros)} hint={nf(k.ativos_7d) + ' acessaram em 7 dias · ' + nf(k.imobiliarias) + ' imobiliárias'} loading={p.loading} />
      <Kpi icon="Send" label="Materiais enviados" value={nf(k.envios)} hint={nf(k.envios_7d) + ' nos últimos 7 dias · ' + nf(k.aberturas) + ' aberturas'} tone="p-green" loading={p.loading} />
      <Kpi icon="GraduationCap" label="Em treinamento" value={nf(k.em_treinamento)} hint={nf(k.aulas) + ' aulas concluídas · ' + nf(k.certificados) + ' certificados'} tone="p-amber" loading={p.loading} />
      <Kpi icon="Handshake" label="Negócios em andamento" value={nf(k.negocios_abertos)} hint={brlCurto(k.vgv_aberto || 0) + ' · ' + nf(k.vendas) + ' vendas (' + brlCurto(k.vgv_vendido || 0) + ')'} loading={p.loading} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <Section title="Acontecendo agora" icon="Activity" className="lg:col-span-2"><LinhaDoTempo limite={30} vazio="Assim que os parceiros usarem a plataforma, cada ação aparece aqui." /></Section>
      <div className="flex flex-col gap-4">
        <Section title="Mais engajados" icon="Trophy">
          {r.loading ? <Skeleton h={100} /> : !top.length ? <p className="muted text-[13px]">Ainda sem atividade.</p> :
            <ul className="flex flex-col gap-1">{top.map((x, i) => <li key={x.id}><button className="w-full flex items-center gap-3 py-1.5 text-left" onClick={() => ir('/parceiros/' + x.id)}>
              <span className="num muted w-4">{i + 1}</span><Avatar nome={x.nome} size={28} /><span className="flex-1 min-w-0"><span className="block text-[14px] truncate">{x.nome}</span><span className="muted text-[12px]">{x.envios} envios · {x.certificados} cert. · {x.negocios} negócios</span></span>
            </button></li>)}</ul>}
        </Section>
        <Section title="Sem acessar há 7 dias" icon="Clock">
          {r.loading ? <Skeleton h={100} /> : !parados.length ? <p className="muted text-[13px]">Todos os parceiros acessaram nesta semana.</p> : <>
            <ul className="flex flex-col gap-1">{parados.slice(0, 6).map(x => {
              const zap = (x.whatsapp || '').replace(/\D/g, '');
              return <li key={x.id} className="flex items-center gap-2 py-1.5">
                <button className="flex-1 min-w-0 text-left" onClick={() => ir('/parceiros/' + x.id)}><span className="block text-[14px] truncate">{x.nome}</span><span className="muted text-[12px]">{x.ultimo_acesso ? relativo(x.ultimo_acesso) : 'nunca acessou'}{x.imobiliaria ? ' · ' + x.imobiliaria : ''}</span></button>
                {zap && <a className="icon-btn" style={{ width: 32, height: 32 }} href={'https://wa.me/55' + zap} target="_blank" rel="noopener" aria-label={'WhatsApp ' + x.nome}><Icon n="MessageCircle" size={16} /></a>}
              </li>;
            })}</ul>
            {parados.length > 6 && <button className="btn btn-text btn-sm mt-1 -ml-2" onClick={() => ir('/parceiros')}>Ver os {parados.length}</button>}
          </>}
        </Section>
      </div>
    </div>
    <NovoComunicado open={aviso} onClose={() => setAviso(false)} />
  </>;
}

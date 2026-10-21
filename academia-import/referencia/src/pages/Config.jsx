import React, { useState } from 'react';
import { supabase, q } from '../lib/supabase.js';
import { PageHead, Section, Icon, Pill, useLoad, LoadError, useToast } from '../ui.jsx';
import { emailOk, errMsg, relativo } from '../lib/util.js';
import { NovoComunicado } from './Inicio.jsx';

export default function Config() {
  const toast = useToast();
  const [novo, setNovo] = useState(''); const [aviso, setAviso] = useState(false);
  const adm = useLoad(() => q(supabase.from('hub_admins_iniciais').select('*').order('email')), []);
  const com = useLoad(() => q(supabase.from('comunicados').select('*').order('criado_em', { ascending: false }).limit(30)), []);
  const addAdm = async () => {
    if (!emailOk(novo)) return toast('E-mail inválido.', 'erro');
    try { await q(supabase.from('hub_admins_iniciais').insert({ email: novo.trim().toLowerCase() })); setNovo(''); adm.reload(); toast('Quando essa pessoa criar o acesso, ela entra direto como administradora.', 'ok'); } catch (e) { toast(errMsg(e), 'erro'); }
  };
  const remAdm = async e => { try { await q(supabase.from('hub_admins_iniciais').delete().eq('email', e)); adm.reload(); } catch (er) { toast(errMsg(er), 'erro'); } };
  const remCom = async id => { try { await q(supabase.from('comunicados').delete().eq('id', id)); com.reload(); toast('Aviso removido.'); } catch (e) { toast(errMsg(e), 'erro'); } };
  return <>
    <PageHead eyebrow="Administração" title="Configurações" sub="Avisos para a rede e quem administra a plataforma" />
    <LoadError error={adm.error || com.error} />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Section title="Avisos publicados" icon="Megaphone" action={<button className="btn btn-tonal btn-sm" onClick={() => setAviso(true)}><Icon n="Plus" size={16} />Novo aviso</button>}>
        <p className="muted text-[13px] mb-3">Aparecem no topo da tela inicial dos parceiros. Os três mais recentes ficam visíveis.</p>
        {!(com.data || []).length ? <p className="muted text-[13px]">Nenhum aviso publicado.</p> :
          <ul className="flex flex-col gap-2">{com.data.map(c => <li key={c.id} className="soft rounded-lg px-3 py-2.5 flex gap-2 items-start">
            <div className="flex-1 min-w-0"><div className="flex gap-2 items-center text-[12px] muted"><Pill tone="p-grey">{{ todos: 'Todos', corretores: 'Corretores', gestores: 'Gestores' }[c.publico]}</Pill>{relativo(c.criado_em)}</div><p className="text-[14px] mt-1 whitespace-pre-wrap">{c.mensagem}</p></div>
            <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => remCom(c.id)} aria-label="Remover aviso"><Icon n="Trash2" size={15} /></button>
          </li>)}</ul>}
      </Section>
      <Section title="Administradores" icon="ShieldCheck">
        <p className="muted text-[13px] mb-3">E-mails nesta lista entram como administradores, já liberados, ao criar o acesso. Administradores veem tudo e editam todo o conteúdo.</p>
        <ul className="flex flex-col gap-1 mb-3">{(adm.data || []).map(a => <li key={a.email} className="flex items-center gap-2 soft rounded-lg px-3 py-2 text-[14px]"><span className="flex-1 break-all">{a.email}</span><button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => remAdm(a.email)} aria-label={'Remover ' + a.email}><Icon n="X" size={16} /></button></li>)}</ul>
        <div className="flex gap-2"><input id="cfg-adm" className="input" value={novo} onChange={e => setNovo(e.target.value)} placeholder="email@exemplo.com" /><button className="btn btn-tonal shrink-0" onClick={addAdm}>Adicionar</button></div>
      </Section>
    </div>
    <NovoComunicado open={aviso} onClose={() => setAviso(false)} onSent={com.reload} />
  </>;
}

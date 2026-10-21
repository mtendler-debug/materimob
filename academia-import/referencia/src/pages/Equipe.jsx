import React, { useState } from 'react';
import { rpc } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { PageHead, Section, Kpi, Empty, Modal, useLoad, LoadError, Skeleton } from '../ui.jsx';
import { nf, diasDesde } from '../lib/util.js';
import { TabelaParceiros, LinhaDoTempo } from './Parceiros.jsx';

export default function Equipe() {
  const { perfil, imob } = useAuth();
  const [sel, setSel] = useState(null);
  const d = useLoad(() => rpc('resumo_parceiros', { p_imob: perfil.imobiliaria_id }), []);
  const lista = (d.data || []).filter(p => p.status === 'ATIVO');
  const soma = k => lista.reduce((a, p) => a + Number(p[k] || 0), 0);
  return <>
    <PageHead eyebrow="Gestor de imobiliária" title={'Equipe ' + (imob?.nome || '')} sub="Veja quem está usando os materiais, enviando para clientes e se capacitando" />
    <LoadError error={d.error} retry={d.reload} />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi icon="Users" label="Corretores ativos" value={lista.length} hint={lista.filter(p => (diasDesde(p.ultimo_acesso) ?? 99) <= 7).length + ' acessaram nos últimos 7 dias'} loading={d.loading} />
      <Kpi icon="Send" label="Envios a clientes" value={nf(soma('envios'))} hint={nf(soma('aberturas')) + ' clientes abriram'} tone="p-green" loading={d.loading} />
      <Kpi icon="Award" label="Com certificado" value={lista.filter(p => p.certificados > 0).length} tone="p-amber" loading={d.loading} />
      <Kpi icon="Handshake" label="Negócios" value={nf(soma('negocios'))} hint={nf(soma('vendas')) + ' vendas'} loading={d.loading} />
    </div>
    <Section title="Corretores" icon="Users" className="mt-4" pad={false}>
      {d.loading ? <div className="p-5"><Skeleton h={160} /></div> : !lista.length ? <Empty icon="Users" title="Nenhum corretor da equipe ainda">Peça aos corretores que criem o acesso escolhendo a sua imobiliária. A Chaincorp libera em seguida.</Empty> :
        <TabelaParceiros lista={lista} mostrarImob={false} onAbrir={setSel} />}
    </Section>
    {sel && <Modal open onClose={() => setSel(null)} title={sel.nome} width={640}><LinhaDoTempo usuario={sel.id} limite={60} compacta vazio="Ainda não usou a plataforma." /></Modal>}
  </>;
}

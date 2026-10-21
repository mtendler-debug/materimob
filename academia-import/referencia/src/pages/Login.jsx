import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../auth.jsx';
import { Icon, Field, Choice, ErrorBox, Spinner, useToast } from '../ui.jsx';
import { dig, emailOk, errMsg, maskPhone } from '../lib/util.js';

export const Logo = () => (
  <div className="flex items-center gap-2 mb-6">
    <span className="avatar" style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--blue)', color: 'var(--on-blue)' }}><Icon n="GraduationCap" size={22} /></span>
    <span className="text-[20px] leading-tight"><b className="font-medium">Academia de Vendas</b><span className="muted text-[12px] block">Materimob</span></span>
  </div>
);

const UFS = ['SP', 'MG', 'PR', 'RJ', 'GO', 'MS', 'SC', 'RS', 'BA', 'DF', 'ES', 'MT', 'PE', 'CE', 'TO'];
const Cartao = ({ children, onSubmit, largura = 460 }) => (
  <form className="card w-full p-6 sm:p-10 rise" style={{ maxWidth: largura, borderRadius: 28 }} onSubmit={onSubmit}>{children}</form>
);

export default function Login() {
  const [modo, setModo] = useState('entrar');
  return (
    <div className="min-h-screen px-4 flex justify-center items-start py-8 sm:py-14">
      {modo === 'entrar' && <Entrar onCadastro={() => setModo('cadastro')} onEsqueci={() => setModo('esqueci')} />}
      {modo === 'cadastro' && <Cadastro onVoltar={() => setModo('entrar')} />}
      {modo === 'esqueci' && <Esqueci onVoltar={() => setModo('entrar')} />}
    </div>
  );
}

function Entrar({ onCadastro, onEsqueci }) {
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const enviar = async e => {
    e.preventDefault(); setErr('');
    if (!emailOk(email)) return setErr('Digite um e-mail válido.');
    if (!senha) return setErr('Digite sua senha.');
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setBusy(false); if (error) setErr(errMsg(error));
  };
  return (
    <Cartao onSubmit={enviar}>
      <Logo />
      <h1 className="text-[26px] font-normal">Entrar</h1>
      <p className="muted mt-1 mb-6">Materiais, argumentos de venda e treinamento dos projetos Chaincorp</p>
      <div className="flex flex-col gap-3">
        <Field label="E-mail"><input id="lg-email" className="input" type="email" autoComplete="username" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} /></Field>
        <Field label="Senha"><input id="lg-senha" className="input" type="password" autoComplete="current-password" value={senha} onChange={e => { setSenha(e.target.value); setErr(''); }} /></Field>
      </div>
      <button type="button" className="btn btn-text btn-sm mt-2 -ml-2" onClick={onEsqueci}>Esqueci minha senha</button>
      {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
      <div className="flex items-center justify-between gap-2 mt-8">
        <button type="button" className="btn btn-text" onClick={onCadastro}>Criar meu acesso</button>
        <button className="btn btn-filled" type="submit" disabled={busy}>{busy ? <Spinner /> : 'Entrar'}</button>
      </div>
    </Cartao>
  );
}

function Esqueci({ onVoltar }) {
  const [email, setEmail] = useState(''); const [ok, setOk] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const enviar = async e => {
    e.preventDefault(); if (!emailOk(email)) return setErr('Digite um e-mail válido.');
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/' });
    setBusy(false); if (error) setErr(errMsg(error)); else setOk(true);
  };
  return (
    <Cartao onSubmit={enviar}>
      <Logo />
      <h1 className="text-[26px] font-normal">Redefinir senha</h1>
      {ok ? <p className="mt-3 leading-relaxed">Enviamos um link para <b>{email}</b>. Abra o e-mail e siga o link para criar uma nova senha.</p> : <>
        <p className="muted mt-1 mb-6">Informe o e-mail do cadastro para receber o link.</p>
        <Field label="E-mail"><input id="rs-email" className="input" type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} /></Field>
        {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
      </>}
      <div className="flex items-center justify-between gap-2 mt-8">
        <button type="button" className="btn btn-text" onClick={onVoltar}>Voltar</button>
        {!ok && <button className="btn btn-filled" type="submit" disabled={busy}>{busy ? <Spinner /> : 'Enviar link'}</button>}
      </div>
    </Cartao>
  );
}

export function NovaSenha() {
  const { setRecuperando } = useAuth(); const toast = useToast();
  const [s1, setS1] = useState(''); const [s2, setS2] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const salvar = async e => {
    e.preventDefault();
    if (s1.length < 8) return setErr('Use pelo menos 8 caracteres.');
    if (s1 !== s2) return setErr('As senhas não conferem.');
    setBusy(true); const { error } = await supabase.auth.updateUser({ password: s1 }); setBusy(false);
    if (error) return setErr(errMsg(error));
    toast('Senha atualizada.', 'ok'); setRecuperando(false);
  };
  return (
    <div className="min-h-screen px-4 flex justify-center items-start py-14">
      <Cartao onSubmit={salvar}>
        <Logo /><h1 className="text-[26px] font-normal mb-6">Criar nova senha</h1>
        <div className="flex flex-col gap-3">
          <Field label="Nova senha"><input id="ns-1" className="input" type="password" autoComplete="new-password" value={s1} onChange={e => { setS1(e.target.value); setErr(''); }} /></Field>
          <Field label="Repita a senha"><input id="ns-2" className="input" type="password" autoComplete="new-password" value={s2} onChange={e => { setS2(e.target.value); setErr(''); }} /></Field>
        </div>
        {err && <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>}
        <div className="flex justify-end mt-8"><button className="btn btn-filled" disabled={busy}>{busy ? <Spinner /> : 'Salvar senha'}</button></div>
      </Cartao>
    </div>
  );
}

function Cadastro({ onVoltar }) {
  const [f, setF] = useState({ perfil: 'corretor', vinculo: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [imobs, setImobs] = useState([]); const [feito, setFeito] = useState(false);
  const set = (k, v) => { setF(p => ({ ...p, [k]: v })); setErr(''); };
  useEffect(() => { supabase.rpc('imobiliarias_para_vinculo').then(({ data }) => setImobs(data || [])); }, []);
  const gestor = f.perfil === 'gestor';

  const validar = () => {
    if (!f.nome || f.nome.trim().split(/\s+/).length < 2) return 'Informe o nome completo.';
    if (dig(f.whatsapp).length < 11) return 'Informe o WhatsApp com DDD.';
    if (!gestor && !f.creci) return 'Informe o número do CRECI.';
    if (!f.vinculo) return gestor ? 'Escolha a sua imobiliária.' : 'Informe se você atua por uma imobiliária.';
    if (f.vinculo === 'nova' && !f.imobiliaria_nome?.trim()) return 'Escreva o nome da imobiliária.';
    if (!emailOk(f.email)) return 'Informe um e-mail válido.';
    if (!f.senha || f.senha.length < 8) return 'Crie uma senha com pelo menos 8 caracteres.';
    if (f.senha !== f.senha2) return 'As senhas não conferem.';
    return '';
  };
  const enviar = async e => {
    e.preventDefault(); const v = validar(); if (v) return setErr(v);
    setBusy(true);
    const meta = { perfil: f.perfil, nome: f.nome.trim(), whatsapp: f.whatsapp, creci: f.creci || null, uf: f.uf || null, cidade: f.cidade || null };
    if (f.vinculo === 'nova') meta.imobiliaria_nome = f.imobiliaria_nome.trim();
    else if (f.vinculo !== 'autonomo') meta.imobiliaria_id = f.vinculo;
    const { error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.senha, options: { data: meta, emailRedirectTo: window.location.origin + '/' } });
    setBusy(false);
    if (error) return setErr(errMsg(error));
    setFeito(true);
  };

  if (feito) return (
    <div className="card w-full p-6 sm:p-10 rise text-center" style={{ maxWidth: 520, borderRadius: 28 }}>
      <span className="avatar p-green mx-auto" style={{ width: 72, height: 72 }}><Icon n="CheckCircle2" size={34} /></span>
      <h1 className="text-[24px] font-normal mt-5">Cadastro enviado!</h1>
      <p className="muted mt-2 leading-relaxed">O coordenador de parcerias da Chaincorp vai liberar o seu acesso. Entre com o seu e-mail e senha para acompanhar.</p>
      <button className="btn btn-filled mt-8" onClick={onVoltar}>Ir para o login</button>
    </div>
  );

  return (
    <Cartao onSubmit={enviar} largura={620}>
      <Logo />
      <h1 className="text-[26px] font-normal">Criar meu acesso</h1>
      <p className="muted mt-1 mb-6">Leva um minuto. O coordenador de parcerias libera o acesso em seguida.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><Field label="Você é"><Choice value={f.perfil} onChange={v => { set('perfil', v); if (v === 'gestor' && f.vinculo === 'autonomo') set('vinculo', ''); }} options={[{ value: 'corretor', label: 'Corretor' }, { value: 'gestor', label: 'Dono ou gestor de imobiliária' }]} /></Field></div>
        <div className="sm:col-span-2"><Field label="Nome completo"><input id="cd-nome" className="input" value={f.nome || ''} onChange={e => set('nome', e.target.value)} autoComplete="name" /></Field></div>
        <Field label="WhatsApp"><input id="cd-whats" className="input num" inputMode="numeric" value={f.whatsapp || ''} onChange={e => set('whatsapp', maskPhone(e.target.value))} placeholder="(16) 90000-0000" /></Field>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <Field label={gestor ? 'CRECI (opcional)' : 'CRECI'}><input id="cd-creci" className="input" value={f.creci || ''} onChange={e => set('creci', e.target.value)} /></Field>
          <Field label="UF"><select id="cd-uf" className="input" value={f.uf || ''} onChange={e => set('uf', e.target.value)}><option value="">--</option>{UFS.map(u => <option key={u}>{u}</option>)}</select></Field>
        </div>
        <div className="sm:col-span-2"><Field label={gestor ? 'Sua imobiliária' : 'Você atua por qual imobiliária?'}>
          <select id="cd-vinculo" className="input" value={f.vinculo} onChange={e => set('vinculo', e.target.value)}>
            <option value="">Selecione</option>
            {!gestor && <option value="autonomo">Sou corretor autônomo</option>}
            {imobs.map(i => <option key={i.id} value={i.id}>{i.nome} · {i.cidade}</option>)}
            <option value="nova">Minha imobiliária não está na lista</option>
          </select></Field></div>
        {f.vinculo === 'nova' && <>
          <Field label="Nome da imobiliária"><input id="cd-imob-nome" className="input" value={f.imobiliaria_nome || ''} onChange={e => set('imobiliaria_nome', e.target.value)} /></Field>
          <Field label="Cidade"><input id="cd-cidade" className="input" value={f.cidade || ''} onChange={e => set('cidade', e.target.value)} /></Field>
        </>}
        <div className="sm:col-span-2"><Field label="E-mail"><input id="cd-email" className="input" type="email" autoComplete="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></Field></div>
        <Field label="Crie uma senha" hint="Mínimo de 8 caracteres"><input id="cd-senha" className="input" type="password" autoComplete="new-password" value={f.senha || ''} onChange={e => set('senha', e.target.value)} /></Field>
        <Field label="Repita a senha"><input id="cd-senha2" className="input" type="password" autoComplete="new-password" value={f.senha2 || ''} onChange={e => set('senha2', e.target.value)} /></Field>
      </div>
      {err && <div className="mt-4"><ErrorBox>{err}</ErrorBox></div>}
      <div className="flex items-center justify-between gap-2 mt-8">
        <button type="button" className="btn btn-text" onClick={onVoltar}>Já tenho acesso</button>
        <button type="submit" className="btn btn-filled" disabled={busy}>{busy ? <Spinner /> : 'Enviar cadastro'}</button>
      </div>
    </Cartao>
  );
}

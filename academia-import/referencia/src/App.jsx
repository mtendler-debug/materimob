import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavCtx, useNav } from './nav.js';
import { configurado, supabase } from './lib/supabase.js';
import { AuthProvider, useAuth } from './auth.jsx';
import { Icon, Spinner, ToastProvider, Avatar } from './ui.jsx';
import { PAPEIS } from './lib/util.js';
import Login, { NovaSenha } from './pages/Login.jsx';
import Pendente from './pages/Pendente.jsx';
import Inicio from './pages/Inicio.jsx';
import Projetos from './pages/Projetos.jsx';
import Treinamento from './pages/Academia.jsx';
import Argumentos from './pages/Argumentos.jsx';
import Negocios from './pages/Negocios.jsx';
import Parceiros from './pages/Parceiros.jsx';
import Equipe from './pages/Equipe.jsx';
import Config from './pages/Config.jsx';
import LinkPublico from './pages/LinkPublico.jsx';

function useRota() {
  const ler = () => ({ path: window.location.pathname, search: window.location.search, hash: window.location.hash, n: Date.now() });
  const [loc, setLoc] = useState(ler);
  useEffect(() => { const f = () => setLoc(ler()); window.addEventListener('popstate', f); return () => window.removeEventListener('popstate', f); }, []);
  const ir = (p) => { window.history.pushState({}, '', p); setLoc(ler()); window.scrollTo({ top: 0 }); };
  return [loc, ir];
}

const PAGINAS = {
  inicio: { label: 'Início', icon: 'LayoutDashboard', path: '/', C: Inicio },
  parceiros: { label: 'Parceiros', icon: 'Users', path: '/parceiros', C: Parceiros },
  equipe: { label: 'Minha equipe', icon: 'Users', path: '/equipe', C: Equipe },
  projetos: { label: 'Projetos', icon: 'Building', path: '/projetos', C: Projetos },
  treinamento: { label: 'Treinamento', icon: 'GraduationCap', path: '/treinamento', C: Treinamento },
  argumentos: { label: 'Argumentos', icon: 'MessageSquareQuote', path: '/argumentos', C: Argumentos },
  negocios: { label: 'Negócios', icon: 'Handshake', path: '/negocios', C: Negocios },
  config: { label: 'Configurações', icon: 'Settings', path: '/config', C: Config },
};
const NAV = {
  corretor: ['inicio', 'projetos', 'treinamento', 'argumentos', 'negocios'],
  gestor: ['inicio', 'projetos', 'treinamento', 'argumentos', 'negocios', 'equipe'],
  admin: ['inicio', 'parceiros', 'negocios', 'projetos', 'treinamento', 'argumentos', 'config'],
};

export default function App() {
  const path = window.location.pathname;
  if (path.startsWith('/p/')) return <ToastProvider><LinkPublico token={path.split('/')[2]} /></ToastProvider>;
  if (!configurado) return <Configurar />;
  return <ToastProvider><AuthProvider><Portao /></AuthProvider></ToastProvider>;
}

function Configurar() {
  return (
    <div className="mx-auto max-w-[620px] px-4 py-16">
      <div className="card p-8">
        <Icon n="PlugZap" size={32} className="muted" />
        <h1 className="text-[24px] mt-3">Falta conectar o banco de dados</h1>
        <p className="muted mt-2 leading-relaxed">Cadastre as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Netlify e publique de novo.</p>
      </div>
    </div>
  );
}

const Carregando = () => <div className="min-h-[60vh] grid place-items-center muted"><div className="flex items-center gap-3"><Spinner />Carregando…</div></div>;

function Portao() {
  const { session, perfil, recuperando, carregandoPerfil } = useAuth();
  if (session === undefined) return <Carregando />;
  if (recuperando) return <NovaSenha />;
  if (!session) return <Login />;
  if (!perfil) return carregandoPerfil ? <Carregando /> : <Pendente semPerfil />;
  if (perfil.status !== 'ATIVO') return <Pendente />;
  return <Shell />;
}

function Shell() {
  const { perfil, imob } = useAuth();
  const [loc, ir] = useRota();
  const itens = NAV[perfil.papel] || NAV.corretor;
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => { supabase.rpc('registrar_presenca'); }, []);

  useEffect(() => {
    if (perfil.papel !== 'admin') return;
    const contar = async () => {
      const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'PENDENTE_APROVACAO');
      setPendentes(count || 0);
    };
    contar();
    const ch = supabase.channel('pendentes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, contar).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [perfil]);

  const atual = useMemo(() => {
    const seg = '/' + (loc.path.split('/')[1] || '');
    const k = Object.keys(PAGINAS).find(k => PAGINAS[k].path === seg) || 'inicio';
    return itens.includes(k) ? k : 'inicio';
  }, [loc.path, itens]);

  const ctx = { path: loc.path, loc, params: new URLSearchParams(loc.search), ir, pelaImob: Boolean(perfil.imobiliaria_id), pendentes };
  const badge = k => (k === 'parceiros' ? pendentes : 0);
  const Pagina = PAGINAS[atual].C;
  const ehAdmin = perfil.papel === 'admin';

  return (
    <NavCtx.Provider value={ctx}>
      <Header itens={itens} />
      <div className="mx-auto max-w-[1360px] flex">
        <nav className="hidden lg:flex flex-col gap-1 w-[232px] shrink-0 px-3 pt-4 sticky self-start" style={{ top: 'calc(env(safe-area-inset-top,0px) + 70px)' }} aria-label="Menu principal">
          {itens.map((k, i) => (
            <React.Fragment key={k}>
              {ehAdmin && i === 3 && <div className="eyebrow px-4 pt-4 pb-1">Conteúdo</div>}
              <a href={PAGINAS[k].path} className="nav-item" aria-current={atual === k ? 'page' : undefined} onClick={e => { e.preventDefault(); ir(PAGINAS[k].path); }}>
                <Icon n={PAGINAS[k].icon} size={20} /><span className="flex-1">{k === 'inicio' && ehAdmin ? 'Visão geral' : PAGINAS[k].label}</span>
                {badge(k) > 0 && <span className="count">{badge(k)}</span>}
              </a>
            </React.Fragment>
          ))}
          <div className="muted text-[11px] px-4 pt-6 leading-relaxed">{imob ? <>Imobiliária<br /><b style={{ color: 'var(--fg)' }}>{imob.nome}</b></> : PAPEIS[perfil.papel]}</div>
        </nav>
        <main className="flex-1 min-w-0 px-4 sm:px-6 pb-28 lg:pb-16"><Pagina /></main>
      </div>
      <nav className="bottom-nav lg:hidden flex" aria-label="Menu">
        {itens.slice(0, 5).map(k => (
          <a key={k} href={PAGINAS[k].path} className="bottom-item relative" aria-current={atual === k ? 'page' : undefined} onClick={e => { e.preventDefault(); ir(PAGINAS[k].path); }}>
            <Icon n={PAGINAS[k].icon} size={22} /><span className="truncate max-w-full">{k === 'inicio' && ehAdmin ? 'Geral' : PAGINAS[k].label}</span>
            {badge(k) > 0 && <span className="count absolute top-1 right-[22%]">{badge(k)}</span>}
          </a>
        ))}
      </nav>
    </NavCtx.Provider>
  );
}

function useOutside(ref, fn) {
  useEffect(() => { const h = e => { if (ref.current && !ref.current.contains(e.target)) fn(); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [ref, fn]);
}

function Header({ itens }) {
  const { perfil, imob, sair } = useAuth();
  const { ir } = useNav();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState(''); const [aberto, setAberto] = useState(false); const [base, setBase] = useState(null);
  const mRef = useRef(null), sRef = useRef(null);
  useOutside(mRef, () => setMenu(false)); useOutside(sRef, () => setAberto(false));
  const ehAdmin = perfil.papel === 'admin';

  const carregarBase = async () => {
    if (base) return;
    const [l, t, a, p] = await Promise.all([
      supabase.from('lancamentos').select('id,nome,local,fase').eq('ativo', true),
      supabase.from('trilhas').select('id,titulo').eq('publicada', true),
      supabase.from('abordagens').select('id,titulo,etapa').eq('status', 'publicada'),
      ehAdmin ? supabase.from('profiles').select('id,nome,email').neq('papel', 'admin') : Promise.resolve({ data: [] }),
    ]);
    setBase({ l: l.data || [], t: t.data || [], a: a.data || [], p: p.data || [] });
  };
  const termo = q.trim().toLowerCase();
  const res = base && termo.length >= 2 ? {
    l: base.l.filter(x => (x.nome + ' ' + x.local).toLowerCase().includes(termo)).slice(0, 4),
    t: base.t.filter(x => x.titulo.toLowerCase().includes(termo)).slice(0, 4),
    a: base.a.filter(x => x.titulo.toLowerCase().includes(termo)).slice(0, 4),
    p: base.p.filter(x => (x.nome + ' ' + x.email).toLowerCase().includes(termo)).slice(0, 4),
  } : null;
  const total = res ? res.l.length + res.t.length + res.a.length + res.p.length : 0;
  const pick = p => { ir(p); setAberto(false); setQ(''); };

  return (
    <header className="header line-b">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <a href="/" onClick={e => { e.preventDefault(); ir('/'); }} className="flex items-center gap-2.5 shrink-0">
          <span className="avatar" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--blue)', color: 'var(--on-blue)' }}><Icon n="GraduationCap" size={20} /></span>
          <span className="leading-tight"><span className="text-[16px] sm:text-[17px] block"><b className="font-medium">Academia de Vendas</b></span><span className="muted text-[11px] hidden sm:block">Materimob</span></span>
        </a>
        <div ref={sRef} className="relative order-3 lg:order-none w-full lg:w-auto lg:flex-1 lg:max-w-[560px] lg:mx-auto">
          <div className="flex items-center gap-2 rounded-full px-4" style={{ background: 'var(--soft)', height: 44 }}>
            <Icon n="Search" size={19} className="muted" />
            <input id="busca" className="flex-1 bg-transparent outline-none min-w-0 text-[15px]" style={{ color: 'var(--fg)' }}
              placeholder={ehAdmin ? 'Buscar projeto, aula, argumento ou parceiro' : 'Buscar projeto, aula ou argumento'}
              value={q} onFocus={() => { setAberto(true); carregarBase(); }} onChange={e => { setQ(e.target.value); setAberto(true); }} aria-label="Buscar" />
            {q && <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => setQ('')} aria-label="Limpar busca"><Icon n="X" size={16} /></button>}
          </div>
          {aberto && res && (
            <div className="pop left-0 right-0 mt-2 py-2 max-h-[60vh] overflow-auto">
              {total === 0 && <p className="muted px-4 py-3 text-[13px]">Nada encontrado para “{q}”.</p>}
              {res.l.length > 0 && <><div className="eyebrow px-4 pt-2 pb-1">Projetos</div>{res.l.map(x => <button key={x.id} className="menu-item" onClick={() => pick('/projetos/' + x.id)}><Icon n="Building" size={18} className="muted" /><span className="flex-1"><span className="block font-medium">{x.nome}</span><span className="muted text-[12px]">{x.local}</span></span></button>)}</>}
              {res.t.length > 0 && <><div className="eyebrow px-4 pt-2 pb-1">Treinamento</div>{res.t.map(x => <button key={x.id} className="menu-item" onClick={() => pick('/treinamento/' + x.id)}><Icon n="GraduationCap" size={18} className="muted" /><span className="flex-1">{x.titulo}</span></button>)}</>}
              {res.a.length > 0 && <><div className="eyebrow px-4 pt-2 pb-1">Argumentos</div>{res.a.map(x => <button key={x.id} className="menu-item" onClick={() => pick('/argumentos?busca=' + encodeURIComponent(x.titulo))}><Icon n="MessageSquareQuote" size={18} className="muted" /><span className="flex-1">{x.titulo}</span></button>)}</>}
              {res.p.length > 0 && <><div className="eyebrow px-4 pt-2 pb-1">Parceiros</div>{res.p.map(x => <button key={x.id} className="menu-item" onClick={() => pick('/parceiros/' + x.id)}><Icon n="User" size={18} className="muted" /><span className="flex-1"><span className="block">{x.nome}</span><span className="muted text-[12px]">{x.email}</span></span></button>)}</>}
            </div>
          )}
        </div>
        <div ref={mRef} className="relative ml-auto lg:ml-0">
          <button className="flex items-center gap-2 rounded-full pl-1 pr-3" style={{ height: 44, border: '1px solid var(--line)', background: 'var(--surface)' }} onClick={() => setMenu(!menu)} aria-haspopup="menu" aria-expanded={menu}>
            <Avatar nome={perfil.nome} size={34} />
            <span className="text-left leading-tight hidden sm:block"><span className="block text-[13px] font-medium max-w-[160px] truncate">{perfil.nome}</span><span className="block muted text-[11px]">{PAPEIS[perfil.papel]}</span></span>
            <Icon n="ChevronDown" size={16} className="muted" />
          </button>
          {menu && (
            <div className="pop right-0 mt-2 py-2" style={{ width: 280 }} role="menu">
              <div className="px-4 py-2"><div className="font-medium">{perfil.nome}</div><div className="muted text-[12px] break-all">{perfil.email}</div>{imob && <div className="muted text-[12px] mt-1">{imob.nome}</div>}</div>
              <button role="menuitem" className="menu-item" onClick={sair}><Icon n="LogOut" size={18} />Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

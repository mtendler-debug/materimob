import React from 'react';
import { useAuth } from '../auth.jsx';
import { Icon } from '../ui.jsx';
import { Logo } from './Login.jsx';
import { PAPEIS } from '../lib/util.js';

export default function Pendente({ semPerfil }) {
  const { perfil, sair, recarregar } = useAuth();
  const rejeitado = perfil?.status === 'REJEITADO';
  return (
    <div className="min-h-screen px-4 flex justify-center items-start py-14">
      <div className="card w-full p-6 sm:p-10 rise text-center" style={{ maxWidth: 520, borderRadius: 28 }}>
        <div className="flex justify-center"><Logo /></div>
        <span className={'avatar mx-auto ' + (rejeitado ? 'p-red' : 'p-amber')} style={{ width: 72, height: 72 }}><Icon n={rejeitado ? 'ShieldX' : 'Hourglass'} size={34} /></span>
        {semPerfil ? <>
          <h1 className="text-[24px] font-normal mt-5">Cadastro incompleto</h1>
          <p className="muted mt-2">Não encontramos o seu perfil. Fale com o coordenador de parcerias da Chaincorp.</p>
        </> : rejeitado ? <>
          <h1 className="text-[24px] font-normal mt-5">Acesso não liberado</h1>
          <p className="muted mt-2 leading-relaxed">Se acredita que houve um engano, fale com o coordenador de parcerias da Chaincorp.</p>
        </> : <>
          <h1 className="text-[24px] font-normal mt-5">Cadastro em análise</h1>
          <p className="muted mt-2 leading-relaxed">Recebemos o seu cadastro. Assim que o coordenador de parcerias liberar o acesso, esta tela abre sozinha.</p>
          <div className="soft rounded-2xl p-4 mt-6 text-left flex flex-col gap-2 text-[13px]">
            <div className="flex justify-between gap-3"><span className="muted">Nome</span><span className="text-right">{perfil.nome}</span></div>
            <div className="flex justify-between gap-3"><span className="muted">Perfil</span><span>{PAPEIS[perfil.papel]}</span></div>
          </div>
        </>}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          <button className="btn btn-text" onClick={sair}>Sair</button>
          {!rejeitado && <button className="btn btn-tonal" onClick={recarregar}><Icon n="RotateCw" size={16} />Verificar agora</button>}
        </div>
      </div>
    </div>
  );
}

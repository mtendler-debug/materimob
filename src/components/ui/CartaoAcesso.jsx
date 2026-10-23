// Moldura das telas de acesso (login, convite, nova senha, cadastro): cartão translúcido sobre um brilho azul suave.
export default function CartaoAcesso({ children, largo = false, fundo }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background:
          fundo || "radial-gradient(900px 480px at 50% -10%, var(--color-brand-soft), transparent 70%), var(--color-bg)",
      }}
    >
      <div
        className={`w-full rounded-sheet border border-white/80 bg-white/90 p-7 shadow-float ring-1 ring-slate-200/60 backdrop-blur-xl sm:p-9 ${
          largo ? "max-w-[460px]" : "max-w-[400px]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

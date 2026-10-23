import { useEffect } from "react";

// Diálogo com fundo desfocado. Fecha com Esc e ao clicar fora. No celular sobe como folha
// colada na base (alcance do polegar); no desktop fica centralizado.
export default function Modal({ open, onClose, title, children, footer, className = "" }) {
  useEffect(() => {
    if (!open) return;
    const fechar = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", fechar);
    return () => document.removeEventListener("keydown", fechar);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/30 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-sheet border border-white/60 bg-white/95 p-6 shadow-float backdrop-blur-xl sm:rounded-sheet ${className}`}
      >
        {title && <h2 className="text-title font-semibold tracking-tight text-charcoal">{title}</h2>}
        <div className={title ? "mt-3" : ""}>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

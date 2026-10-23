import { Link } from "react-router-dom";

// Variantes: primary (CTA, 1 por tela), secondary (borda), ghost (texto), danger.
// Altura mínima de 44px no toque (md) — alvo confortável para o polegar.
const VARIANTES = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  dark: "bg-charcoal text-white hover:bg-slate-700",
  secondary: "border border-slate-200 bg-white text-charcoal hover:border-slate-300 hover:bg-slate-50",
  ghost: "text-graytext hover:bg-light hover:text-charcoal",
  danger: "bg-danger-bg text-danger-text hover:brightness-95",
};

const TAMANHOS = {
  sm: "min-h-9 px-3 text-body-sm",
  md: "min-h-11 px-5 text-body-sm",
  lg: "min-h-12 px-6 text-body",
};

export function classesBotao({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-control font-semibold",
    "transition-all duration-200 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTES[variant],
    TAMANHOS[size],
    block && "w-full",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

// `to` renderiza um <Link>, `href` um <a>, senão um <button>.
export default function Button({ variant, size, block, className, to, href, type = "button", ...props }) {
  const cls = classesBotao({ variant, size, block, className });
  if (to) return <Link to={to} className={cls} {...props} />;
  if (href) return <a href={href} className={cls} {...props} />;
  return <button type={type} className={cls} {...props} />;
}

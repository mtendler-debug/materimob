import { useId } from "react";

export const classesCampo =
  "min-h-11 w-full rounded-control border border-slate-200 bg-white px-3.5 text-body-sm text-charcoal " +
  "placeholder:text-muted transition-all duration-200 ease-out hover:border-slate-300 " +
  "focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:bg-light disabled:text-muted";

// Campo com rótulo opcional e mensagem de ajuda/erro. Repassa o resto ao <input>.
export default function Input({ label, hint, error, className = "", id, ...props }) {
  const auto = useId();
  const campo = id ?? auto;
  return (
    <div>
      {label && (
        <label htmlFor={campo} className="mb-1.5 block text-caption font-medium text-graytext">
          {label}
        </label>
      )}
      <input id={campo} aria-invalid={error ? true : undefined} className={`${classesCampo} ${className}`} {...props} />
      {(error || hint) && (
        <p className={`mt-1.5 text-caption ${error ? "text-danger-text" : "text-graytext"}`}>{error || hint}</p>
      )}
    </div>
  );
}

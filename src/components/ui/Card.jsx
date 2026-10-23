// Superfície padrão: borda de 1px translúcida + sombra difusa opcional. `as` troca a tag.
export default function Card({ as: Tag = "div", soft = false, padded = true, className = "", ...props }) {
  return (
    <Tag
      className={[
        "rounded-card border border-slate-200/70 bg-surface",
        soft && "shadow-soft",
        padded && "p-5 sm:p-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

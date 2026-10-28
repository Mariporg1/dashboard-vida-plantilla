/** Marca: "vida" con el nodo verde, el mismo que marca "ahora" en la línea del día. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold tracking-[-0.04em] ${className}`}>
      <span className="relative inline-flex size-2.5 items-center justify-center" aria-hidden>
        <span className="absolute size-2.5 rounded-full bg-accent-soft/30" />
        <span className="size-1.5 rounded-full bg-accent-soft" />
      </span>
      vida
    </span>
  );
}

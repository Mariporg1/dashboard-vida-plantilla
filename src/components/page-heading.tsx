/** Título de pestaña: grande y ligero, como el saludo de Hoy. A la derecha, la navegación o acciones. */
export function PageHeading({ title, subtitle, children }: { title: React.ReactNode; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-[2rem] font-light leading-[1.05] tracking-[-0.035em] first-letter:uppercase sm:text-[2.75rem]">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-1 text-sm">{children}</div>}
    </div>
  );
}

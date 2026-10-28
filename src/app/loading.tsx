import { Wordmark } from "@/components/wordmark";

// Se muestra al instante al cambiar de pestaña mientras llega la página. Imita la cabecera y las tarjetas.
export default function Loading() {
  return (
    <>
      {/* Solo la barra vacía: así sale al instante sin esperar a leer los ajustes. */}
      <div className="sticky top-0 z-30 h-[88px] bg-bar text-[var(--bar-fg)] md:h-14">
        <div className="mx-auto flex h-12 max-w-6xl items-center px-4 text-lg md:h-14">
          <Wordmark />
        </div>
      </div>
      <main className="mx-auto max-w-6xl animate-pulse space-y-6 px-4 pb-4 pt-8 sm:pt-12" aria-busy="true" aria-label="Cargando">
        <div className="space-y-3">
          <div className="h-10 w-64 max-w-full rounded-full bg-raised" />
          <div className="h-4 w-40 rounded-full bg-raised" />
        </div>
        <div className="card h-40" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="card h-64" />
          <div className="card h-64" />
        </div>
      </main>
    </>
  );
}

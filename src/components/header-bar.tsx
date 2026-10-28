"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./user-menu";
import { Wordmark } from "./wordmark";

export function HeaderBar({ links, name }: { links: { href: string; label: string }[]; name: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 bg-bar text-[var(--bar-fg)]">
      {/* En el móvil, dos filas: marca y menú arriba, pestañas abajo a todo el ancho. Así caben todas sin desplazar. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 md:h-14 md:flex-nowrap">
        <Link href="/" className="flex h-12 items-center text-lg md:h-auto" aria-label="Inicio">
          <Wordmark />
        </Link>
        <nav
          className={`no-scrollbar order-last flex h-10 w-full min-w-0 items-center overflow-x-auto overflow-y-hidden border-t border-white/10 md:order-none md:h-full md:w-auto md:flex-1 md:justify-center md:gap-0.5 md:border-t-0 ${
            links.length > 4 ? "justify-between" : "gap-4"
          }`}
        >
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                // Precarga la pestaña entera al abrir la página: al pulsar ya está lista.
                prefetch
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center whitespace-nowrap px-0.5 text-[11px] font-medium uppercase tracking-[0.04em] transition-colors duration-150 md:px-2.5 md:text-[12px] md:tracking-[0.06em] ${
                  active ? "text-[var(--bar-fg)]" : "text-[var(--bar-muted)] hover:text-[var(--bar-fg)]"
                }`}
              >
                {l.label}
                {active && <span className="absolute inset-x-0.5 bottom-0 h-0.5 rounded-full bg-accent-soft md:inset-x-2.5" aria-hidden />}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto shrink-0 md:ml-0">
          <UserMenu name={name} />
        </div>
      </div>
    </header>
  );
}

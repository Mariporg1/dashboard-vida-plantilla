"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings2 } from "lucide-react";
import { ThemePicker } from "./theme-toggle";

/** Menú desplegable de arriba a la derecha: bienvenida, tema, ajustes y salir. */
export function UserMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menú: ajustes y salir"
        className="inline-flex h-8 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 text-[var(--bar-muted)] transition-colors duration-150 hover:bg-white/10 hover:text-[var(--bar-fg)] active:scale-[0.97]"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-[var(--bar-fg)] text-[12px] font-semibold text-[var(--bar)]">
          {initial || <Settings2 className="size-3.5" strokeWidth={2} aria-hidden />}
        </span>
        <ChevronDown className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>

      <div
        role="menu"
        className={`absolute right-0 top-full z-40 mt-2 w-72 origin-top-right rounded-2xl border border-line bg-surface p-2 text-fg shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] ${
          open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0"
        }`}
      >
        <div className="px-3 pb-3 pt-2">
          <p className="text-[15px] font-medium">{name ? `Hola, ${name}` : "Hola"}</p>
          <p className="mt-0.5 text-[13px] text-muted">Bienvenido a tu dashboard. Desde aquí lo configuras todo.</p>
        </div>
        <div className="px-1 pb-2">
          <ThemePicker />
        </div>
        <div className="border-t border-line pt-1">
          <Link
            href="/ajustes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150 hover:bg-raised"
          >
            <Settings2 className="size-4 text-muted" strokeWidth={1.75} aria-hidden />
            <span>
              <span className="block">Ajustes</span>
              <span className="block text-[12px] text-muted">Pestañas, tu nombre y conexiones</span>
            </span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 hover:bg-raised"
          >
            <LogOut className="size-4 text-muted" strokeWidth={1.75} aria-hidden />
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}

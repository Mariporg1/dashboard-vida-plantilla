"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { toggleDismissed } from "../sync-actions";

/** Marca una entrega como hecha o la vuelve a dejar pendiente. */
export function DoneToggle({ id, done }: { id: number; done: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => toggleDismissed(id))}
      disabled={pending}
      className="btn-ghost shrink-0 text-[13px] disabled:opacity-60"
    >
      {done ? <RotateCcw className="size-3.5" strokeWidth={1.75} aria-hidden /> : <Check className="size-3.5" strokeWidth={1.75} aria-hidden />}
      {done ? "Desmarcar" : "Hecha"}
    </button>
  );
}

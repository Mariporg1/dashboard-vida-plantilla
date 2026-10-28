"use client";

import { useTransition } from "react";
import { RotateCcw, X } from "lucide-react";
import { toggleClassOnDay } from "../actions";

export function ClassToggle({ slotId, date, cancelled, subject }: { slotId: number; date: string; cancelled: boolean; subject: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => start(() => toggleClassOnDay(slotId, date))}
      className="-m-0.5 shrink-0 rounded-full p-0.5 text-muted transition-colors duration-150 hover:bg-[var(--control)]/40 hover:text-fg disabled:opacity-50"
      title={cancelled ? `Volver a poner ${subject} este día` : `Quitar ${subject} solo este día`}
      aria-label={cancelled ? `Volver a poner ${subject} este día` : `Quitar ${subject} solo este día`}
    >
      {cancelled ? <RotateCcw className="size-3.5" strokeWidth={1.75} /> : <X className="size-3.5" strokeWidth={1.75} />}
    </button>
  );
}

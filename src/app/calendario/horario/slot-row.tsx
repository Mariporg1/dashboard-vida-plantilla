"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ClassSlot } from "@/db/schema";
import { deleteSlot } from "../actions";
import { SlotForm } from "./slot-form";

export function SlotRow({ slot, color }: { slot: ClassSlot; color: string }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="p-4">
        <SlotForm slot={slot} onDone={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${pending ? "opacity-50" : ""}`}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{slot.subject}</p>
        <p className="text-[13px] tabular-nums text-muted">
          {slot.startTime}–{slot.endTime}{slot.location ? ` · ${slot.location}` : ""}
        </p>
      </div>
      <button onClick={() => setEditing(true)} className="btn-ghost text-sm" aria-label={`Editar ${slot.subject}`}>
        <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Editar</span>
      </button>
      <button
        onClick={() => confirm(`¿Borrar ${slot.subject} de tu horario (todas las semanas)?`) && start(() => deleteSlot(slot.id))}
        className="btn-ghost text-sm hover:text-danger"
        aria-label={`Borrar ${slot.subject}`}
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Borrar</span>
      </button>
    </li>
  );
}

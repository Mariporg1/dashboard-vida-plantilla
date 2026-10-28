"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { WorkShift } from "@/db/schema";
import { madridDateKey, madridTime } from "@/lib/dates";
import { formatMinutes, minutesBetween } from "@/lib/work";
import { deleteShift } from "./actions";
import { ShiftForm } from "./shift-form";

export function ShiftRow({ shift }: { shift: WorkShift }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  if (editing) {
    return (
      <li className="p-4">
        <ShiftForm shift={shift} defaultDate={madridDateKey(shift.startAt)} onDone={() => setEditing(false)} />
      </li>
    );
  }
  const minutes = minutesBetween([shift], shift.startAt, shift.endAt ?? new Date(8.64e15));
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="tabular-nums">
          {madridTime(shift.startAt)} – {shift.endAt ? madridTime(shift.endAt) : <span className="text-accent">en curso</span>}
          <span className="text-muted"> · {formatMinutes(minutes)}</span>
        </p>
        {shift.note && <p className="break-words text-[13px] text-muted">{shift.note}</p>}
      </div>
      {shift.endAt && (
        <button onClick={() => setEditing(true)} className="btn-ghost text-sm" aria-label="Editar turno">
          <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Editar</span>
        </button>
      )}
      <button
        onClick={() => confirm("¿Borrar este turno?") && start(() => deleteShift(shift.id))}
        className="btn-ghost text-sm hover:text-danger"
        aria-label="Borrar turno"
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
        <span className="hidden sm:inline">Borrar</span>
      </button>
    </li>
  );
}

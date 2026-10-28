"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { WorkShift } from "@/db/schema";
import { madridDateKey, madridTime } from "@/lib/dates";
import { saveShift, type ShiftFormState } from "./actions";

export function ShiftForm({ shift, defaultDate, onDone }: { shift?: WorkShift; defaultDate: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState<ShiftFormState, FormData>(saveShift.bind(null, shift?.id ?? null), {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (shift) onDone?.();
    else ref.current?.reset();
  }, [state.nonce, state.ok, shift, onDone]);

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
    >
      <label className="col-span-2 space-y-1">
        <span className="text-[13px] text-muted">Día</span>
        <input type="date" name="date" required defaultValue={shift ? madridDateKey(shift.startAt) : defaultDate} className="input w-full" />
      </label>
      <label className="space-y-1">
        <span className="text-[13px] text-muted">Entrada</span>
        <input type="time" name="start" required defaultValue={shift ? madridTime(shift.startAt) : ""} className="input w-full" />
      </label>
      <label className="space-y-1">
        <span className="text-[13px] text-muted">Salida</span>
        <input type="time" name="end" required defaultValue={shift?.endAt ? madridTime(shift.endAt) : ""} className="input w-full" />
      </label>
      <input name="note" maxLength={200} placeholder="Nota (opcional)" defaultValue={shift?.note ?? ""} className="input col-span-2 sm:col-span-4" />
      <div className="col-span-2 sm:col-span-4 flex items-center gap-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : shift ? "Guardar" : "Añadir turno"}</button>
        {shift && <button type="button" onClick={onDone} className="btn-ghost">Cancelar</button>}
        {state.error && <p className="text-danger" role="alert">{state.error}</p>}
        {!state.error && state.ok && !shift && <p className="text-muted" role="status">Turno guardado.</p>}
      </div>
    </form>
  );
}

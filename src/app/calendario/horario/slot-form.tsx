"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { ClassSlot } from "@/db/schema";
import { defaultTerm } from "@/lib/academic-calendar";
import { madridDateKey } from "@/lib/dates";
import { saveSlot, type SlotFormState } from "../actions";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function SlotForm({ slot, onDone }: { slot?: ClassSlot; onDone?: () => void }) {
  const [state, action, pending] = useActionState<SlotFormState, FormData>(saveSlot.bind(null, slot?.id ?? null), {});
  const ref = useRef<HTMLFormElement>(null);
  const term = defaultTerm(madridDateKey(new Date()));

  useEffect(() => {
    if (!state.ok) return;
    if (slot) onDone?.();
    else ref.current?.reset();
  }, [state.nonce, state.ok, slot, onDone]);

  return (
    <form ref={ref} onSubmit={(e) => submitKeepingValues(e, action)} className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-sm">
      <label className="col-span-2 sm:col-span-3 space-y-1">
        <span className="text-[13px] text-muted">Asignatura</span>
        <input name="subject" required maxLength={60} defaultValue={slot?.subject} className="input w-full" />
      </label>
      <label className="col-span-2 sm:col-span-3 space-y-1">
        <span className="text-[13px] text-muted">Aula (opcional)</span>
        <input name="location" maxLength={60} defaultValue={slot?.location ?? ""} className="input w-full" />
      </label>
      <label className="col-span-2 sm:col-span-2 space-y-1">
        <span className="text-[13px] text-muted">Día</span>
        <select name="weekday" defaultValue={slot?.weekday ?? 1} className="input w-full">
          {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[13px] text-muted">Empieza</span>
        <input type="time" name="startTime" required defaultValue={slot?.startTime} className="input w-full" />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[13px] text-muted">Acaba</span>
        <input type="time" name="endTime" required defaultValue={slot?.endTime} className="input w-full" />
      </label>
      <label className="space-y-1 sm:col-span-3">
        <span className="text-[13px] text-muted">Desde</span>
        <input type="date" name="validFrom" required defaultValue={slot?.validFrom ?? term.from} className="input w-full" />
      </label>
      <label className="space-y-1 sm:col-span-3">
        <span className="text-[13px] text-muted">Hasta</span>
        <input type="date" name="validTo" required defaultValue={slot?.validTo ?? term.to} className="input w-full" />
      </label>
      <div className="col-span-2 sm:col-span-6 flex items-center gap-2">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : slot ? "Guardar" : "Añadir clase"}</button>
        {slot && <button type="button" onClick={onDone} className="btn-ghost">Cancelar</button>}
        {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}

// React 19 vacía el formulario al terminar una acción aunque haya error; así solo se vacía al guardar bien.
function submitKeepingValues(e: React.FormEvent<HTMLFormElement>, action: (fd: FormData) => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  startTransition(() => action(fd));
}

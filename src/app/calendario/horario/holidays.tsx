"use client";

import { startTransition, useActionState, useEffect, useRef, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { Holiday } from "@/db/schema";
import { addHoliday, deleteHoliday, type HolidayFormState } from "../actions";

const fmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const show = (d: string) => fmt.format(new Date(`${d}T00:00:00Z`));

/** Lista de días sin clase con su botón de borrar. */
export function HolidayRow({ holiday }: { holiday: Holiday }) {
  const [pending, start] = useTransition();
  return (
    <li className={`flex items-center gap-3 px-5 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{holiday.label}</p>
        <p className="text-[13px] tabular-nums text-muted">
          {holiday.from === holiday.to ? show(holiday.from) : `${show(holiday.from)} – ${show(holiday.to)}`}
        </p>
      </div>
      <button
        onClick={() => start(() => deleteHoliday(holiday.id))}
        className="btn-ghost text-sm"
        aria-label={`Borrar ${holiday.label}`}
        disabled={pending}
      >
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
    </li>
  );
}

export function HolidayForm() {
  const [state, action, pending] = useActionState<HolidayFormState, FormData>(addHoliday, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.nonce, state.ok]);

  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-6"
    >
      <label className="col-span-2 space-y-1 sm:col-span-2">
        <span className="text-[13px] text-muted">Motivo</span>
        <input name="label" required maxLength={60} placeholder="Navidad, puente…" className="input w-full" />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[13px] text-muted">Desde</span>
        <input type="date" name="from" required className="input w-full" />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-[13px] text-muted">Hasta (si es más de un día)</span>
        <input type="date" name="to" className="input w-full" />
      </label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-6">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando…" : "Añadir día sin clase"}</button>
        {state.error && <p className="text-danger" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}

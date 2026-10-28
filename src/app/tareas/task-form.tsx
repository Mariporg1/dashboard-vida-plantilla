"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { Task } from "@/db/schema";
import { madridDateKey, madridTime } from "@/lib/dates";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { Repeat } from "lucide-react";
import { createTask, updateTask, type FormState } from "./actions";

type Props = { tags: string[]; task?: Task; onDone?: () => void };

export function TaskForm({ tags, task, onDone }: Props) {
  const action = task ? updateTask.bind(null, task.id) : createTask;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.ok) return;
    if (task) onDone?.();
    else formRef.current?.reset();
  }, [state.nonce, state.ok, task, onDone]);

  const listId = task ? `tags-${task.id}` : "tags-new";

  return (
    <form ref={formRef} onSubmit={(e) => submitKeepingValues(e, formAction)} className="grid grid-cols-2 gap-3 sm:grid-cols-6">
      <input
        name="title"
        required
        maxLength={200}
        placeholder="¿Qué tienes que hacer?"
        defaultValue={task?.title}
        className="input col-span-2 sm:col-span-6"
        aria-label="Título"
        autoFocus={!!task}
      />
      <fieldset className="col-span-2 sm:col-span-6 flex flex-wrap gap-2 text-sm" aria-label="Tipo">
        {CATEGORY_KEYS.map((c) => (
          <label key={c} className="cursor-pointer">
            <input type="radio" name="category" value={c} defaultChecked={(task?.category ?? "tarea") === c} className="peer sr-only" />
            <span
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-muted transition-colors duration-150 hover:border-[var(--control)] hover:text-fg peer-checked:border-fg peer-checked:bg-fg peer-checked:text-[var(--primary-fg)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
              style={{ "--c": CATEGORIES[c].color } as React.CSSProperties}
            >
              <span className="size-2 rounded-full" style={{ background: CATEGORIES[c].color }} />
              {CATEGORIES[c].label}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="col-span-1 sm:col-span-2 text-sm space-y-1">
        <span className="text-[13px] text-muted">Fecha</span>
        <input type="date" name="date" defaultValue={task?.dueAt ? madridDateKey(task.dueAt) : ""} className="input w-full" />
      </label>
      <label className="col-span-1 text-sm space-y-1">
        <span className="text-[13px] text-muted">Hora</span>
        <input
          type="time"
          name="time"
          defaultValue={task?.dueAt && !task.allDay ? madridTime(task.dueAt) : ""}
          className="input w-full"
        />
      </label>
      <label className="col-span-1 text-sm space-y-1">
        <span className="text-[13px] text-muted">Prioridad</span>
        <select name="priority" defaultValue={task?.priority ?? "media"} className="input w-full">
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </label>
      <label className="col-span-1 sm:col-span-2 text-sm space-y-1">
        <span className="text-[13px] text-muted">Etiqueta</span>
        <input name="tag" list={listId} maxLength={40} defaultValue={task?.tag ?? ""} placeholder="p. ej. estadística" className="input w-full" />
        <datalist id={listId}>{tags.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <div className="col-span-2 sm:col-span-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" name="weekly" defaultChecked={task?.weekly} className="check check-sm" />
          <Repeat className="size-3.5 text-muted" strokeWidth={2} aria-hidden />
          Se repite cada semana
        </label>
        <span className="text-muted">Sin fecha = tarea indeterminada: sale siempre arriba en Hoy.</span>
      </div>
      <details className="col-span-2 sm:col-span-6 text-sm" open={!!task?.notes}>
        <summary className="text-muted cursor-pointer">Notas</summary>
        <textarea name="notes" rows={2} maxLength={2000} defaultValue={task?.notes ?? ""} className="input w-full mt-2" />
      </details>
      <div className="col-span-2 sm:col-span-6 flex items-center gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Guardando…" : task ? "Guardar" : "Añadir tarea"}
        </button>
        {task && <button type="button" onClick={onDone} className="btn-ghost">Cancelar</button>}
        {state.error && <p className="text-sm text-danger" role="alert">{state.error}</p>}
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

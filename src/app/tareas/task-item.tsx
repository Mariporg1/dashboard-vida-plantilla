"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Task } from "@/db/schema";
import { daysFromToday, formatDue } from "@/lib/dates";
import { CATEGORIES } from "@/lib/categories";
import { deleteTask, toggleTask } from "./actions";
import { WeekChecks, type WeekCheck } from "./week-checks";
import { Pencil, Pin, Repeat, Trash2 } from "lucide-react";
import { Kind } from "../agenda-row";
import { TaskForm } from "./task-form";

const weekdayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long" });
const timeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit" });

/** weeks: solo en tareas semanales, las semanas del mes con su casilla. */
export function TaskItem({ task, tags, weeks, monthLabel }: { task: Task; tags: string[]; weeks?: WeekCheck[]; monthLabel?: string }) {
  const [editing, setEditing] = useState(false);
  const [busy, startTransition] = useTransition();
  // Marca la casilla al instante; el servidor confirma después.
  const [done, setDone] = useOptimistic(!!task.completedAt);

  if (editing) {
    return (
      <li className="p-4">
        <TaskForm tags={tags} task={task} onDone={() => setEditing(false)} />
      </li>
    );
  }

  const diff = task.dueAt ? daysFromToday(task.dueAt) : null;
  const overdue = !done && diff !== null && (diff < 0 || (diff === 0 && !task.allDay && task.dueAt! < new Date()));
  const dueClass = done ? "text-muted" : overdue ? "text-danger" : diff === 0 ? "text-warn" : "text-muted";

  return (
    <li className={`flex items-start gap-3 px-5 py-3.5 transition-opacity duration-200 ${busy ? "opacity-50" : ""}`}>
      {weeks ? (
        <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-raised" aria-hidden>
          <Repeat className="size-3 text-muted" strokeWidth={2} />
        </span>
      ) : (
      <input
        type="checkbox"
        checked={done}
        onChange={() =>
          startTransition(async () => {
            setDone(!done);
            await toggleTask(task.id);
          })
        }
        className="check mt-0.5"
        aria-label={done ? "Marcar como pendiente" : "Marcar como completada"}
      />
      )}
      <div className="min-w-0 flex-1">
        <p className={`break-words leading-snug ${done ? "line-through decoration-1 text-muted" : ""}`}>
          {task.priority === "alta" && <span className="mr-1.5 font-medium text-danger" title="Prioridad alta">!</span>}
          {task.title}
          {task.priority === "baja" && <span className="ml-2 text-xs text-muted">baja</span>}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          {weeks && task.dueAt && (
            <span className="first-letter:uppercase">
              Cada {weekdayFmt.format(task.dueAt)}{task.allDay ? "" : ` · ${timeFmt.format(task.dueAt)}`}
            </span>
          )}
          {!weeks && task.dueAt && <span className={dueClass}>{overdue ? "Vencida · " : ""}{formatDue(task.dueAt, task.allDay)}</span>}
          <Kind {...CATEGORIES[task.category]} />
          {task.weekly && !weeks && (
            <span className="inline-flex items-center gap-1" title="Se repite cada semana">
              <Repeat className="size-3" strokeWidth={2} aria-hidden /> Semanal
            </span>
          )}
          {!task.dueAt && (
            <span className="inline-flex items-center gap-1">
              <Pin className="size-3" strokeWidth={2} aria-hidden /> Sin fecha
            </span>
          )}
          {task.tag && <span className="text-fg/80">#{task.tag}</span>}
        </p>
        {task.notes && <p className="text-sm text-muted whitespace-pre-line mt-1">{task.notes}</p>}
        {weeks && <WeekChecks taskId={task.id} weeks={weeks} monthLabel={monthLabel ?? ""} />}
      </div>
      <div className="flex shrink-0">
        <button onClick={() => setEditing(true)} className="btn-ghost text-sm" aria-label={`Editar ${task.title}`}>
          <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Editar</span>
        </button>
        <button
          onClick={() => confirm(`¿Borrar "${task.title}"?`) && startTransition(() => deleteTask(task.id))}
          className="btn-ghost text-sm hover:text-danger"
          aria-label={`Borrar ${task.title}`}
        >
          <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden />
          <span className="hidden sm:inline">Borrar</span>
        </button>
      </div>
    </li>
  );
}

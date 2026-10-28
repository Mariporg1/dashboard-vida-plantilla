"use client";

import { useOptimistic, useTransition } from "react";
import type { AgendaEntry } from "@/lib/agenda";
import { madridTime } from "@/lib/dates";
import { Repeat } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { SOURCE_COLORS } from "@/lib/colors";
import { toggleOccurrence, toggleTask } from "./tareas/actions";
import { toggleDismissed } from "./sync-actions";

const SOURCE = {
  moodle: { label: "Moodle", color: SOURCE_COLORS.moodle },
  outlook: { label: "Outlook", color: SOURCE_COLORS.outlook },
} as const;

/** `isDone`: la fila ya está hecha (lista "Hechas"); al pulsar se desmarca. */
export function AgendaRow({ entry: e, isDone = false }: { entry: AgendaEntry; isDone?: boolean }) {
  const [busy, start] = useTransition();
  const [done, setDone] = useOptimistic(isDone);
  const title = e.type === "task" ? e.task.title : e.item.title;
  const sub = e.type === "task" ? (e.task.tag ? `#${e.task.tag}` : null) : e.item.course;
  const url = e.type === "task" ? null : e.item.url;

  let when: string;
  if (e.type === "outlook" && !e.allDay && e.item.endsAt) when = `${madridTime(e.due!)}–${madridTime(e.item.endsAt)}`;
  else if (!e.due) when = "Sin fecha";
  else when = e.allDay ? "Todo el día" : madridTime(e.due);

  const canCheck = e.type !== "outlook";
  function check() {
    start(async () => {
      setDone(!done);
      if (e.type === "task" && e.occurrence) await toggleOccurrence(e.task.id, e.occurrence);
      else if (e.type === "task") await toggleTask(e.task.id);
      else if (e.type === "moodle") await toggleDismissed(e.item.id);
    });
  }

  return (
    <li className={`flex items-start gap-3 px-5 py-3.5 transition-opacity duration-200 ${busy || done ? "opacity-55" : ""}`}>
      {canCheck ? (
        <input
          type="checkbox"
          checked={done}
          onChange={check}
          className="check mt-0.5"
          aria-label={done ? "Desmarcar (volver a pendiente)" : e.type === "task" ? "Completar tarea" : "Marcar entrega como hecha"}
        />
      ) : (
        <span className="mt-0.5 size-5 shrink-0" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className={`break-words leading-snug ${done ? "line-through decoration-1" : ""}`}>
          {e.type === "task" && e.task.priority === "alta" && <span className="mr-1.5 font-medium text-danger" title="Prioridad alta">!</span>}
          {url ? <a href={url} target="_blank" rel="noreferrer" className="hover:underline">{title}</a> : title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span className="tabular-nums">{when}</span>
          <Kind {...(e.type === "task" ? CATEGORIES[e.task.category] : SOURCE[e.type])} />
          {e.type === "task" && e.task.weekly && (
            <span className="inline-flex items-center gap-1" title="Se repite cada semana">
              <Repeat className="size-3" strokeWidth={2} aria-hidden /> Semanal
            </span>
          )}
          {sub && <span className="truncate">{sub}</span>}
        </p>
      </div>
    </li>
  );
}

/** Tipo de la fila: punto de color y nombre. El color va en el dato, no en una etiqueta rellena. */
export function Kind({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-fg/80">
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

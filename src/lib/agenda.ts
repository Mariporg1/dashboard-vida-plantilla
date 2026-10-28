import type { ExternalItem, Task } from "@/db/schema";
import { addDays, madridDateKey, madridToUtc } from "./dates";
import { doneKey, occurrenceDates, occurrenceStart } from "./weekly";

export const AGENDA_DAYS = 7;

export type AgendaEntry =
  /** occurrence: fecha de la repetición, solo en tareas semanales. */
  | { type: "task"; key: string; due: Date | null; allDay: boolean; task: Task; occurrence?: string }
  | { type: "moodle" | "outlook"; key: string; due: Date | null; allDay: boolean; item: ExternalItem };

export type AgendaGroup = { id: string; label: string; entries: AgendaEntry[] };

const PRIORITY_RANK = { alta: 0, media: 1, baja: 2 } as const;
// A igual hora: primero entregas, luego tareas, luego eventos.
const TYPE_RANK = { moodle: 0, task: 1, outlook: 2 } as const;

const dayLabel = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" });

// Lo de "todo el día" se considera que vence al final del día.
function deadline(e: Pick<AgendaEntry, "due" | "allDay">): number {
  if (!e.due) return Number.POSITIVE_INFINITY;
  return e.due.getTime() + (e.allDay ? 86_400_000 - 1 : 0);
}

function compare(a: AgendaEntry, b: AgendaEntry): number {
  const pa = a.type === "task" ? PRIORITY_RANK[a.task.priority] : 1;
  const pb = b.type === "task" ? PRIORITY_RANK[b.task.priority] : 1;
  return deadline(a) - deadline(b) || TYPE_RANK[a.type] - TYPE_RANK[b.type] || pa - pb;
}

/**
 * Junta tareas, entregas de Moodle y eventos de Outlook en grupos ordenados por urgencia:
 * "Hoy", "Mañana" y cada uno de los días hasta +7. Lo vencido no se muestra (las tareas
 * vencidas siguen en la pestaña Tareas), ni los eventos de Outlook ya terminados.
 */
export function buildAgenda(
  tasks: Task[],
  items: ExternalItem[],
  now = new Date(),
  /** Semanas hechas de las tareas semanales (claves de doneKey). */
  doneWeeks: Set<string> = new Set(),
): AgendaGroup[] {
  const today = madridDateKey(now);
  const end = madridToUtc(addDays(today, AGENDA_DAYS + 1)); // exclusivo: hasta el final del día +7

  const entries: AgendaEntry[] = [];
  for (const task of tasks) {
    if (task.weekly) {
      // Cada semana es una entrada aparte; las ya hechas no salen.
      for (const date of occurrenceDates(task, today, addDays(today, AGENDA_DAYS))) {
        if (doneWeeks.has(doneKey(task.id, date))) continue;
        const e = { type: "task" as const, key: `t${task.id}-${date}`, due: occurrenceStart(task, date), allDay: task.allDay, task, occurrence: date };
        if (deadline(e) >= now.getTime()) entries.push(e);
      }
      continue;
    }
    if (task.completedAt || !task.dueAt || task.dueAt >= end) continue;
    const e = { type: "task" as const, key: `t${task.id}`, due: task.dueAt, allDay: task.allDay, task };
    if (deadline(e) >= now.getTime()) entries.push(e);
  }
  for (const item of items) {
    if (!item.startsAt || item.startsAt >= end || item.dismissedAt) continue;
    if (item.source === "moodle") {
      if (item.status === "entregada") continue;
      const e = { type: "moodle" as const, key: `m${item.id}`, due: item.startsAt, allDay: item.allDay, item };
      if (deadline(e) >= now.getTime()) entries.push(e);
    } else {
      const finished = (item.endsAt ?? item.startsAt) <= now && !(item.allDay && madridDateKey(item.startsAt) === today);
      if (finished) continue;
      entries.push({ type: "outlook", key: `o${item.id}`, due: item.startsAt, allDay: item.allDay, item });
    }
  }
  entries.sort(compare);

  const groups = new Map<string, AgendaGroup>();
  const group = (id: string, label: string) => {
    if (!groups.has(id)) groups.set(id, { id, label, entries: [] });
    return groups.get(id)!;
  };
  for (const e of entries) {
    // Un evento que empezó antes de hoy y sigue en curso cuenta para hoy.
    const key = e.due! < madridToUtc(today) ? today : madridDateKey(e.due!);
    const label = key === today ? "Hoy" : key === addDays(today, 1) ? "Mañana" : dayLabel.format(madridToUtc(key, "12:00"));
    group(key, label).entries.push(e);
  }
  return [...groups.values()];
}

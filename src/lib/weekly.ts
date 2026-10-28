import type { Task } from "@/db/schema";
import { addDays, madridDateKey, madridTime, madridToUtc } from "./dates";

// Tareas semanales: una sola fila en tasks que se repite cada 7 días desde su fecha (dueAt).
// Cada repetición se identifica por su fecha "YYYY-MM-DD" en Madrid y se marca aparte (task_completions).

type Weekly = Pick<Task, "dueAt" | "allDay">;

/** Fechas de las repeticiones dentro de [from, to] (ambas incluidas, "YYYY-MM-DD"). */
export function occurrenceDates(task: Weekly, from: string, to: string): string[] {
  if (!task.dueAt) return [];
  const first = madridDateKey(task.dueAt);
  let d = first;
  if (from > first) {
    const [fy, fm, fd] = first.split("-").map(Number);
    const [ty, tm, td] = from.split("-").map(Number);
    const gap = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
    d = addDays(first, Math.ceil(gap / 7) * 7);
  }
  const out: string[] = [];
  for (; d <= to; d = addDays(d, 7)) out.push(d);
  return out;
}

/** Momento (UTC) de la repetición de ese día, con la misma hora de Madrid que la primera. */
export function occurrenceStart(task: Weekly, date: string): Date {
  return madridToUtc(date, task.allDay || !task.dueAt ? "00:00" : madridTime(task.dueAt));
}

/** Clave para buscar si una repetición está hecha. */
export const doneKey = (taskId: number, date: string) => `${taskId}|${date}`;

/** Primer y último día del mes "YYYY-MM". */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export type Occurrence = { task: Task; date: string; start: Date; done: boolean };

/** Repeticiones de varias tareas semanales entre dos fechas, marcando las hechas. */
export function occurrences(weeklyTasks: Task[], done: { taskId: number; date: string }[], from: string, to: string): Occurrence[] {
  const doneSet = new Set(done.map((d) => doneKey(d.taskId, d.date)));
  return weeklyTasks.flatMap((task) =>
    occurrenceDates(task, from, to).map((date) => ({ task, date, start: occurrenceStart(task, date), done: doneSet.has(doneKey(task.id, date)) })),
  );
}

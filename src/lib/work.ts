import type { WorkShift } from "@/db/schema";
import { addDays, madridToUtc } from "./dates";

type Shift = Pick<WorkShift, "startAt" | "endAt">;

/** Minutos trabajados dentro de [from, to). Un turno abierto cuenta hasta `now`. */
export function minutesBetween(shifts: Shift[], from: Date, to: Date, now = new Date()): number {
  let ms = 0;
  for (const s of shifts) {
    const end = s.endAt ?? now;
    const a = Math.max(s.startAt.getTime(), from.getTime());
    const b = Math.min(end.getTime(), to.getTime());
    if (b > a) ms += b - a;
  }
  return Math.round(ms / 60_000);
}

/** Minutos trabajados en la semana que empieza el lunes `monday` (en Madrid). */
export function weekMinutes(shifts: Shift[], monday: string, now = new Date()): number {
  return minutesBetween(shifts, madridToUtc(monday), madridToUtc(addDays(monday, 7)), now);
}

/** "7 h 05 min", "45 min". */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}

/**
 * Turno apuntado a mano: fecha + hora de entrada y salida en Madrid.
 * Si la salida es anterior a la entrada, se entiende que acaba al día siguiente (turno de noche).
 */
export function manualShift(date: string, start: string, end: string): { startAt: Date; endAt: Date } {
  const startAt = madridToUtc(date, start);
  const endAt = madridToUtc(end <= start ? addDays(date, 1) : date, end);
  return { startAt, endAt };
}

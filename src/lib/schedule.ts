import type { ClassException, ClassSlot } from "@/db/schema";
import { EMPTY_CALENDAR, isoWeekdayOf, type AcademicCalendar } from "./academic-calendar";
import { addDays, madridDateKey, madridToUtc } from "./dates";

/** Lunes (en Madrid) de la semana que contiene `dateKey`. */
export function weekStart(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return addDays(dateKey, -((dow + 6) % 7));
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export type ClassOccurrence = {
  slot: ClassSlot;
  date: string;
  start: Date;
  end: Date;
  /** Quitada a mano solo para ese día. */
  cancelled: boolean;
};

/**
 * Clases de la semana que empieza en `monday`. Se salta los días sin clase (festivos y vacaciones),
 * respeta el periodo de validez de cada clase y las excepciones (se devuelven con cancelled para
 * poder restaurarlas).
 */
export function classesForWeek(
  slots: ClassSlot[],
  exceptions: ClassException[],
  monday: string,
  calendar: AcademicCalendar = EMPTY_CALENDAR,
): ClassOccurrence[] {
  const cancelled = new Set(exceptions.map((e) => `${e.slotId}|${e.date}`));
  const out: ClassOccurrence[] = [];
  for (const date of weekDays(monday)) {
    if (!calendar.isClassDay(date)) continue;
    const weekday = isoWeekdayOf(date);
    for (const slot of slots) {
      if (slot.weekday !== weekday || date < slot.validFrom || date > slot.validTo) continue;
      out.push({
        slot,
        date,
        start: madridToUtc(date, slot.startTime),
        end: madridToUtc(date, slot.endTime),
        cancelled: cancelled.has(`${slot.id}|${date}`),
      });
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Semana actual en Madrid. */
export function currentWeek(now = new Date()): string {
  return weekStart(madridDateKey(now));
}

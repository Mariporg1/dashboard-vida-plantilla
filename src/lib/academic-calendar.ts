import { addDays } from "./dates";

// Días sin clase (festivos y vacaciones) que cada uno añade en Calendario → Horario.
// Fechas "YYYY-MM-DD" en Madrid.
export type HolidayRange = { from: string; to: string; label: string };
export type NonTeachingDay = { label: string };

export type AcademicCalendar = {
  /** Si el día es festivo o vacaciones, su motivo. */
  nonTeachingDay(dateKey: string): NonTeachingDay | null;
  /** Día con clase: cualquiera que no esté marcado como festivo o vacaciones. */
  isClassDay(dateKey: string): boolean;
};

export function makeCalendar(ranges: HolidayRange[]): AcademicCalendar {
  const byDay = new Map<string, NonTeachingDay>();
  for (const r of ranges) {
    // Tope de un año por rango por si alguien escribe mal una fecha.
    for (let k = r.from, n = 0; k <= r.to && n < 366; k = addDays(k, 1), n++) byDay.set(k, { label: r.label });
  }
  return {
    nonTeachingDay: (d) => byDay.get(d) ?? null,
    isClassDay: (d) => !byDay.has(d),
  };
}

export const EMPTY_CALENDAR = makeCalendar([]);

/** Día de la semana (1 = lunes ... 7 = domingo). */
export function isoWeekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1;
}

/**
 * Periodo por defecto de una clase nueva: el cuatrimestre en curso.
 * De agosto a enero, hasta el 31 de enero; de febrero a julio, hasta el 30 de junio.
 */
export function defaultTerm(today: string): { from: string; to: string } {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  if (m >= 8) return { from: today, to: `${y + 1}-01-31` };
  if (m === 1) return { from: today, to: `${y}-01-31` };
  return { from: today, to: `${y}-06-30` };
}

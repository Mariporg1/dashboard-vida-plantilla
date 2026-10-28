import { EMPTY_CALENDAR, type AcademicCalendar } from "./academic-calendar";
import { addDays } from "./dates";

// Pequeños extras de la pestaña Hoy: saludo, frase del día y cuentas atrás.

function dayNumber(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Días de `from` a `to` (fechas "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** 1 = lunes ... 7 = domingo. */
export function isoWeekday(dateKey: string): number {
  return ((dayNumber(dateKey) + 3) % 7) + 1; // 1/1/1970 fue jueves
}

export function greeting(hour: number): { text: string } {
  if (hour >= 6 && hour < 13) return { text: "Buenos días" };
  if (hour >= 13 && hour < 21) return { text: "Buenas tardes" };
  return { text: "Buenas noches" };
}

const QUOTES = [
  "Hecho es mejor que perfecto.",
  "Un commit al día mantiene el suspenso en la lejanía.",
  "Si compila a la primera, sospecha.",
  "El café no cuenta como horas de estudio, pero ayuda.",
  "Divide y vencerás: también vale para las prácticas.",
  "Hoy es buen día para adelantar algo que vence la semana que viene.",
  "No es procrastinar si lo apuntas en Tareas.",
  "Un descanso de 5 minutos no es rendirse.",
  "Los apuntes de hoy son el aprobado de enero.",
  "Primero que funcione, luego que sea bonito.",
  "Lo difícil se hace ya; lo imposible, después del café.",
  "Si no está en el calendario, no existe.",
  "Pregunta en clase: seguro que alguien más tenía la misma duda.",
  "Guarda antes de cerrar. Siempre.",
  "Dormir también es productividad.",
  "Pequeños pasos, todos los días.",
  "El viernes está más cerca de lo que parece.",
  "Leer el enunciado entero ahorra horas.",
  "Hoy toca ser la persona que el tú de mañana agradecerá.",
  "Bebe agua. En serio.",
  "La práctica empieza abriendo el archivo, no pensando en ella.",
  "Si te atascas, explícaselo a un pato de goma.",
  "Nadie ha aprobado mirando el móvil… todavía.",
  "Una tarea tachada sienta mejor que cualquier notificación.",
  "Mejor 25 minutos concentrado que 2 horas a medias.",
  "Ctrl+Z existe; atrévete a probar.",
  "El examen no sabe que tienes miedo. Estudia igual.",
  "Hoy no hace falta ganar, solo avanzar.",
  "Ordenar el escritorio no cuenta como estudiar (pero casi).",
  "Lo que se mide, mejora.",
];

/** La misma frase durante todo el día y distinta cada día. */
export function quoteOfTheDay(dateKey: string): string {
  return QUOTES[((dayNumber(dateKey) % QUOTES.length) + QUOTES.length) % QUOTES.length];
}

export type Countdown = { kind: "weekend" | "holiday" | "xmas"; label: string; days: number };

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

export function countdownText(c: Countdown): string {
  if (c.days === 0) return "¡hoy!";
  if (c.days === 1) return "mañana";
  return `en ${c.days} ${plural(c.days, "día", "días")}`;
}

/** Próximo día festivo o de vacaciones (no cuenta el de hoy). */
export function nextHoliday(today: string, calendar: AcademicCalendar = EMPTY_CALENDAR, maxDays = 400): { date: string; label: string } | null {
  for (let i = 1; i <= maxDays; i++) {
    const d = addDays(today, i);
    const h = calendar.nonTeachingDay(d);
    if (h) return { date: d, label: h.label };
  }
  return null;
}

/** Cuentas atrás para la tarjeta de Hoy, de la más cercana a la más lejana. */
export function countdowns(today: string, calendar: AcademicCalendar = EMPTY_CALENDAR): Countdown[] {
  const out: Countdown[] = [];
  const wd = isoWeekday(today);
  out.push({ kind: "weekend", label: "Fin de semana", days: wd >= 6 ? 0 : 6 - wd });
  const h = nextHoliday(today, calendar);
  if (h) out.push({ kind: "holiday", label: h.label, days: daysBetween(today, h.date) });
  const year = Number(today.slice(0, 4));
  const xmas = today <= `${year}-12-25` ? `${year}-12-25` : `${year + 1}-12-25`;
  out.push({ kind: "xmas", label: "Navidad", days: daysBetween(today, xmas) });
  // Sin repetir (p. ej. el festivo y Navidad pueden ser el mismo día).
  const seen = new Set<string>();
  return out
    .filter((c) => (seen.has(c.label) ? false : (seen.add(c.label), true)))
    .sort((a, b) => a.days - b.days);
}

/** Avance del año natural (0-100). */
export function yearProgress(today: string): number {
  const y = Number(today.slice(0, 4));
  const total = daysBetween(`${y}-01-01`, `${y + 1}-01-01`);
  return Math.round((daysBetween(`${y}-01-01`, today) / total) * 100);
}

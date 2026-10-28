// Utilidades de fecha. Todo se guarda en UTC y se interpreta/muestra en Europe/Madrid,
// independientemente de la zona horaria del servidor (Vercel corre en UTC).
export const TZ = "Europe/Madrid";

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, tz = TZ): Parts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute };
}

// Diferencia en minutos entre la hora local de `tz` y UTC en ese instante (+60 en invierno, +120 en verano).
function offsetMinutes(date: Date, tz = TZ): number {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

/** Convierte una fecha "YYYY-MM-DD" y hora "HH:mm" de Madrid al instante UTC correspondiente. */
export function madridToUtc(dateKey: string, time = "00:00", tz = TZ): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Dos pasadas bastan para resolver el desfase incluso cerca de los cambios de hora.
  let guess = wall - offsetMinutes(new Date(wall), tz) * 60_000;
  guess = wall - offsetMinutes(new Date(guess), tz) * 60_000;
  return new Date(guess);
}

/** Día natural en Madrid ("YYYY-MM-DD") de un instante. */
export function madridDateKey(date: Date, tz = TZ): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Hora en Madrid ("HH:mm") de un instante. */
export function madridTime(date: Date, tz = TZ): string {
  const p = zonedParts(date, tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

/** Suma días naturales a una clave "YYYY-MM-DD" (sin depender de la zona horaria). */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Días naturales de diferencia (en Madrid) entre `now` y `date`: 0 = hoy, 1 = mañana, -1 = ayer. */
export function daysFromToday(date: Date, now = new Date()): number {
  const a = Date.parse(madridDateKey(now) + "T00:00:00Z");
  const b = Date.parse(madridDateKey(date) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAY = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });

/** Texto corto para mostrar un vencimiento: "Hoy, 14:00", "Mañana", "Ayer", "lun, 27 oct, 09:30". */
export function formatDue(date: Date, allDay: boolean, now = new Date()): string {
  const diff = daysFromToday(date, now);
  const day =
    diff === 0 ? "Hoy" : diff === 1 ? "Mañana" : diff === -1 ? "Ayer" : WEEKDAY.format(date).replace(".", "");
  return allDay ? day : `${day}, ${madridTime(date)}`;
}

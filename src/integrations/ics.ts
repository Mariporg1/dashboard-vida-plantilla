import ical, { type VEvent } from "node-ical";
import { IntegrationError } from "./types";
import { madridToUtc } from "@/lib/dates";

const MAX_BYTES = 5_000_000;

/** Descarga un calendario ICS con timeout y errores legibles. */
export async function downloadIcs(url: string, label: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { Accept: "text/calendar" } });
  } catch (e) {
    throw new IntegrationError(`No se pudo conectar con ${label} (${(e as Error).name === "TimeoutError" ? "tiempo de espera agotado" : "error de red"}).`);
  }
  if (res.status === 401 || res.status === 403) {
    throw new IntegrationError(`${label} rechazó la URL del calendario (HTTP ${res.status}). Puede que haya caducado: genera una nueva.`);
  }
  if (!res.ok) throw new IntegrationError(`${label} respondió con un error (HTTP ${res.status}).`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new IntegrationError(`El calendario de ${label} es demasiado grande.`);
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new IntegrationError(`La URL de ${label} no devuelve un calendario. ¿Has copiado la URL correcta?`);
  }
  return text;
}

export function parseVEvents(text: string): VEvent[] {
  return Object.values(ical.sync.parseICS(text)).filter((c): c is VEvent => c?.type === "VEVENT");
}

/** Texto plano de una propiedad ICS que puede venir como string o como { val, params }. */
export function icsText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "val" in v) return String((v as { val: unknown }).val ?? "");
  return String(v);
}

/**
 * Inicio de un evento como instante UTC. Los eventos de día completo (VALUE=DATE) se anclan a la
 * medianoche de Madrid, igual que las tareas, para que no dependan de la zona horaria del servidor.
 */
export function icsStart(ev: VEvent): Date | null {
  if (!ev.start) return null;
  const d = ev.start as Date & { dateOnly?: boolean };
  if (!d.dateOnly) return new Date(d);
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return madridToUtc(key);
}

import ical from "node-ical";
import type { FetchedItem } from "../types";
import { icsText, parseVEvents } from "../ics";
import { madridDateKey, madridToUtc } from "@/lib/dates";

// Outlook web abierto en el día del evento.
function outlookDayUrl(date: Date) {
  const [y, m, d] = madridDateKey(date).split("-").map(Number);
  return `https://outlook.office.com/calendar/view/day/${y}/${m}/${d}`;
}

/** Fecha de un evento de día completo como medianoche de Madrid (node-ical la da en hora local del servidor). */
function fullDayStart(d: Date) {
  return madridToUtc(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}

/**
 * Convierte el calendario publicado de Outlook en elementos, expandiendo los eventos que se repiten
 * (con sus excepciones y cambios puntuales). Cada repetición tiene un id propio: UID + inicio original.
 */
export function parseOutlookIcs(text: string, from: Date, to: Date): FetchedItem[] {
  const items: FetchedItem[] = [];
  for (const ev of parseVEvents(text)) {
    if (String(ev.status ?? "").toUpperCase() === "CANCELLED") continue;

    for (const inst of ical.expandRecurringEvent(ev, { from, to, expandOngoing: true })) {
      const e = inst.event;
      if (String(e.status ?? "").toUpperCase() === "CANCELLED") continue;
      const start = inst.isFullDay ? fullDayStart(inst.start) : new Date(inst.start);
      const end = inst.isFullDay ? fullDayStart(inst.end) : new Date(inst.end);
      // En un cambio puntual, el id usa la fecha original (RECURRENCE-ID) para no duplicar al moverlo.
      const original = inst.isOverride && e.recurrenceid ? new Date(e.recurrenceid) : start;

      items.push({
        externalId: `${ev.uid}:${original.toISOString()}`,
        kind: "evento",
        title: icsText(inst.summary).trim() || "Ocupado",
        course: icsText(e.location).trim() || null,
        url: outlookDayUrl(start),
        startsAt: start,
        endsAt: end,
        allDay: inst.isFullDay,
        status: null,
      });
    }
  }
  return items;
}

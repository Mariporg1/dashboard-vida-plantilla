import type { FetchedItem } from "../types";
import { icsStart, icsText, parseVEvents } from "../ics";

/**
 * Convierte el iCal exportado por Moodle en elementos. Moodle pone el id del evento en el UID
 * ("1234@moodle.ejemplo.edu") y el nombre corto de la asignatura en CATEGORIES.
 */
export function parseMoodleIcs(text: string, baseUrl: string, from: Date, to: Date): FetchedItem[] {
  const items: FetchedItem[] = [];
  for (const ev of parseVEvents(text)) {
    const start = icsStart(ev);
    if (!start || start < from || start > to) continue;

    const eventId = String(ev.uid ?? "").split("@")[0];
    if (!eventId) continue;
    const categories = (ev as { categories?: unknown }).categories;
    const course = Array.isArray(categories) ? categories.map(icsText).join(", ") : icsText(categories) || null;
    const allDay = (ev.start as { dateOnly?: boolean }).dateOnly === true;
    const url =
      icsText((ev as { url?: unknown }).url) ||
      `${baseUrl}/calendar/view.php?view=day&time=${Math.floor(start.getTime() / 1000)}`;

    items.push({
      externalId: `event:${eventId}`,
      kind: "entrega",
      title: icsText(ev.summary).trim() || "(sin título)",
      course,
      url,
      startsAt: start,
      endsAt: ev.end ? new Date(ev.end) : null,
      allDay,
      status: "pendiente",
    });
  }
  return items;
}

import { getSettings } from "@/lib/settings";

/** Dirección del Moodle: la indicada en Ajustes o, si no, la del propio enlace del calendario. */
export function moodleBaseUrl(icalUrl?: string, explicit?: string): string | undefined {
  const raw = explicit || (icalUrl ? safeOrigin(icalUrl) : undefined);
  return raw?.replace(/\/+$/, "");
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

export async function moodleConfig() {
  const s = await getSettings();
  return { baseUrl: moodleBaseUrl(s.moodleIcalUrl, s.moodleUrl), token: s.moodleToken, icalUrl: s.moodleIcalUrl };
}

// Ventana de fechas que se importa: algo de pasado (para ver lo vencido) y bastante futuro.
export const PAST_DAYS = 7;
export const FUTURE_DAYS = 90;

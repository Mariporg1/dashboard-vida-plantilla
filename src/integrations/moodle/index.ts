import type { FetchResult, Integration } from "../types";
import { IntegrationError } from "../types";
import { downloadIcs } from "../ics";
import { FUTURE_DAYS, PAST_DAYS, moodleConfig } from "./config";
import { MoodleClient, fetchMoodleApi } from "./api";
import { parseMoodleIcs } from "./ical";

export const moodle: Integration = {
  source: "moodle",
  label: "Moodle",

  async isConfigured() {
    const c = await moodleConfig();
    return !!(c.token || c.icalUrl);
  },

  // Vía principal: API con token. Si falla o no hay token, se usa el iCal exportado.
  async fetch(now: Date): Promise<FetchResult> {
    const { baseUrl, token, icalUrl } = await moodleConfig();
    const from = new Date(now.getTime() - PAST_DAYS * 86_400_000);
    const to = new Date(now.getTime() + FUTURE_DAYS * 86_400_000);

    let apiError: string | undefined;
    if (token && baseUrl) {
      try {
        const items = await fetchMoodleApi(new MoodleClient(baseUrl, token), baseUrl, from, to);
        return { items, mode: "api" };
      } catch (e) {
        if (!icalUrl) throw e;
        apiError = e instanceof IntegrationError ? e.message : "error inesperado";
      }
    }
    if (!icalUrl) throw new IntegrationError("Falta el enlace del calendario de Moodle. Añádelo en Ajustes.");

    const text = await downloadIcs(icalUrl, "Moodle");
    return {
      items: parseMoodleIcs(text, baseUrl ?? "", from, to),
      mode: "ical",
      warning: apiError ? `La API falló (${apiError}); se ha usado el calendario iCal.` : undefined,
    };
  },
};

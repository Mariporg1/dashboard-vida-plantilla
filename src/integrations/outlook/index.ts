import type { FetchResult, Integration } from "../types";
import { IntegrationError } from "../types";
import { downloadIcs } from "../ics";
import { FUTURE_DAYS, PAST_DAYS, outlookConfig } from "./config";
import { parseOutlookIcs } from "./ical";

export const outlook: Integration = {
  source: "outlook",
  label: "Outlook",

  async isConfigured() {
    return !!(await outlookConfig()).icsUrl;
  },

  // Las cuentas universitarias suelen tener bloqueado el consentimiento para Microsoft Graph,
  // así que se usa el calendario publicado en ICS.
  async fetch(now: Date): Promise<FetchResult> {
    const { icsUrl } = await outlookConfig();
    if (!icsUrl) throw new IntegrationError("Falta el enlace del calendario de Outlook. Añádelo en Ajustes.");
    const from = new Date(now.getTime() - PAST_DAYS * 86_400_000);
    const to = new Date(now.getTime() + FUTURE_DAYS * 86_400_000);
    const text = await downloadIcs(icsUrl, "Outlook");
    return { items: parseOutlookIcs(text, from, to), mode: "ical" };
  },
};

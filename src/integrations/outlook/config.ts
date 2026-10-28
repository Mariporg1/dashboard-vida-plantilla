import { getSettings } from "@/lib/settings";

export async function outlookConfig() {
  return { icsUrl: (await getSettings()).outlookIcsUrl };
}

export const PAST_DAYS = 1;
export const FUTURE_DAYS = 60;

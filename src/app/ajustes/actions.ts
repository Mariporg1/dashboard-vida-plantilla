"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeCalendarUrl } from "@/lib/calendar-url";
import { MIN_PASSWORD, hashPassword, verifyPassword } from "@/lib/password";
import { TAB_KEYS, activeSources, getSettings, passwordHash, saveSettings, type TabKey } from "@/lib/settings";
import { INTEGRATIONS, runSync } from "@/sync/run";

async function save(values: Parameters<typeof saveSettings>[0]) {
  await saveSettings(values);
  revalidatePath("/", "layout");
}

export type FormState = { ok?: boolean; error?: string };

export async function saveName(_: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length > 40) return { error: "Máximo 40 caracteres." };
  await save({ name });
  return { ok: true };
}

export async function setTab(tab: TabKey, on: boolean) {
  if (!TAB_KEYS.includes(tab)) return;
  const { hidden } = await getSettings();
  await save({ hiddenTabs: on ? hidden.filter((t) => t !== tab) : [...new Set([...hidden, tab])] });
}

const LINK_FIELDS = { moodle: "moodleIcalUrl", outlook: "outlookIcsUrl" } as const;
export type LinkKind = keyof typeof LINK_FIELDS;

/** Guarda (o borra, si viene vacío) el enlace de un calendario y sincroniza al momento. */
export async function saveLink(kind: LinkKind, _: FormState, fd: FormData): Promise<FormState> {
  const raw = String(fd.get("url") ?? "");
  const url = raw.trim() ? normalizeCalendarUrl(raw) : null;
  if (raw.trim() && !url) return { error: "Eso no parece un enlace. Debe empezar por https://" };
  await save({ [LINK_FIELDS[kind]]: url });
  if (url) {
    const [result] = await runSync(INTEGRATIONS.filter((i) => i.source === kind));
    revalidatePath("/", "layout");
    if (result && !result.ok && result.error) return { error: `Guardado, pero no se pudo leer: ${result.error}` };
  }
  return { ok: true };
}

/** Token de la API de Moodle (opcional). Vacío lo borra. */
export async function saveMoodleToken(token: string | null): Promise<FormState> {
  if (token && !/^[a-f0-9]{32}$/i.test(token)) return { error: "El token no es válido." };
  await save({ moodleToken: token });
  if (token) await runSync(INTEGRATIONS.filter((i) => i.source === "moodle"));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  if (process.env.AUTH_PASSWORD_HASH?.trim()) {
    return { error: "La contraseña está fijada en la variable AUTH_PASSWORD_HASH de Vercel. Cámbiala allí." };
  }
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const stored = await passwordHash();
  if (!stored || !(await verifyPassword(current, stored))) return { error: "La contraseña actual no es correcta." };
  if (next.length < MIN_PASSWORD) return { error: `La nueva necesita al menos ${MIN_PASSWORD} caracteres.` };
  if (next !== String(fd.get("repeat") ?? "")) return { error: "Las dos contraseñas nuevas no coinciden." };
  await save({ passwordHash: await hashPassword(next) });
  return { ok: true };
}

/** Termina la bienvenida: guarda todo lo elegido de una vez, sincroniza y lleva a Hoy. */
export async function finishWelcome(fd: FormData) {
  const name = String(fd.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
  const hiddenTabs = TAB_KEYS.filter((t) => fd.get(`tab-${t}`) !== "on");
  const moodleIcalUrl = normalizeCalendarUrl(String(fd.get("moodle") ?? ""));
  const outlookIcsUrl = normalizeCalendarUrl(String(fd.get("outlook") ?? ""));
  await saveSettings({ name, hiddenTabs, moodleIcalUrl, outlookIcsUrl, welcomedAt: new Date() });
  // Primera sincronización ya, para que Hoy no salga vacío. Si algo falla, se ve en la barra de abajo.
  const on = activeSources(await getSettings());
  if (on.length > 0) await runSync(INTEGRATIONS.filter((i) => on.includes(i.source))).catch(() => {});
  revalidatePath("/", "layout");
  redirect("/");
}

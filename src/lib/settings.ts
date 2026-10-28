import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { settings, type Source } from "@/db/schema";
import { TABS, TAB_KEYS, type TabKey } from "./tab-list";

export { TABS, TAB_KEYS, type TabKey };


/** Enlaces y claves de las integraciones. Lo que no esté en Ajustes se toma de las variables de entorno. */
export type Connections = { moodleIcalUrl?: string; moodleToken?: string; moodleUrl?: string; outlookIcsUrl?: string };

export type Settings = Connections & {
  name: string;
  hidden: TabKey[];
  welcomed: boolean;
  on: (tab: TabKey) => boolean;
};

type Row = Partial<typeof settings.$inferSelect> & { name: string; hiddenTabs: string[]; welcomedAt: Date | null };

const clean = (v: string | null | undefined) => v?.trim() || undefined;

export function toSettings(row?: Row): Settings {
  const hidden = (row?.hiddenTabs ?? []).filter((t): t is TabKey => (TAB_KEYS as string[]).includes(t));
  return {
    name: row?.name ?? "",
    hidden,
    welcomed: !!row?.welcomedAt,
    on: (tab) => !hidden.includes(tab),
    moodleIcalUrl: clean(row?.moodleIcalUrl) ?? clean(process.env.MOODLE_ICAL_URL),
    moodleToken: clean(row?.moodleToken) ?? clean(process.env.MOODLE_TOKEN),
    moodleUrl: clean(row?.moodleUrl) ?? clean(process.env.MOODLE_URL),
    outlookIcsUrl: clean(row?.outlookIcsUrl) ?? clean(process.env.OUTLOOK_ICS_URL),
  };
}

/** Una sola consulta por petición aunque la pidan la barra, la página y la barra de sincronizar. */
export const getSettings = cache(async (): Promise<Settings> => {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  return toSettings(row);
});

/** Hash de la contraseña: la variable AUTH_PASSWORD_HASH (si alguien la prefiere) o la creada en la bienvenida. */
export async function passwordHash(): Promise<string | null> {
  if (process.env.AUTH_PASSWORD_HASH?.trim()) return process.env.AUTH_PASSWORD_HASH;
  const [row] = await db.select({ hash: settings.passwordHash }).from(settings).where(eq(settings.id, 1));
  return row?.hash ?? null;
}

/** Guarda valores en la única fila de ajustes (la crea si no existe). */
export async function saveSettings(values: Partial<typeof settings.$inferInsert>) {
  await db
    .insert(settings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: settings.id, set: { ...values, updatedAt: new Date() } });
}

/** Para las páginas de cada pestaña: si está desactivada, vuelve a Hoy. */
export async function requireTab(tab: TabKey) {
  if (!(await getSettings()).on(tab)) redirect("/");
}

/** Integraciones que siguen activas (las de pestañas desactivadas ni se sincronizan ni se enseñan). */
export function activeSources(s: Settings): Source[] {
  return (["moodle", "outlook"] as const).filter((src) => s.on(src));
}

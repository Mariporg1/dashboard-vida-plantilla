"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { externalItems } from "@/db/schema";
import type { Source } from "@/db/schema";
import { INTEGRATIONS, runSync, type SyncOutcome } from "@/sync/run";
import { activeSources, getSettings } from "@/lib/settings";

export async function syncNow(sources?: Source[]): Promise<SyncOutcome[]> {
  // Las integraciones de pestañas desactivadas en Ajustes no se sincronizan.
  const on = activeSources(await getSettings());
  const list = INTEGRATIONS.filter((i) => on.includes(i.source) && (!sources || sources.includes(i.source)));
  const result = await runSync(list);
  revalidatePath("/", "layout");
  return result;
}

/** Marca (o desmarca) como hecha una entrega importada. Se conserva al resincronizar. */
export async function toggleDismissed(id: number) {
  await db
    .update(externalItems)
    .set({ dismissedAt: sql`case when ${externalItems.dismissedAt} is null then now() else null end` })
    .where(eq(externalItems.id, id));
  revalidatePath("/", "layout");
}

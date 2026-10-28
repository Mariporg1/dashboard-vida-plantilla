import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { externalItems, integrationStatus, type Source } from "@/db/schema";
import { IntegrationError, type Integration } from "@/integrations/types";
import { moodle } from "@/integrations/moodle";
import { outlook } from "@/integrations/outlook";

export const INTEGRATIONS: Integration[] = [moodle, outlook];

export type SyncOutcome = { source: Source; ok: boolean; count?: number; error?: string; skipped?: boolean };

/**
 * Sincroniza cada integración de forma independiente: si una falla, las demás siguen
 * y sus datos anteriores se conservan; el error queda guardado para mostrarlo.
 */
export async function runSync(integrations = INTEGRATIONS, now = new Date()): Promise<SyncOutcome[]> {
  return Promise.all(integrations.map((i) => syncOne(i, now)));
}

async function syncOne(integration: Integration, now: Date): Promise<SyncOutcome> {
  const { source } = integration;
  if (!(await integration.isConfigured())) return { source, ok: false, skipped: true };

  await upsertStatus(source, { lastAttemptAt: now });
  try {
    const { items, mode, warning } = await integration.fetch(now);

    await db.transaction(async (tx) => {
      if (items.length > 0) {
        await tx
          .insert(externalItems)
          .values(items.map((it) => ({ ...it, source, lastSeenAt: now })))
          .onConflictDoUpdate({
            target: [externalItems.source, externalItems.externalId],
            // dismissedAt no se toca: lo que marcaste como hecho sigue hecho.
            set: {
              kind: sql`excluded.kind`,
              title: sql`excluded.title`,
              course: sql`excluded.course`,
              url: sql`excluded.url`,
              startsAt: sql`excluded.starts_at`,
              endsAt: sql`excluded.ends_at`,
              allDay: sql`excluded.all_day`,
              status: sql`excluded.status`,
              lastSeenAt: sql`excluded.last_seen_at`,
            },
          });
      }
      // Lo que ya no viene en el origen (entregado, borrado o fuera de la ventana) se elimina.
      await tx.delete(externalItems).where(and(eq(externalItems.source, source), lt(externalItems.lastSeenAt, now)));
    });

    await upsertStatus(source, {
      mode,
      lastSuccessAt: now,
      lastError: null,
      warning: warning ?? null,
      itemCount: items.length,
    });
    return { source, ok: true, count: items.length };
  } catch (e) {
    const message = e instanceof IntegrationError ? e.message : "Error inesperado al sincronizar.";
    if (!(e instanceof IntegrationError)) console.error(`[sync:${source}]`, e);
    await upsertStatus(source, { lastError: message });
    return { source, ok: false, error: message };
  }
}

async function upsertStatus(source: Source, values: Partial<typeof integrationStatus.$inferInsert>) {
  await db
    .insert(integrationStatus)
    .values({ source, ...values })
    .onConflictDoUpdate({ target: integrationStatus.source, set: values });
}

import Link from "next/link";
import { db } from "@/db";
import { integrationStatus } from "@/db/schema";
import { INTEGRATIONS } from "@/sync/run";
import { activeSources, getSettings } from "@/lib/settings";
import { SyncButton } from "./sync-button";

const fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const PAGE = { moodle: "/moodle", outlook: "/outlook" } as const;

/** Barra fija abajo con el estado de cada integración y el botón de sincronizar. Igual en todas las pestañas. */
export async function SyncBar() {
  const on = activeSources(await getSettings());
  const ready = await Promise.all(INTEGRATIONS.map((i) => i.isConfigured()));
  const configured = INTEGRATIONS.filter((i, k) => ready[k] && on.includes(i.source));
  if (configured.length === 0) return null;
  const statuses = await db.select().from(integrationStatus);

  return (
    <>
      {/* Hueco para que la barra no tape el final de la página. */}
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-4 py-2.5">
          <ul className="min-w-0 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
            {configured.map((i) => {
              const s = statuses.find((x) => x.source === i.source);
              const state = s?.lastError ? "error" : s?.warning ? "warn" : s?.lastSuccessAt ? "ok" : "none";
              const dot = { error: "bg-danger", warn: "bg-warn", ok: "bg-accent-soft", none: "bg-muted" }[state];
              return (
                <li key={i.source} className="flex items-center gap-1.5 min-w-0">
                  <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                  <Link href={PAGE[i.source]} className="truncate hover:text-fg" title={s?.lastError ?? s?.warning ?? undefined}>
                    {i.label}:{" "}
                    {state === "error" ? (
                      <span className="text-danger">no se pudo actualizar</span>
                    ) : s?.lastSuccessAt ? (
                      fmt.format(s.lastSuccessAt)
                    ) : (
                      "sin sincronizar"
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <SyncButton />
        </div>
      </div>
    </>
  );
}

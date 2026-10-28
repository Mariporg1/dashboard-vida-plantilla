import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { db } from "@/db";
import { externalItems, integrationStatus } from "@/db/schema";
import { Header } from "@/components/header";
import { requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SOURCE_COLORS } from "@/lib/colors";
import { SyncBar } from "@/components/sync-bar";
import { IntegrationStatus } from "@/components/integration-status";
import { moodle } from "@/integrations/moodle";
import { formatDue } from "@/lib/dates";
import { DoneToggle } from "./done-toggle";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MoodlePage() {
  await requireTab("moodle");
  const [items, [status]] = await Promise.all([
    db.select().from(externalItems).where(eq(externalItems.source, "moodle")).orderBy(asc(externalItems.startsAt)),
    db.select().from(integrationStatus).where(eq(integrationStatus.source, "moodle")),
  ]);
  const now = new Date();
  const isDone = (i: (typeof items)[number]) => i.status === "entregada" || !!i.dismissedAt;
  const pending = items.filter((i) => !isDone(i));
  const done = items.filter(isDone);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading title="Moodle" subtitle={`${pending.length} ${pending.length === 1 ? "entrega pendiente" : "entregas pendientes"} en Moodle`} />
        <section className="card">
          <IntegrationStatus label="Moodle" status={status} configured={await moodle.isConfigured()} />
        </section>

        <section className="card p-0">
          <h2 className="section-title flex items-center justify-between px-5 pb-2 pt-4">
            Entregas y eventos <span className="text-[13px] font-normal tabular-nums text-muted">{pending.length}</span>
          </h2>
          {pending.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted">No hay nada pendiente importado.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((i) => {
                const overdue = i.startsAt && i.startsAt < now;
                return (
                  <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-2 size-2 shrink-0 rounded-full" style={{ background: SOURCE_COLORS.moodle }} />
                    <div className="min-w-0 flex-1">
                      <a href={i.url ?? "#"} target="_blank" rel="noreferrer" className="font-medium hover:underline">{i.title}</a>
                      <p className="flex flex-wrap gap-x-2 text-[13px] text-muted">
                        {i.startsAt && (
                          <span className={overdue ? "text-danger" : ""}>
                            {overdue ? "Vencida · " : ""}{formatDue(i.startsAt, i.allDay, now)}
                          </span>
                        )}
                        {i.course && <span>· {i.course}</span>}
                      </p>
                    </div>
                    <DoneToggle id={i.id} done={false} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <details className="group card p-0">
            <summary className="section-title flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>Entregadas o marcadas como hechas <span className="ml-1 text-[13px] font-normal tabular-nums text-muted">{done.length}</span></span>
              <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} aria-hidden />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {done.map((i) => (
                <li key={i.id} className="flex items-start gap-3 px-5 py-3 text-muted">
                  <div className="min-w-0 flex-1">
                    <a href={i.url ?? "#"} target="_blank" rel="noreferrer" className="line-through hover:underline">{i.title}</a>
                    <span className="text-[13px]"> · {i.course}</span>
                  </div>
                  {/* Lo que Moodle da por entregado no se puede desmarcar aquí. */}
                  {i.dismissedAt ? <DoneToggle id={i.id} done /> : <span className="shrink-0 py-1.5 text-xs">Entregada en Moodle</span>}
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="text-[13px] text-muted">
          El token de la API y la conexión se configuran en{" "}
          <Link href="/ajustes" className="text-fg underline decoration-[var(--control)] underline-offset-4 hover:decoration-fg">Ajustes</Link>.
        </p>
      </main>
      <SyncBar />
    </>
  );
}

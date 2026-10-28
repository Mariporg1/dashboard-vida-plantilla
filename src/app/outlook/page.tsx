import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { externalItems, integrationStatus } from "@/db/schema";
import { Header } from "@/components/header";
import { requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SyncBar } from "@/components/sync-bar";
import { IntegrationStatus } from "@/components/integration-status";
import { outlook } from "@/integrations/outlook";
import { madridDateKey, madridTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" });

export default async function OutlookPage() {
  await requireTab("outlook");
  const now = new Date();
  const startOfToday = new Date(now.getTime() - 86_400_000);
  const [items, [status]] = await Promise.all([
    db
      .select()
      .from(externalItems)
      .where(and(eq(externalItems.source, "outlook"), gte(externalItems.endsAt, startOfToday)))
      .orderBy(asc(externalItems.startsAt)),
    db.select().from(integrationStatus).where(eq(integrationStatus.source, "outlook")),
  ]);

  // Agrupa por día de Madrid; lo que ya terminó hoy no se muestra.
  const days = new Map<string, typeof items>();
  for (const i of items) {
    if (i.endsAt && i.endsAt < now && !i.allDay) continue;
    const key = madridDateKey(i.startsAt!);
    days.set(key, [...(days.get(key) ?? []), i]);
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading title="Outlook" subtitle="Tu calendario de Outlook, de hoy en adelante." />
        <section className="card">
          <IntegrationStatus label="Outlook" status={status} configured={await outlook.isConfigured()} />
        </section>

        {days.size === 0 ? (
          <p className="card text-sm text-muted">No hay eventos próximos importados.</p>
        ) : (
          [...days.entries()].map(([key, list]) => (
            <section key={key} className="card p-0">
              <h2 className="section-title px-5 pb-2 pt-4 first-letter:uppercase">{dayFmt.format(list[0].startsAt!)}</h2>
              <ul className="divide-y divide-line">
                {list.map((i) => (
                  <li key={i.id} className="flex gap-4 px-5 py-3">
                    <span className="w-24 shrink-0 pt-px text-[13px] tabular-nums text-muted">
                      {i.allDay ? "Todo el día" : `${madridTime(i.startsAt!)}–${madridTime(i.endsAt!)}`}
                    </span>
                    <div className="min-w-0">
                      <a href={i.url ?? "#"} target="_blank" rel="noreferrer" className="break-words font-medium hover:underline">{i.title}</a>
                      {i.course && <p className="text-[13px] text-muted">{i.course}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
      <SyncBar />
    </>
  );
}

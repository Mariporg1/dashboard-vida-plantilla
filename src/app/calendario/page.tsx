import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Repeat } from "lucide-react";
import { db } from "@/db";
import { externalItems, taskCompletions, tasks } from "@/db/schema";
import { Header } from "@/components/header";
import { getSettings, requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SyncBar } from "@/components/sync-bar";
import { loadCalendar } from "@/lib/calendar-data";
import { CATEGORIES, CATEGORY_KEYS } from "@/lib/categories";
import { SOURCE_COLORS } from "@/lib/colors";
import { addDays, madridDateKey, madridToUtc } from "@/lib/dates";
import { monthWeeks, shiftMonth } from "@/lib/month";
import { occurrences } from "@/lib/weekly";

export const dynamic = "force-dynamic";

const monthFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", month: "long", year: "numeric" });
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

type Due = { key: string; title: string; color: string; weekly?: boolean };

// Vista de mes: solo entregas (Moodle) y tareas propias, sin clases. Pulsar un día abre su semana.
export default async function MesPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireTab("calendario");
  const { mes } = await searchParams;
  const today = madridDateKey(new Date());
  const month = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : today.slice(0, 7);
  const weeks = monthWeeks(month);
  const from = madridToUtc(weeks[0][0]);
  const to = madridToUtc(addDays(weeks.at(-1)![6], 1));

  const first = weeks[0][0];
  const last = weeks.at(-1)![6];
  const [items, taskRows, weeklyRows, weeksDone] = await Promise.all([
    db
      .select()
      .from(externalItems)
      .where(and(eq(externalItems.source, "moodle"), gte(externalItems.startsAt, from), lt(externalItems.startsAt, to), isNull(externalItems.dismissedAt))),
    db.select().from(tasks).where(and(gte(tasks.dueAt, from), lt(tasks.dueAt, to), isNull(tasks.completedAt), eq(tasks.weekly, false))),
    db.select().from(tasks).where(and(eq(tasks.weekly, true), lt(tasks.dueAt, to))),
    db.select().from(taskCompletions).where(and(gte(taskCompletions.date, first), lte(taskCompletions.date, last))),
  ]);

  const [s, cal] = await Promise.all([getSettings(), loadCalendar()]);
  const byDay = new Map<string, Due[]>();
  const add = (date: Date, d: Due) => {
    const k = madridDateKey(date);
    byDay.set(k, [...(byDay.get(k) ?? []), d]);
  };
  if (s.on("moodle")) for (const i of items) if (i.status !== "entregada") add(i.startsAt!, { key: `m${i.id}`, title: i.title, color: SOURCE_COLORS.moodle });
  if (s.on("tareas")) for (const t of taskRows) add(t.dueAt!, { key: `t${t.id}`, title: t.title, color: CATEGORIES[t.category].color });
  // Las semanales salen en todas las semanas; las ya hechas desaparecen.
  for (const o of occurrences(s.on("tareas") ? weeklyRows : [], weeksDone, first, last).filter((o) => !o.done)) {
    add(o.start, { key: `t${o.task.id}-${o.date}`, title: o.task.title, color: CATEGORIES[o.task.category].color, weekly: true });
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading title={monthFmt.format(madridToUtc(`${month}-15`))} subtitle="Pulsa un día para ver su semana con el horario.">
          <Link href={`/calendario?mes=${shiftMonth(month, -1)}`} className="btn-ghost" aria-label="Mes anterior">
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </Link>
          <Link href="/calendario" className="btn-ghost">Hoy</Link>
          <Link href={`/calendario?mes=${shiftMonth(month, 1)}`} className="btn-ghost" aria-label="Mes siguiente">
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Link>
          <Link href="/calendario/semana" className="btn-primary ml-1 h-9">Ver semana</Link>
        </PageHeading>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
          {s.on("moodle") && <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: SOURCE_COLORS.moodle }} />Entrega de Moodle</span>}
          {s.on("tareas") && CATEGORY_KEYS.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: CATEGORIES[c].color }} />{CATEGORIES[c].label}</span>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {WEEKDAYS.map((d) => <div key={d} className="py-2.5">{d}</div>)}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} className="grid grid-cols-7 border-b border-line last:border-b-0">
              {week.map((date) => {
                const due = byDay.get(date) ?? [];
                const inMonth = date.startsWith(month);
                const off = cal.nonTeachingDay(date);
                const isToday = date === today;
                return (
                  <Link
                    key={date}
                    href={`/calendario/semana?semana=${date}`}
                    title={off ? `Sin clase: ${off.label}` : undefined}
                    className={`min-h-16 min-w-0 border-r border-line p-1 transition-colors duration-150 last:border-r-0 hover:bg-raised/60 sm:min-h-28 sm:p-2 ${off ? "bg-raised/50" : ""}`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-[13px] tabular-nums ${
                        isToday ? "bg-fg font-medium text-[var(--primary-fg)]" : inMonth ? "" : "text-muted/50"
                      }`}
                    >
                      {Number(date.slice(8))}
                    </span>
                    {/* En el móvil solo puntos; desde sm, los títulos con su punto de color. */}
                    <div className={`mt-0.5 flex flex-wrap gap-0.5 sm:hidden ${inMonth ? "" : "opacity-40"}`}>
                      {due.map((d) => <span key={d.key} className="size-1.5 rounded-full" style={{ background: d.color }} />)}
                    </div>
                    <ul className={`mt-1 hidden space-y-0.5 sm:block ${inMonth ? "" : "opacity-40"}`}>
                      {due.slice(0, 3).map((d) => (
                        <li key={d.key} className="flex min-w-0 items-center gap-1.5 text-[12px] leading-4">
                          <span className="size-1.5 shrink-0 rounded-full" style={{ background: d.color }} />
                          <span className="truncate">{d.title}</span>
                          {d.weekly && <Repeat className="size-3 shrink-0 text-muted" strokeWidth={1.75} aria-label="Semanal" />}
                        </li>
                      ))}
                      {due.length > 3 && <li className="pl-3 text-[11px] text-muted">+{due.length - 3} más</li>}
                    </ul>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </main>
      <SyncBar />
    </>
  );
}

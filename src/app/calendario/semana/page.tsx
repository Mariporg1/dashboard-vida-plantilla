import { and, eq, gte, isNull, lt } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Pencil, Repeat } from "lucide-react";
import { db } from "@/db";
import { classExceptions, classSlots, externalItems, taskCompletions, tasks, workShifts } from "@/db/schema";
import { Header } from "@/components/header";
import { getSettings, requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SyncBar } from "@/components/sync-bar";
import { loadCalendar } from "@/lib/calendar-data";
import { CATEGORIES } from "@/lib/categories";
import { SOURCE_COLORS, colorFor, subjectColors } from "@/lib/colors";
import { addDays, madridDateKey, madridTime, madridToUtc } from "@/lib/dates";
import { classesForWeek, currentWeek, weekDays, weekStart } from "@/lib/schedule";
import { occurrences } from "@/lib/weekly";
import { ClassToggle } from "./class-toggle";

export const dynamic = "force-dynamic";

type Entry = {
  key: string;
  title: string;
  sub?: string | null;
  start: Date;
  end?: Date | null;
  allDay: boolean;
  color: string;
  label: string;
  url?: string | null;
  cancelled?: boolean;
  slotId?: number;
  /** Entregas y tareas: van en una burbuja aparte debajo del día, no entre las horas. */
  due?: boolean;
  weekly?: boolean;
};

const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric" });
const rangeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });

export default async function SemanaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requireTab("calendario");
  const { semana } = await searchParams;
  const today = madridDateKey(new Date());
  const monday = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? weekStart(semana) : currentWeek();
  const nextMonday = addDays(monday, 7);
  const from = madridToUtc(monday);
  const to = madridToUtc(nextMonday);

  const [slots, exceptions, items, taskRows, shifts, weeklyRows, weeksDone] = await Promise.all([
    db.select().from(classSlots),
    db.select().from(classExceptions).where(and(gte(classExceptions.date, monday), lt(classExceptions.date, nextMonday))),
    db.select().from(externalItems).where(and(gte(externalItems.startsAt, from), lt(externalItems.startsAt, to), isNull(externalItems.dismissedAt))),
    db.select().from(tasks).where(and(gte(tasks.dueAt, from), lt(tasks.dueAt, to), isNull(tasks.completedAt), eq(tasks.weekly, false))),
    db.select().from(workShifts).where(and(gte(workShifts.startAt, from), lt(workShifts.startAt, to))),
    db.select().from(tasks).where(and(eq(tasks.weekly, true), lt(tasks.dueAt, to))),
    db.select().from(taskCompletions).where(and(gte(taskCompletions.date, monday), lt(taskCompletions.date, nextMonday))),
  ]);

  const [s, cal] = await Promise.all([getSettings(), loadCalendar()]);
  const colors = subjectColors(slots.map((s) => s.subject));
  const entries: Entry[] = [
    ...classesForWeek(slots, exceptions, monday, cal).map((o) => ({
      key: `c${o.slot.id}-${o.date}`, title: o.slot.subject, sub: o.slot.location, start: o.start, end: o.end, allDay: false,
      color: colorFor(colors, o.slot.subject), label: "Clase", cancelled: o.cancelled, slotId: o.slot.id,
    })),
    ...items.filter((i) => s.on(i.source)).map((i) => ({
      key: `x${i.id}`, title: i.title, sub: i.course, start: i.startsAt!, end: i.source === "outlook" ? i.endsAt : null,
      allDay: i.allDay, color: SOURCE_COLORS[i.source], label: i.source === "moodle" ? "Moodle" : "Outlook", url: i.url,
      due: i.source === "moodle",
    })),
    ...(s.on("tareas") ? taskRows : []).map((t) => ({
      key: `t${t.id}`, title: t.title, sub: t.tag ? `#${t.tag}` : null, start: t.dueAt!, allDay: t.allDay,
      color: CATEGORIES[t.category].color, label: CATEGORIES[t.category].label, due: CATEGORIES[t.category].due,
    })),
    // Semanales: la de esta semana; si ya está marcada, no sale.
    ...occurrences(s.on("tareas") ? weeklyRows : [], weeksDone, monday, addDays(monday, 6)).filter((o) => !o.done).map((o) => ({
      key: `t${o.task.id}-${o.date}`, title: o.task.title, weekly: true, sub: o.task.tag ? `#${o.task.tag}` : null, start: o.start,
      allDay: o.task.allDay, color: CATEGORIES[o.task.category].color,
      label: o.done ? "Semanal · hecha" : `${CATEGORIES[o.task.category].label} semanal`, due: CATEGORIES[o.task.category].due, cancelled: o.done,
    })),
    ...(s.on("trabajo") ? shifts : []).map((w) => ({
      key: `w${w.id}`, title: w.note || "Turno de trabajo", start: w.startAt, end: w.endAt, allDay: false,
      color: SOURCE_COLORS.trabajo, label: w.endAt ? "Trabajo" : "Trabajo · en curso", url: "/trabajo",
    })),
  ];
  // Lo de todo el día primero; luego por hora.
  entries.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());

  const days = weekDays(monday).map((date) => {
    const list = entries.filter((e) => madridDateKey(e.start) === date);
    return {
      date,
      nonTeaching: cal.nonTeachingDay(date),
      due: list.filter((e) => e.due),
      agenda: list.filter((e) => !e.due),
    };
  });
  const when = (e: Entry) => (e.allDay ? "Todo el día" : `${madridTime(e.start)}${e.end ? `–${madridTime(e.end)}` : ""}`);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading
          title={`${rangeFmt.format(madridToUtc(monday, "12:00"))} – ${rangeFmt.format(madridToUtc(addDays(monday, 6), "12:00"))}`}
          subtitle={<Link href={`/calendario?mes=${monday.slice(0, 7)}`} className="inline-flex items-center gap-1 hover:text-fg"><ArrowLeft className="size-3.5" strokeWidth={1.75} />Volver al mes</Link>}
        >
          <Link href={`/calendario/semana?semana=${addDays(monday, -7)}`} className="btn-ghost" aria-label="Semana anterior">
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </Link>
          <Link href="/calendario/semana" className="btn-ghost">Esta semana</Link>
          <Link href={`/calendario/semana?semana=${nextMonday}`} className="btn-ghost" aria-label="Semana siguiente">
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Link>
          <Link href="/calendario/horario" className="btn-primary ml-1 h-9">
            <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
            Editar horario
          </Link>
        </PageHeading>

        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const isToday = d.date === today;
            return (
              <div key={d.date} className="flex min-w-0 flex-col gap-2">
                <section className={`card space-y-2.5 p-3 ${isToday ? "border-fg" : ""}`}>
                  <h2 className="flex items-center justify-between text-[13px] font-medium first-letter:uppercase">
                    <span className="first-letter:uppercase">{dayFmt.format(madridToUtc(d.date, "12:00"))}</span>
                    {isToday && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-[#0b0c0a]">Hoy</span>}
                  </h2>
                  {d.nonTeaching && (
                    <p className="rounded-lg bg-raised px-2 py-1 text-xs text-muted">
                      Sin clase: {d.nonTeaching.label}
                    </p>
                  )}
                  {d.agenda.length === 0 && !d.nonTeaching && <p className="text-xs text-muted">Nada</p>}
                  <ul className="space-y-1.5">
                    {d.agenda.map((e) => (
                      <li key={e.key} className={`rounded-xl bg-raised/60 px-2.5 py-2 text-sm ${e.cancelled ? "opacity-50" : ""}`}>
                        <p className="flex items-start justify-between gap-1 text-xs tabular-nums text-muted">
                          <span className="inline-flex min-w-0 items-center gap-1.5 tracking-tight">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: e.color }} />
                            <span>{when(e)}</span>
                          </span>
                          {e.slotId && <ClassToggle slotId={e.slotId} date={d.date} cancelled={!!e.cancelled} subject={e.title} />}
                        </p>
                        <p className={`mt-0.5 break-words font-medium leading-snug ${e.cancelled ? "line-through" : ""}`}>
                          {e.url ? <a href={e.url} {...(e.url.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})} className="hover:underline">{e.title}</a> : e.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {e.label}
                          {e.sub && ` · ${e.sub}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Burbuja aparte, debajo del día, solo con las entregas y tareas de ese día. */}
                {d.due.length > 0 && (
                  <section className="space-y-1.5 rounded-2xl border border-warn/30 bg-warn/[0.07] p-3" aria-label="Entregas">
                    <p className="flex items-center gap-1.5 text-[12px] font-medium text-warn">
                      <Flag className="size-3.5" strokeWidth={1.75} aria-hidden />
                      Entregas
                    </p>
                    {d.due.map((e) => (
                      <p key={e.key} className="flex items-start gap-1.5 text-xs leading-snug">
                        <span className="mt-1 size-1.5 shrink-0 rounded-full" style={{ background: e.color }} />
                        <span className="min-w-0 break-words">
                          {e.url ? <a href={e.url} target="_blank" rel="noreferrer" className="hover:underline">{e.title}</a> : e.title}
                          {e.weekly && <Repeat className="ml-1 inline size-3 text-muted" strokeWidth={1.75} aria-label="Semanal" />}
                          {!e.allDay && <span className="tabular-nums text-muted"> · {madridTime(e.start)}</span>}
                        </span>
                      </p>
                    ))}
                  </section>
                )}
              </div>
            );
          })}
        </div>
      </main>
      <SyncBar />
    </>
  );
}

import { and, desc, eq, gte, isNotNull, isNull, lt, or } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { classExceptions, classSlots, externalItems, taskCompletions, tasks, workShifts } from "@/db/schema";
import { Header } from "@/components/header";
import { SyncBar } from "@/components/sync-bar";
import { loadCalendar } from "@/lib/calendar-data";
import { AGENDA_DAYS, buildAgenda, type AgendaEntry } from "@/lib/agenda";
import { SOURCE_COLORS, colorFor, subjectColors } from "@/lib/colors";
import { addDays, madridDateKey, madridTime, madridToUtc } from "@/lib/dates";
import { countdownText, countdowns, greeting, isoWeekday, quoteOfTheDay, yearProgress } from "@/lib/hoy-extras";
import { classesForWeek, currentWeek } from "@/lib/schedule";
import { byUrgency } from "@/lib/tasks";
import { doneKey, occurrenceStart } from "@/lib/weekly";
import { formatMinutes, weekMinutes } from "@/lib/work";
import { getSettings, type TabKey } from "@/lib/settings";
import {
  ArrowUpRight, BriefcaseBusiness, CalendarDays, ChevronDown, Clock3, GraduationCap, ListChecks, Mail, Palmtree, Pin, Plus, Settings2, Sofa, TreePine,
} from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { AgendaRow } from "./agenda-row";
import { DayLine, type DayPoint } from "./day-line";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const longDate = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", year: "numeric" });
const hourFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" });

function minutesUntil(d: Date, now: Date) {
  return Math.max(0, Math.round((d.getTime() - now.getTime()) / 60_000));
}

export default async function HoyPage() {
  const now = new Date();
  const today = madridDateKey(now);
  const monday = currentWeek(now);
  const end = madridToUtc(addDays(today, AGENDA_DAYS + 1));
  const past = new Date(now.getTime() - 30 * 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const weekFrom = madridToUtc(monday);
  const weekTo = madridToUtc(addDays(monday, 7));

  const [s, cal, allTasks, allItems, allDoneTasks, allDismissed, slots, exceptions, shifts, [{ pendingTasks }], allWeeksDone] = await Promise.all([
    getSettings(),
    loadCalendar(),
    db.select().from(tasks).where(and(isNull(tasks.completedAt), or(lt(tasks.dueAt, end), isNull(tasks.dueAt)))),
    db.select().from(externalItems).where(and(lt(externalItems.startsAt, end), or(gte(externalItems.startsAt, past), gte(externalItems.endsAt, now)))),
    // "Hechas" de la última semana, para poder desmarcarlas.
    db.select().from(tasks).where(gte(tasks.completedAt, weekAgo)).orderBy(desc(tasks.completedAt)).limit(15),
    db.select().from(externalItems).where(and(isNotNull(externalItems.dismissedAt), gte(externalItems.dismissedAt, weekAgo))).orderBy(desc(externalItems.dismissedAt)).limit(15),
    db.select().from(classSlots),
    db.select().from(classExceptions).where(and(gte(classExceptions.date, monday), lt(classExceptions.date, addDays(monday, 7)))),
    db.select().from(workShifts).where(or(and(lt(workShifts.startAt, weekTo), or(gte(workShifts.endAt, weekFrom), isNull(workShifts.endAt))), isNull(workShifts.endAt))),
    db.$count(tasks, isNull(tasks.completedAt)).then((n) => [{ pendingTasks: n }]),
    // Semanas marcadas de las tareas semanales: las de esta ventana (para ocultarlas) y las recientes (para "Hechas").
    db
      .select({ c: taskCompletions, task: tasks })
      .from(taskCompletions)
      .innerJoin(tasks, eq(tasks.id, taskCompletions.taskId))
      .where(or(gte(taskCompletions.date, today), gte(taskCompletions.completedAt, weekAgo))),
  ]);

  // Primera vez: a la bienvenida.
  if (!s.welcomed) redirect("/ajustes");
  // Lo de las pestañas desactivadas en Ajustes no sale en Hoy.
  const sourceOn = (src: "moodle" | "outlook") => s.on(src);
  const taskRows = s.on("tareas") ? allTasks : [];
  const doneTasks = s.on("tareas") ? allDoneTasks : [];
  const weeksDone = s.on("tareas") ? allWeeksDone : [];
  const itemRows = allItems.filter((i) => sourceOn(i.source));
  const dismissed = allDismissed.filter((i) => sourceOn(i.source));

  const groups = buildAgenda(taskRows, itemRows, now, new Set(weeksDone.map((w) => doneKey(w.c.taskId, w.c.date))));
  // Tareas indeterminadas (sin fecha): siempre arriba.
  const pinned: AgendaEntry[] = taskRows
    .filter((t) => !t.dueAt)
    .sort(byUrgency)
    .map((t) => ({ type: "task", key: `t${t.id}`, due: null, allDay: true, task: t }));
  const all = groups.flatMap((g) => g.entries);
  const todayEntries = groups.find((g) => g.id === today)?.entries ?? [];

  const done: AgendaEntry[] = [
    ...doneTasks.map((t) => ({ type: "task" as const, key: `t${t.id}`, due: t.dueAt, allDay: t.allDay, task: t, at: t.completedAt! })),
    ...weeksDone
      .filter((w) => w.c.completedAt >= weekAgo)
      .map(({ c, task }) => ({
        type: "task" as const, key: `t${task.id}-${c.date}`, due: occurrenceStart(task, c.date), allDay: task.allDay, task, occurrence: c.date, at: c.completedAt,
      })),
    ...dismissed.map((i) => ({ type: i.source, key: `m${i.id}`, due: i.startsAt, allDay: i.allDay, item: i, at: i.dismissedAt! })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  // Clases de hoy y cuál toca ahora o la siguiente.
  const colors = subjectColors(slots.map((s) => s.subject));
  const classesToday = s.on("calendario") ? classesForWeek(slots, exceptions, monday, cal).filter((c) => c.date === today && !c.cancelled) : [];
  const current = classesToday.find((c) => c.start <= now && now < c.end);
  const next = classesToday.find((c) => c.start > now);
  const holiday = cal.nonTeachingDay(today);
  const weekend = isoWeekday(today) >= 6;

  const worked = weekMinutes(shifts, monday, now);

  const hello = greeting(Number(hourFmt.format(now)));
  const yearPct = yearProgress(today);
  const timers = countdowns(today, cal).slice(0, 4);

  const moodleWeek = all.filter((e) => e.type === "moodle").length;
  const outlookToday = todayEntries.filter((e) => e.type === "outlook").length;

  const pendingToday = todayEntries.filter((e) => e.type !== "outlook").length;
  const summary =
    pendingToday + classesToday.length === 0
      ? "Hoy lo tienes libre."
      : `Hoy tienes ${[
          pendingToday && `${pendingToday} ${pendingToday === 1 ? "cosa pendiente" : "cosas pendientes"}`,
          classesToday.length && `${classesToday.length} ${classesToday.length === 1 ? "clase" : "clases"}`,
        ]
          .filter(Boolean)
          .join(" y ")}.`;

  // La línea del día: clases como tramos y lo que tiene hora como nodos.
  const dayPoints: DayPoint[] = [
    ...classesToday.map((c) => ({
      key: `c${c.slot.id}`, label: c.slot.subject, start: c.start, end: c.end, color: colorFor(colors, c.slot.subject), kind: "class" as const,
    })),
    ...todayEntries
      .filter((e) => !e.allDay && e.due && madridDateKey(e.due) === today)
      .map((e) => ({
        key: e.key,
        label: e.type === "task" ? e.task.title : e.item.title,
        start: e.due!,
        end: e.type === "outlook" ? e.item.endsAt : null,
        color: e.type === "task" ? CATEGORIES[e.task.category].color : SOURCE_COLORS[e.type],
        kind: "item" as const,
      })),
  ];

  const shortcuts = [
    { tab: "calendario", href: "/calendario/semana", icon: CalendarDays, label: "Calendario", info: classesToday.length ? `${classesToday.length} ${classesToday.length === 1 ? "clase" : "clases"} hoy` : "Sin clases hoy" },
    { tab: "tareas", href: "/tareas", icon: ListChecks, label: "Tareas", info: `${pendingTasks} ${pendingTasks === 1 ? "pendiente" : "pendientes"}` },
    { tab: "trabajo", href: "/trabajo", icon: BriefcaseBusiness, label: "Trabajo", info: `${formatMinutes(worked)} esta semana` },
    { tab: "moodle", href: "/moodle", icon: GraduationCap, label: "Moodle", info: `${moodleWeek} ${moodleWeek === 1 ? "entrega" : "entregas"} en 7 días` },
    { tab: "outlook", href: "/outlook", icon: Mail, label: "Outlook", info: `${outlookToday} ${outlookToday === 1 ? "evento" : "eventos"} hoy` },
    { tab: "calendario", href: "/calendario/horario", icon: Clock3, label: "Horario", info: "Editar clases" },
    { tab: null, href: "/ajustes", icon: Settings2, label: "Ajustes", info: "Pestañas y conexiones" },
  ].filter((x) => !x.tab || s.on(x.tab as TabKey));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-4 pt-8 sm:pt-12">
        {/* Saludo: dos líneas, la primera en gris y la segunda en tinta, como en la referencia */}
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm text-muted first-letter:uppercase">{longDate.format(now)}</p>
            <h1 className="mt-3 text-[2.25rem] font-light leading-[1.02] tracking-[-0.04em] text-balance sm:text-[3.5rem]">
              <span className="block text-muted">{hello.text}{s.name ? `, ${s.name}` : ""}.</span>
              <span className="block">{summary}</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] text-muted">“{quoteOfTheDay(today)}”</p>
          </div>
          <div className="space-y-4 text-sm">
            <Progress label={`Año ${today.slice(0, 4)}`} percent={yearPct} />
          </div>
        </section>

        {/* Línea del día */}
        <section className="rounded-2xl border border-line bg-surface px-5 pb-3 pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="section-title">Tu día</h2>
            <p className="text-sm text-muted">
              {current ? (
                <>Ahora en <span className="text-fg">{current.slot.subject}</span> · termina en {minutesUntil(current.end, now)} min</>
              ) : next ? (
                <>Siguiente: <span className="text-fg">{next.slot.subject}</span> a las {next.slot.startTime}</>
              ) : holiday ? (
                `Sin clase: ${holiday.label}`
              ) : weekend ? (
                "Fin de semana, sin clases"
              ) : classesToday.length ? (
                "Clases terminadas por hoy"
              ) : (
                "Hoy no tienes clase"
              )}
            </p>
          </div>
          <DayLine points={dayPoints} now={now} label="Clases y cosas con hora de hoy" />
        </section>

        {/* Accesos a todas las pestañas: una sola pieza dividida por líneas finas */}
        <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-px overflow-hidden rounded-2xl border border-line bg-line">
          {shortcuts.map(({ href, icon: Icon, label, info }) => (
            <Link key={href} href={href} className="group flex min-w-[9rem] flex-1 basis-[40%] flex-col gap-6 bg-surface p-4 transition-colors duration-150 hover:bg-raised sm:basis-[9rem]">
              <Icon className="size-[18px] text-muted transition-colors duration-150 group-hover:text-fg" strokeWidth={1.5} aria-hidden />
              <span>
                <span className="flex items-center justify-between font-medium">
                  {label}
                  <ArrowUpRight className="size-3.5 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
                </span>
                <span className="block text-xs text-muted">{info}</span>
              </span>
            </Link>
          ))}
        </nav>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          {/* Agenda */}
          <div className="min-w-0 space-y-4">
            {pinned.length > 0 && (
              <section className="card p-0">
                <h2 className="section-title flex items-center gap-2 px-5 pb-2 pt-4">
                  <Pin className="size-4 text-muted" strokeWidth={1.75} aria-hidden />
                  Sin fecha <span className="font-normal text-muted tabular-nums">{pinned.length}</span>
                </h2>
                <ul className="divide-y divide-line">
                  {pinned.map((e) => <AgendaRow key={e.key} entry={e} />)}
                </ul>
              </section>
            )}

            <h2 className="px-1 pt-2 text-2xl font-light tracking-[-0.03em]">Próximos {AGENDA_DAYS} días</h2>

            {groups.length === 0 ? (
              <p className="card text-muted">Nada pendiente en los próximos {AGENDA_DAYS} días.</p>
            ) : (
              groups.map((g) => (
                <section key={g.id} className="card p-0">
                  <h3 className="section-title flex items-baseline justify-between px-5 pb-2 pt-4 first-letter:uppercase">
                    <span className="first-letter:uppercase">{g.label}</span>
                    <span className="text-sm font-normal text-muted tabular-nums">{g.entries.length}</span>
                  </h3>
                  <ul className="divide-y divide-line">
                    {g.entries.map((e) => <AgendaRow key={e.key} entry={e} />)}
                  </ul>
                </section>
              ))
            )}

            {done.length > 0 && (
              <details className="card group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
                  <span>
                    <span className="section-title">Hechas esta semana</span>{" "}
                    <span className="text-sm text-muted tabular-nums">{done.length}</span>
                    <span className="block text-sm text-muted">Desmarca una si la marcaste sin querer.</span>
                  </span>
                  <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {done.map((e) => <AgendaRow key={e.key} entry={e} isDone />)}
                </ul>
              </details>
            )}
          </div>

          {/* Columna lateral */}
          <aside className="space-y-4">
            {s.on("calendario") && (
            <section className="card space-y-3">
              <h2 className="section-title">Clases de hoy</h2>
              {classesToday.length === 0 ? (
                <p className="text-sm text-muted">
                  {holiday ? `Hoy no hay clase: ${holiday.label}.` : weekend ? "Es fin de semana, sin clases." : "Hoy no tienes clase."}
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {classesToday.map((c) => {
                    const finished = c.end <= now;
                    const live = c.start <= now && now < c.end;
                    return (
                      <li key={c.slot.id} className={`flex items-center gap-3 text-sm ${finished ? "text-muted" : ""}`}>
                        <span className="size-2 shrink-0 rounded-full" style={{ background: colorFor(colors, c.slot.subject) }} aria-hidden />
                        <span className="tabular-nums text-muted">{madridTime(c.start)}–{madridTime(c.end)}</span>
                        <span className={`font-medium ${finished ? "line-through decoration-1" : ""}`}>{c.slot.subject}</span>
                        {live && <span className="ml-auto rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-[#0b0c0a]">Ahora</span>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            )}

            {s.on("trabajo") && (
            <section className="card">
              <h2 className="section-title">Trabajo</h2>
              <p className="mt-3 text-[2rem] font-light leading-none tracking-[-0.03em] tabular-nums">{formatMinutes(worked)}</p>
              <p className="mt-1 text-sm text-muted">trabajadas esta semana</p>
              <Link href="/trabajo" className="btn-primary mt-4 h-9 w-full">
                <Plus className="size-4" strokeWidth={2} aria-hidden />
                Apuntar turno
              </Link>
            </section>
            )}

            <section className="card space-y-3">
              <h2 className="section-title">Cuenta atrás</h2>
              <ul className="space-y-2.5 text-sm">
                {timers.map((t) => {
                  const Icon = COUNTDOWN_ICONS[t.kind];
                  return (
                    <li key={t.label} className="flex items-center gap-3">
                      <Icon className="size-4 shrink-0 text-muted" strokeWidth={1.5} aria-hidden />
                      <span className="min-w-0 flex-1 truncate" title={t.label}>{t.label}</span>
                      <span className={`whitespace-nowrap tabular-nums ${t.days === 0 ? "font-medium text-accent" : "text-muted"}`}>{countdownText(t)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <SyncBar />
    </>
  );
}

const COUNTDOWN_ICONS = { weekend: Sofa, holiday: Palmtree, xmas: TreePine } as const;

function Progress({ label, percent, hint }: { label: string; percent: number; hint?: string }) {
  return (
    <div>
      <div className="flex justify-between">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-muted">{percent}%</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-1 rounded-full bg-fg" style={{ width: `${percent}%` }} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

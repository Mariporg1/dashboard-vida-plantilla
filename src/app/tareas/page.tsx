import { and, desc, gte, isNotNull, isNull, lte } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { taskCompletions, tasks } from "@/db/schema";
import { Header } from "@/components/header";
import { requireTab } from "@/lib/settings";
import { SyncBar } from "@/components/sync-bar";
import { madridDateKey, madridToUtc } from "@/lib/dates";
import { byUrgency } from "@/lib/tasks";
import { monthRange, occurrences } from "@/lib/weekly";
import { TaskForm } from "./task-form";
import { Repeat, ChevronDown } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { TaskItem } from "./task-item";
import type { WeekCheck } from "./week-checks";

const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "short", day: "numeric", month: "short" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", month: "long" });

export const dynamic = "force-dynamic";

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ tag?: string }> }) {
  await requireTab("tareas");
  const { tag } = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);
  // Las semanales muestran las semanas del mes actual; al cambiar de mes empiezan de cero.
  const today = madridDateKey(new Date());
  const month = monthRange(today.slice(0, 7));

  const [pendingAll, done, monthDone] = await Promise.all([
    db.select().from(tasks).where(isNull(tasks.completedAt)),
    db
      .select()
      .from(tasks)
      .where(and(isNotNull(tasks.completedAt), gte(tasks.completedAt, since)))
      .orderBy(desc(tasks.completedAt)),
    db.select().from(taskCompletions).where(and(gte(taskCompletions.date, month.from), lte(taskCompletions.date, month.to))),
  ]);

  const tags = [...new Set([...pendingAll, ...done].map((t) => t.tag).filter(Boolean))].sort() as string[];
  const visible = pendingAll.filter((t) => !tag || t.tag === tag);
  const weekly = visible.filter((t) => t.weekly).sort((a, b) => a.title.localeCompare(b.title, "es"));
  const pending = visible.filter((t) => !t.weekly).sort(byUrgency);
  const weeksOf = (id: number): WeekCheck[] =>
    occurrences(weekly.filter((t) => t.id === id), monthDone, month.from, month.to).map((o) => ({
      date: o.date, label: dayFmt.format(madridToUtc(o.date, "12:00")), done: o.done, past: o.date < today,
    }));
  const monthLabel = monthFmt.format(madridToUtc(month.from, "12:00"));
  const completed = done.filter((t) => !tag || t.tag === tag);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading title="Tareas" subtitle={`${pending.length + weekly.length} pendientes`} />
        <section className="card">
          <h2 className="section-title mb-4">Nueva tarea</h2>
          <TaskForm tags={tags} />
        </section>

        {tags.length > 0 && (
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por etiqueta">
            <Link href="/tareas" className={`chip ${!tag ? "chip-active" : ""}`}>Todas</Link>
            {tags.map((t) => (
              <Link key={t} href={`/tareas?tag=${encodeURIComponent(t)}`} className={`chip ${tag === t ? "chip-active" : ""}`}>
                #{t}
              </Link>
            ))}
          </nav>
        )}

        {weekly.length > 0 && (
          <section className="card p-0">
            <h2 className="section-title flex items-center gap-2 px-5 pb-2 pt-4">
              <Repeat className="size-4 text-muted" strokeWidth={1.75} aria-hidden />
              Semanales <span className="font-normal text-muted tabular-nums">{weekly.length}</span>
            </h2>
            <ul className="divide-y divide-line">
              {weekly.map((t) => <TaskItem key={t.id} task={t} tags={tags} weeks={weeksOf(t.id)} monthLabel={monthLabel} />)}
            </ul>
          </section>
        )}

        <section className="card p-0">
          <h2 className="section-title px-5 pb-2 pt-4">
            Pendientes <span className="font-normal text-muted tabular-nums">{pending.length}</span>
          </h2>
          {pending.length === 0 ? (
            <p className="px-5 pb-5 text-muted">No tienes tareas pendientes{tag ? ` con #${tag}` : ""}.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((t) => <TaskItem key={t.id} task={t} tags={tags} />)}
            </ul>
          )}
        </section>

        {completed.length > 0 && (
          <details className="group card p-0">
            <summary className="section-title flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span>Completadas en los últimos 30 días <span className="ml-1 text-[13px] font-normal tabular-nums text-muted">{completed.length}</span></span>
              <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open:rotate-180" strokeWidth={1.75} aria-hidden />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {completed.map((t) => <TaskItem key={t.id} task={t} tags={tags} />)}
            </ul>
          </details>
        )}
      </main>
      <SyncBar />
    </>
  );
}

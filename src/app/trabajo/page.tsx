import { and, asc, gte, isNull, lt, or } from "drizzle-orm";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { workShifts } from "@/db/schema";
import { Header } from "@/components/header";
import { requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SyncBar } from "@/components/sync-bar";
import { addDays, madridDateKey, madridToUtc } from "@/lib/dates";
import { currentWeek, weekDays, weekStart } from "@/lib/schedule";
import { formatMinutes, minutesBetween, weekMinutes } from "@/lib/work";
import { ShiftForm } from "./shift-form";
import { ShiftRow } from "./shift-row";

export const dynamic = "force-dynamic";

const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long" });
const rangeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short" });

export default async function TrabajoPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  await requireTab("trabajo");
  const { semana } = await searchParams;
  const now = new Date();
  const today = madridDateKey(now);
  const monday = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? weekStart(semana) : currentWeek(now);
  const from = madridToUtc(monday);
  const to = madridToUtc(addDays(monday, 7));

  // Turnos que tocan la semana (también los que empezaron el domingo anterior) y el abierto, si lo hay.
  const shifts = await db
    .select()
    .from(workShifts)
    .where(or(and(lt(workShifts.startAt, to), or(gte(workShifts.endAt, from), isNull(workShifts.endAt))), isNull(workShifts.endAt)))
    .orderBy(asc(workShifts.startAt));
  const open = shifts.find((s) => !s.endAt) ?? null;
  const total = weekMinutes(shifts, monday, now);
  const inWeek = shifts.filter((s) => s.startAt >= from && s.startAt < to);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading
          title="Trabajo"
          subtitle={`Semana del ${rangeFmt.format(madridToUtc(monday, "12:00"))} al ${rangeFmt.format(madridToUtc(addDays(monday, 6), "12:00"))}`}
        >
          <Link href={`/trabajo?semana=${addDays(monday, -7)}`} className="btn-ghost" aria-label="Semana anterior">
            <ChevronLeft className="size-4" strokeWidth={1.75} />
          </Link>
          <Link href="/trabajo" className="btn-ghost">Esta semana</Link>
          <Link href={`/trabajo?semana=${addDays(monday, 7)}`} className="btn-ghost" aria-label="Semana siguiente">
            <ChevronRight className="size-4" strokeWidth={1.75} />
          </Link>
        </PageHeading>

        <section className="card flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] text-muted">Horas esta semana</p>
            <p className="mt-1 text-[2.5rem] font-light leading-none tracking-[-0.03em] tabular-nums">{formatMinutes(total)}</p>
          </div>
          <p className="text-right text-[13px] text-muted">
            {inWeek.length} {inWeek.length === 1 ? "turno" : "turnos"}
            {open && <><br />incluye el turno en curso</>}
          </p>
        </section>

        {weekDays(monday).map((date) => {
          const list = inWeek.filter((s) => madridDateKey(s.startAt) === date);
          if (list.length === 0) return null;
          const dayTotal = minutesBetween(list, madridToUtc(date), madridToUtc(addDays(date, 1)), now);
          return (
            <section key={date} className="card p-0">
              <h2 className="section-title flex items-center justify-between px-5 pb-2 pt-4">
                <span className="inline-flex items-center gap-2 first-letter:uppercase">
                  <span className="first-letter:uppercase">{dayFmt.format(madridToUtc(date, "12:00"))}</span>
                  {date === today && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-[#0b0c0a]">Hoy</span>}
                </span>
                <span className="text-[13px] font-normal tabular-nums text-muted">{formatMinutes(dayTotal)}</span>
              </h2>
              <ul className="divide-y divide-line">{list.map((s) => <ShiftRow key={s.id} shift={s} />)}</ul>
            </section>
          );
        })}
        {inWeek.length === 0 && <p className="card text-sm text-muted">No hay turnos esta semana.</p>}

        <section className="card">
          <h2 className="section-title mb-4">Apuntar un turno</h2>
          <ShiftForm defaultDate={today >= monday && today < addDays(monday, 7) ? today : monday} />
        </section>
      </main>
      <SyncBar />
    </>
  );
}

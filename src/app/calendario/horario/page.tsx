import { asc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { classSlots, holidays } from "@/db/schema";
import { Header } from "@/components/header";
import { requireTab } from "@/lib/settings";
import { PageHeading } from "@/components/page-heading";
import { SyncBar } from "@/components/sync-bar";
import { SlotForm } from "./slot-form";
import { SlotRow } from "./slot-row";
import { HolidayForm, HolidayRow } from "./holidays";
import { subjectColors } from "@/lib/colors";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default async function HorarioPage() {
  await requireTab("calendario");
  const [slots, offDays] = await Promise.all([
    db.select().from(classSlots).orderBy(asc(classSlots.weekday), asc(classSlots.startTime)),
    db.select().from(holidays).orderBy(asc(holidays.from)),
  ]);
  const colors = subjectColors(slots.map((s) => s.subject));

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-4 pt-8 sm:pt-12">
        <PageHeading
          title="Horario"
          subtitle="Se repite cada semana dentro de su periodo y se salta los días sin clase que añadas abajo. Para quitar una clase solo un día, pulsa la X sobre ella en la semana."
        >
          <Link href="/calendario/semana" className="btn-ghost">
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
            Calendario
          </Link>
        </PageHeading>

        {WEEKDAYS.map((name, i) => {
          const list = slots.filter((s) => s.weekday === i + 1);
          if (list.length === 0 && i >= 5) return null;
          return (
            <section key={name} className="card p-0">
              <h2 className="section-title px-5 pb-2 pt-4">{name}</h2>
              {list.length === 0 ? (
                <p className="px-5 pb-4 text-sm text-muted">Sin clases.</p>
              ) : (
                <ul className="divide-y divide-line">{list.map((s) => <SlotRow key={s.id} slot={s} color={colors.get(s.subject.trim().toLowerCase())!} />)}</ul>
              )}
            </section>
          );
        })}

        <section className="card">
          <h2 className="section-title mb-4">Añadir clase</h2>
          <SlotForm />
        </section>

        <section className="card p-0">
          <div className="px-5 pb-2 pt-4">
            <h2 className="section-title">Días sin clase</h2>
            <p className="mt-1 text-[13px] text-muted">
              Festivos, puentes y vacaciones de tu centro. Esos días no salen clases y Hoy te avisa de cuánto falta.
            </p>
          </div>
          {offDays.length > 0 && <ul className="divide-y divide-line">{offDays.map((h) => <HolidayRow key={h.id} holiday={h} />)}</ul>}
          <div className="border-t border-line p-5">
            <HolidayForm />
          </div>
        </section>
      </main>
      <SyncBar />
    </>
  );
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { classExceptions, classSlots, holidays } from "@/db/schema";
import { defaultTerm } from "@/lib/academic-calendar";
import { madridDateKey } from "@/lib/dates";

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Quita (o vuelve a poner) una clase solo en un día concreto. */
export async function toggleClassOnDay(slotId: number, date: string) {
  dateKey.parse(date);
  const where = and(eq(classExceptions.slotId, slotId), eq(classExceptions.date, date));
  const [existing] = await db.select().from(classExceptions).where(where);
  if (existing) await db.delete(classExceptions).where(where);
  else await db.insert(classExceptions).values({ slotId, date });
  revalidatePath("/calendario", "layout");
  revalidatePath("/");
}

const time = z.string().regex(/^\d{2}:\d{2}$/, "Hora no válida");
const slotInput = z
  .object({
    subject: z.string().trim().min(1, "Falta la asignatura").max(60),
    weekday: z.coerce.number().int().min(1).max(7),
    startTime: time,
    endTime: time,
    location: z.string().trim().max(60).optional().transform((v) => v || null),
    validFrom: dateKey.default(() => defaultTerm(madridDateKey(new Date())).from),
    validTo: dateKey.default(() => defaultTerm(madridDateKey(new Date())).to),
  })
  .refine((v) => v.startTime < v.endTime, { message: "La hora de fin debe ser posterior a la de inicio" })
  .refine((v) => v.validFrom <= v.validTo, { message: "El periodo no es válido" });

export type SlotFormState = { error?: string; ok?: boolean; nonce?: number };

function parseSlot(form: FormData) {
  const raw = Object.fromEntries(
    ["subject", "weekday", "startTime", "endTime", "location", "validFrom", "validTo"].map((k) => [k, form.get(k) || undefined]),
  );
  return slotInput.safeParse(raw);
}

export async function saveSlot(id: number | null, _prev: SlotFormState, form: FormData): Promise<SlotFormState> {
  const parsed = parseSlot(form);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (id) await db.update(classSlots).set(parsed.data).where(eq(classSlots.id, id));
  else await db.insert(classSlots).values(parsed.data);
  revalidatePath("/calendario", "layout");
  revalidatePath("/");
  return { ok: true, nonce: Date.now() };
}

export async function deleteSlot(id: number) {
  await db.delete(classSlots).where(eq(classSlots.id, id));
  revalidatePath("/calendario", "layout");
  revalidatePath("/");
}

const holidayInput = z
  .object({
    label: z.string().trim().min(1, "Escribe el motivo (p. ej. Navidad)").max(60),
    from: dateKey,
    to: dateKey.optional(),
  })
  .transform((v) => ({ ...v, to: v.to || v.from }))
  .refine((v) => v.from <= v.to, { message: "La fecha de fin debe ser igual o posterior a la de inicio" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 < 366, { message: "Como mucho un año seguido" });

export type HolidayFormState = { error?: string; ok?: boolean; nonce?: number };

/** Añade un día (o un periodo) sin clase: festivo, puente o vacaciones. */
export async function addHoliday(_prev: HolidayFormState, form: FormData): Promise<HolidayFormState> {
  const parsed = holidayInput.safeParse({
    label: form.get("label") ?? "",
    from: form.get("from") ?? "",
    to: form.get("to") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await db.insert(holidays).values(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, nonce: Date.now() };
}

export async function deleteHoliday(id: number) {
  await db.delete(holidays).where(eq(holidays.id, id));
  revalidatePath("/", "layout");
}

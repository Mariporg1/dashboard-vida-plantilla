"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { workShifts } from "@/db/schema";
import { manualShift } from "@/lib/work";

function refresh() {
  revalidatePath("/trabajo");
  revalidatePath("/");
  revalidatePath("/calendario", "layout");
}

const shiftInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Falta la fecha"),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Falta la hora de entrada"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Falta la hora de salida"),
  note: z.string().trim().max(200).optional().transform((v) => v || null),
});

export type ShiftFormState = { error?: string; ok?: boolean; nonce?: number };

export async function saveShift(id: number | null, _prev: ShiftFormState, form: FormData): Promise<ShiftFormState> {
  const parsed = shiftInput.safeParse(Object.fromEntries(["date", "start", "end", "note"].map((k) => [k, form.get(k) || undefined])));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { date, start, end, note } = parsed.data;
  if (start === end) return { error: "La entrada y la salida no pueden ser iguales" };
  const values = { ...manualShift(date, start, end), note };
  if (id) await db.update(workShifts).set(values).where(eq(workShifts.id, id));
  else await db.insert(workShifts).values(values);
  refresh();
  return { ok: true, nonce: Date.now() };
}

export async function deleteShift(id: number) {
  await db.delete(workShifts).where(eq(workShifts.id, id));
  refresh();
}

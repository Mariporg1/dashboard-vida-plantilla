"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { taskCompletions, tasks } from "@/db/schema";
import { parseTaskForm } from "@/lib/tasks";

export type FormState = { error?: string; ok?: boolean; nonce?: number };

function refresh() {
  revalidatePath("/tareas");
  revalidatePath("/");
  revalidatePath("/calendario", "layout");
}

export async function createTask(_prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseTaskForm(form);
  if (!parsed.ok) return { error: parsed.error };
  await db.insert(tasks).values(parsed.values);
  refresh();
  // nonce cambia en cada alta para que el formulario sepa que debe vaciarse.
  return { ok: true, nonce: Date.now() };
}

export async function updateTask(id: number, _prev: FormState, form: FormData): Promise<FormState> {
  const parsed = parseTaskForm(form);
  if (!parsed.ok) return { error: parsed.error };
  await db.update(tasks).set({ ...parsed.values, updatedAt: new Date() }).where(eq(tasks.id, id));
  refresh();
  return { ok: true, nonce: Date.now() };
}

export async function toggleTask(id: number) {
  await db
    .update(tasks)
    .set({
      completedAt: sql`case when ${tasks.completedAt} is null then now() else null end`,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, id));
  refresh();
}

/** Marca o desmarca una semana concreta de una tarea semanal. */
export async function toggleOccurrence(taskId: number, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const deleted = await db
    .delete(taskCompletions)
    .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.date, date)))
    .returning({ taskId: taskCompletions.taskId });
  if (deleted.length === 0) await db.insert(taskCompletions).values({ taskId, date }).onConflictDoNothing();
  refresh();
}

export async function deleteTask(id: number) {
  await db.delete(tasks).where(eq(tasks.id, id));
  refresh();
}

import { z } from "zod";
import { madridToUtc } from "./dates";
import type { Priority } from "@/db/schema";

export const PRIORITIES: Priority[] = ["alta", "media", "baja"];
const PRIORITY_RANK: Record<Priority, number> = { alta: 0, media: 1, baja: 2 };

export const taskInput = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  notes: z.string().trim().max(2000).optional().transform((v) => v || null),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  priority: z.enum(["alta", "media", "baja"]).default("media"),
  category: z.enum(["tarea", "entrega", "examen", "reunion", "personal"]).default("tarea"),
  tag: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  weekly: z.literal("on").optional().transform((v) => v === "on"),
});

/** Convierte los campos del formulario (fecha/hora en Madrid) en columnas de la tabla. */
export function parseTaskForm(form: FormData) {
  const raw = Object.fromEntries(
    ["title", "notes", "date", "time", "priority", "tag", "category", "weekly"].map((k) => [k, form.get(k) ?? undefined]),
  );
  const parsed = taskInput.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const { title, notes, date, time, priority, tag, category, weekly } = parsed.data;
  if (weekly && !date) return { ok: false as const, error: "Para que se repita cada semana, ponle la fecha de la primera vez" };
  return {
    ok: true as const,
    values: {
      title,
      notes,
      priority,
      tag,
      category,
      weekly,
      dueAt: date ? madridToUtc(date, time ?? "00:00") : null,
      allDay: !time,
    },
  };
}

type Sortable = { dueAt: Date | null; allDay: boolean; priority: Priority; createdAt: Date };

// Para comparar, una tarea de "todo el día" vence al final de ese día, no a las 00:00.
function effectiveDue(t: Sortable): number {
  if (!t.dueAt) return Number.POSITIVE_INFINITY;
  return t.dueAt.getTime() + (t.allDay ? 86_400_000 - 1 : 0);
}

/** Orden por urgencia: primero lo que vence antes (incluidas las vencidas), luego prioridad; sin fecha al final. */
export function byUrgency(a: Sortable, b: Sortable): number {
  return (
    effectiveDue(a) - effectiveDue(b) ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.createdAt.getTime() - b.createdAt.getTime()
  );
}


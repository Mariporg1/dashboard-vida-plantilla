import { describe, expect, it } from "vitest";
import type { ExternalItem, Task } from "@/db/schema";
import { buildAgenda } from "./agenda";
import { madridToUtc } from "./dates";

const created = new Date("2026-10-01T00:00:00Z");
let id = 0;
function task(title: string, due: Date | null, allDay = true, extra: Partial<Task> = {}): Task {
  return {
    id: ++id, title, notes: null, dueAt: due, allDay, priority: "media", tag: null, category: "tarea", weekly: false, completedAt: null,
    createdAt: created, updatedAt: created, ...extra,
  };
}
function item(source: "moodle" | "outlook", title: string, start: Date, extra: Partial<ExternalItem> = {}): ExternalItem {
  return {
    id: ++id, source, externalId: title, kind: source === "moodle" ? "entrega" : "evento", title, course: null, url: null,
    startsAt: start, endsAt: source === "outlook" ? new Date(start.getTime() + 3_600_000) : null, allDay: false,
    status: source === "moodle" ? "pendiente" : null, dismissedAt: null, lastSeenAt: created, ...extra,
  };
}

// Viernes 23/10/2026 a las 17:00 en Madrid (horario de verano: 15:00 UTC).
const now = madridToUtc("2026-10-23", "17:00");

describe("buildAgenda", () => {
  const groups = buildAgenda(
    [
      task("Leer tema 2", madridToUtc("2026-10-21")), // vencida
      task("Repasar apuntes", madridToUtc("2026-10-23")), // hoy, todo el día: no vencida aún
      task("Hecha", madridToUtc("2026-10-23"), true, { completedAt: now }),
      task("Sin fecha", null),
      task("Muy lejos", madridToUtc("2026-11-20")),
      task("Domingo urgente", madridToUtc("2026-10-25", "10:00"), false, { priority: "alta" }),
      task("Día +7 a última hora", madridToUtc("2026-10-30", "23:30"), false),
    ],
    [
      item("moodle", "Práctica 2", madridToUtc("2026-10-23", "23:59")),
      item("moodle", "Cuestionario vencido", madridToUtc("2026-10-22", "12:00")),
      item("moodle", "Ya entregada", madridToUtc("2026-10-24", "12:00"), { status: "entregada" }),
      item("moodle", "Descartada", madridToUtc("2026-10-24", "12:00"), { dismissedAt: now }),
      item("outlook", "Clase terminada", madridToUtc("2026-10-23", "10:00")),
      item("outlook", "Clase de la tarde", madridToUtc("2026-10-23", "18:00")),
      item("outlook", "Tutoría lunes", madridToUtc("2026-10-26", "11:30")),
      item("outlook", "Fuera de rango", madridToUtc("2026-10-31", "10:00")),
    ],
    now,
  );
  const view = Object.fromEntries(
    groups.map((g) => [g.label, g.entries.map((e) => (e.type === "task" ? e.task.title : e.item.title))]),
  );

  it("agrupa por urgencia y en orden", () => {
    expect(groups.map((g) => g.label)).toEqual([
      "Hoy",
      "domingo, 25 de octubre",
      "lunes, 26 de octubre",
      "viernes, 30 de octubre",
    ]);
  });

  it("hoy ordenado por hora y lo de todo el día al final", () => {
    expect(view["Hoy"]).toEqual(["Clase de la tarde", "Práctica 2", "Repasar apuntes"]);
  });

  it("excluye vencidas, completadas, entregadas, descartadas, sin fecha, eventos terminados y lo que pasa de 7 días", () => {
    const all = Object.values(view).flat();
    for (const t of ["Leer tema 2", "Cuestionario vencido", "Hecha", "Sin fecha", "Muy lejos", "Ya entregada", "Descartada", "Clase terminada", "Fuera de rango"]) {
      expect(all).not.toContain(t);
    }
    expect(view["viernes, 30 de octubre"]).toEqual(["Día +7 a última hora"]);
  });

  it("usa 'Mañana' para el día siguiente", () => {
    const g = buildAgenda([task("Algo", madridToUtc("2026-10-24", "09:00"), false)], [], now);
    expect(g[0].label).toBe("Mañana");
  });

  it("las tareas semanales salen cada semana y se quitan solo de la semana marcada", () => {
    const now = new Date("2026-10-24T08:00:00Z"); // sábado
    const t = task("Inglés", new Date("2026-10-01T08:30:00Z"), false, { weekly: true }); // jueves 10:30
    const all = buildAgenda([t], [], now).flatMap((g) => g.entries);
    expect(all.map((e) => e.type === "task" && e.occurrence)).toEqual(["2026-10-29"]);
    const done = buildAgenda([t], [], now, new Set([`${t.id}|2026-10-29`])).flatMap((g) => g.entries);
    expect(done).toEqual([]);
    // El jueves 29 ya es horario de invierno: sigue a las 10:30 de Madrid.
    expect(all[0].due).toEqual(new Date("2026-10-29T09:30:00Z"));
  });
});

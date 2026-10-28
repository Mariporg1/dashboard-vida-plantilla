import { describe, expect, it } from "vitest";
import { byUrgency, parseTaskForm } from "./tasks";
import { madridToUtc } from "./dates";

function form(values: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
}

describe("parseTaskForm", () => {
  it("convierte fecha y hora de Madrid a UTC", () => {
    const r = parseTaskForm(form({ title: " Práctica 2 ", date: "2026-11-03", time: "23:59", priority: "alta", tag: "SO", category: "examen" }));
    expect(r.ok && r.values).toMatchObject({
      category: "examen",
      title: "Práctica 2",
      priority: "alta",
      tag: "so",
      allDay: false,
      dueAt: new Date("2026-11-03T22:59:00Z"),
    });
  });

  it("sin hora es de todo el día; sin fecha no vence", () => {
    const a = parseTaskForm(form({ title: "A", date: "2026-11-03" }));
    expect(a.ok && a.values.allDay).toBe(true);
    expect(a.ok && a.values.category).toBe("tarea");
    const b = parseTaskForm(form({ title: "B", date: "", time: "" }));
    expect(b.ok && b.values.dueAt).toBe(null);
  });

  it("rechaza título vacío y prioridad desconocida", () => {
    expect(parseTaskForm(form({ title: "  " })).ok).toBe(false);
    expect(parseTaskForm(form({ title: "x", priority: "urgente" })).ok).toBe(false);
    expect(parseTaskForm(form({ title: "x", category: "fiesta" })).ok).toBe(false);
  });
});

describe("tareas semanales", () => {
  it("lee la casilla y exige fecha", () => {
    const r = parseTaskForm(form({ title: "Gimnasio", date: "2026-10-26", weekly: "on" }));
    expect(r.ok && r.values.weekly).toBe(true);
    expect(parseTaskForm(form({ title: "Gimnasio", weekly: "on" })).ok).toBe(false);
    const n = parseTaskForm(form({ title: "Una vez", date: "2026-10-26" }));
    expect(n.ok && n.values.weekly).toBe(false);
  });
});

describe("byUrgency", () => {
  const created = new Date("2026-10-01T00:00:00Z");
  const t = (name: string, due: Date | null, allDay: boolean, priority: "alta" | "media" | "baja" = "media") => ({
    name, dueAt: due, allDay, priority, createdAt: created,
  });

  it("ordena por vencimiento, luego prioridad, y deja sin fecha al final", () => {
    const list = [
      t("sin fecha", null, true, "alta"),
      t("jueves todo el día", madridToUtc("2026-10-29"), true),
      t("jueves 10:00", madridToUtc("2026-10-29", "10:00"), false),
      t("vencida", madridToUtc("2026-10-20"), true, "baja"),
      t("jueves todo el día alta", madridToUtc("2026-10-29"), true, "alta"),
    ];
    expect(list.sort(byUrgency).map((x) => x.name)).toEqual([
      "vencida",
      "jueves 10:00",
      "jueves todo el día alta",
      "jueves todo el día",
      "sin fecha",
    ]);
  });
});

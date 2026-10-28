import { describe, expect, it } from "vitest";
import type { ClassSlot } from "@/db/schema";
import { classesForWeek, weekStart } from "./schedule";
import { defaultTerm, makeCalendar } from "./academic-calendar";
import { madridTime } from "./dates";

let id = 0;
const slot = (subject: string, weekday: number, startTime: string, endTime: string, extra: Partial<ClassSlot> = {}): ClassSlot => ({
  id: ++id, subject, weekday, startTime, endTime, location: null, validFrom: "2026-09-07", validTo: "2027-02-02", ...extra,
});

const cal = makeCalendar([
  { from: "2026-11-02", to: "2026-11-02", label: "Puente" },
  { from: "2026-12-23", to: "2027-01-07", label: "Vacaciones de Navidad" },
]);

const slots = [
  slot("Matemáticas", 1, "08:30", "10:30"),
  slot("Física", 1, "12:30", "14:30"),
  slot("Inglés", 4, "10:30", "12:30"),
  slot("Programación", 5, "11:30", "12:30"),
  slot("Física", 5, "12:30", "14:30"),
];
const prog = slots[3];
const view = (occ: ReturnType<typeof classesForWeek>) =>
  occ.map((o) => `${o.date} ${madridTime(o.start)} ${o.slot.subject}${o.cancelled ? " (quitada)" : ""}`);

describe("weekStart", () => {
  it("devuelve el lunes de la semana", () => {
    expect(weekStart("2026-10-26")).toBe("2026-10-26");
    expect(weekStart("2026-10-30")).toBe("2026-10-26");
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // domingo
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
});

describe("classesForWeek", () => {
  it("semana del 26/10: genera las clases y marca Programación del viernes 30 como quitada", () => {
    const occ = classesForWeek(slots, [{ id: 1, slotId: prog.id, date: "2026-10-30" }], "2026-10-26");
    expect(view(occ)).toEqual([
      "2026-10-26 08:30 Matemáticas",
      "2026-10-26 12:30 Física",
      "2026-10-29 10:30 Inglés",
      "2026-10-30 11:30 Programación (quitada)",
      "2026-10-30 12:30 Física",
    ]);
  });

  it("la excepción solo afecta a ese día: la semana siguiente Programación vuelve", () => {
    const occ = classesForWeek(slots, [{ id: 1, slotId: prog.id, date: "2026-10-30" }], "2026-11-02");
    expect(view(occ)).toContain("2026-11-06 11:30 Programación");
  });

  it("día sin clase: el lunes 2/11 no se genera nada", () => {
    expect(cal.nonTeachingDay("2026-11-02")?.label).toBe("Puente");
    const occ = classesForWeek(slots, [], "2026-11-02", cal);
    expect(occ.some((o) => o.date === "2026-11-02")).toBe(false);
    expect(classesForWeek(slots, [], "2026-11-02").some((o) => o.date === "2026-11-02")).toBe(true);
  });

  it("fuera del periodo de la clase no hay clases", () => {
    expect(classesForWeek(slots, [], "2027-02-08")).toEqual([]);
  });

  it("vacaciones sin clases; la hora es correcta tras el cambio de hora", () => {
    expect(classesForWeek(slots, [], "2026-12-28", cal)).toEqual([]);
    // 19/10 es horario de verano (UTC+2); 9/11, de invierno (UTC+1).
    expect(classesForWeek(slots, [], "2026-10-19")[0].start.toISOString()).toBe("2026-10-19T06:30:00.000Z");
    expect(classesForWeek(slots, [], "2026-11-09")[0].start.toISOString()).toBe("2026-11-09T07:30:00.000Z");
  });
});

describe("defaultTerm", () => {
  it("propone el cuatrimestre en curso", () => {
    expect(defaultTerm("2026-10-28")).toEqual({ from: "2026-10-28", to: "2027-01-31" });
    expect(defaultTerm("2027-01-10")).toEqual({ from: "2027-01-10", to: "2027-01-31" });
    expect(defaultTerm("2027-03-01")).toEqual({ from: "2027-03-01", to: "2027-06-30" });
  });
});

describe("monthWeeks", () => {
  it("cubre el mes completo de lunes a domingo", async () => {
    const { monthWeeks, shiftMonth } = await import("./month");
    const oct = monthWeeks("2026-10");
    expect(oct[0][0]).toBe("2026-09-28");
    expect(oct.at(-1)!.at(-1)).toBe("2026-11-01");
    expect(oct).toHaveLength(5);
    expect(monthWeeks("2027-02")).toHaveLength(4); // febrero 2027 empieza en lunes
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
});

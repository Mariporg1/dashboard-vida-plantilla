import { describe, expect, it } from "vitest";
import { madridToUtc } from "./dates";
import { monthRange, occurrenceDates, occurrenceStart } from "./weekly";

const jueves = { dueAt: madridToUtc("2026-10-08", "10:30"), allDay: false };

describe("tareas semanales", () => {
  it("se repite todos los jueves del mes desde su primera fecha", () => {
    const { from, to } = monthRange("2026-10");
    expect(occurrenceDates(jueves, from, to)).toEqual(["2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29"]);
    const nov = monthRange("2026-11");
    expect(occurrenceDates(jueves, nov.from, nov.to)).toEqual(["2026-11-05", "2026-11-12", "2026-11-19", "2026-11-26"]);
  });

  it("no hay repeticiones antes de la primera fecha", () => {
    expect(occurrenceDates(jueves, "2026-09-01", "2026-10-07")).toEqual([]);
  });

  it("mantiene la hora de Madrid al cambiar al horario de invierno", () => {
    expect(occurrenceStart(jueves, "2026-10-22")).toEqual(new Date("2026-10-22T08:30:00Z"));
    expect(occurrenceStart(jueves, "2026-10-29")).toEqual(new Date("2026-10-29T09:30:00Z"));
  });

  it("calcula el último día del mes", () => {
    expect(monthRange("2027-02")).toEqual({ from: "2027-02-01", to: "2027-02-28" });
  });
});

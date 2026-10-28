import { describe, expect, it } from "vitest";
import { formatMinutes, manualShift, weekMinutes } from "./work";
import { madridToUtc } from "./dates";

describe("horas de trabajo", () => {
  const shifts = [
    manualShift("2026-10-26", "17:00", "21:00"), // lun 4 h
    manualShift("2026-10-28", "16:30", "20:15"), // mié 3 h 45
    manualShift("2026-11-01", "22:00", "02:00"), // dom 22:00 → lun 02:00: 2 h esta semana, 2 h la siguiente
    manualShift("2026-10-19", "10:00", "14:00"), // semana anterior
  ];

  it("suma solo lo que cae en la semana, partiendo turnos que cruzan el domingo", () => {
    expect(weekMinutes(shifts, "2026-10-26")).toBe(4 * 60 + 3 * 60 + 45 + 2 * 60);
    expect(weekMinutes(shifts, "2026-11-02")).toBe(2 * 60);
  });

  it("un turno fichado y sin salida cuenta hasta ahora", () => {
    const open = [{ startAt: madridToUtc("2026-10-29", "09:00"), endAt: null }];
    expect(weekMinutes(open, "2026-10-26", madridToUtc("2026-10-29", "10:30"))).toBe(90);
  });

  it("turno de noche: la salida antes de la entrada es al día siguiente", () => {
    const s = manualShift("2026-11-01", "22:00", "02:00");
    expect(s.endAt.getTime() - s.startAt.getTime()).toBe(4 * 3_600_000);
  });

  it("formato legible", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(605)).toBe("10 h 05 min");
  });
});

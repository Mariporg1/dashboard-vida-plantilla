import { describe, expect, it } from "vitest";
import { addDays, daysFromToday, formatDue, madridDateKey, madridTime, madridToUtc } from "./dates";

describe("madridToUtc", () => {
  it("invierno: Madrid es UTC+1", () => {
    expect(madridToUtc("2026-01-15", "10:00").toISOString()).toBe("2026-01-15T09:00:00.000Z");
  });

  it("verano: Madrid es UTC+2", () => {
    expect(madridToUtc("2026-07-15", "10:00").toISOString()).toBe("2026-07-15T08:00:00.000Z");
  });

  it("medianoche local cae el día anterior en UTC", () => {
    expect(madridToUtc("2026-07-15").toISOString()).toBe("2026-07-14T22:00:00.000Z");
  });

  it("cambio de hora de octubre (25/10/2026): antes y después", () => {
    expect(madridToUtc("2026-10-25", "01:00").toISOString()).toBe("2026-10-24T23:00:00.000Z");
    expect(madridToUtc("2026-10-25", "04:00").toISOString()).toBe("2026-10-25T03:00:00.000Z");
  });

  it("cambio de hora de marzo (29/03/2026)", () => {
    expect(madridToUtc("2026-03-29", "01:00").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(madridToUtc("2026-03-29", "04:00").toISOString()).toBe("2026-03-29T02:00:00.000Z");
  });

  it("ida y vuelta conserva fecha y hora", () => {
    for (const [d, t] of [["2026-02-28", "23:59"], ["2026-08-31", "00:30"], ["2026-12-31", "23:00"]]) {
      const utc = madridToUtc(d, t);
      expect(madridDateKey(utc)).toBe(d);
      expect(madridTime(utc)).toBe(t);
    }
  });
});

describe("madridDateKey", () => {
  it("un instante de las 23:30 UTC ya es el día siguiente en Madrid", () => {
    expect(madridDateKey(new Date("2026-07-15T23:30:00Z"))).toBe("2026-07-16");
    expect(madridDateKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });
});

describe("addDays", () => {
  it("cruza meses, años y bisiestos", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-10-24", 7)).toBe("2026-10-31");
  });
});

describe("daysFromToday y formatDue", () => {
  const now = new Date("2026-10-23T22:30:00Z"); // 24/10 a las 00:30 en Madrid

  it("cuenta días naturales en Madrid, no en UTC", () => {
    expect(daysFromToday(madridToUtc("2026-10-24", "18:00"), now)).toBe(0);
    expect(daysFromToday(madridToUtc("2026-10-25"), now)).toBe(1);
    expect(daysFromToday(madridToUtc("2026-10-23", "20:00"), now)).toBe(-1);
  });

  it("formatea en español", () => {
    expect(formatDue(madridToUtc("2026-10-24", "18:00"), false, now)).toBe("Hoy, 18:00");
    expect(formatDue(madridToUtc("2026-10-25"), true, now)).toBe("Mañana");
    expect(formatDue(madridToUtc("2026-10-27", "09:30"), false, now)).toMatch(/^mar, 27 oct, 09:30$/);
  });
});

import { describe, expect, it } from "vitest";
import { makeCalendar } from "./academic-calendar";
import { countdowns, greeting, isoWeekday, nextHoliday, quoteOfTheDay } from "./hoy-extras";

const cal = makeCalendar([
  { from: "2026-11-02", to: "2026-11-02", label: "Puente de noviembre" },
  { from: "2026-12-23", to: "2027-01-07", label: "Vacaciones de Navidad" },
]);

describe("extras de Hoy", () => {
  it("saluda según la hora", () => {
    expect(greeting(8).text).toBe("Buenos días");
    expect(greeting(16).text).toBe("Buenas tardes");
    expect(greeting(23).text).toBe("Buenas noches");
    expect(greeting(2).text).toBe("Buenas noches");
  });

  it("calcula el día de la semana", () => {
    expect(isoWeekday("2026-10-23")).toBe(5); // viernes
    expect(isoWeekday("2026-10-25")).toBe(7); // domingo
    expect(isoWeekday("2026-10-26")).toBe(1); // lunes
  });

  it("da la misma frase todo el día y cambia al siguiente", () => {
    expect(quoteOfTheDay("2026-10-23")).toBe(quoteOfTheDay("2026-10-23"));
    expect(quoteOfTheDay("2026-10-23")).not.toBe(quoteOfTheDay("2026-10-24"));
  });

  it("encuentra el próximo día sin clase", () => {
    expect(nextHoliday("2026-10-23", cal)).toEqual({ date: "2026-11-02", label: "Puente de noviembre" });
    expect(nextHoliday("2026-10-23")).toBeNull();
  });

  it("ordena las cuentas atrás", () => {
    const c = countdowns("2026-10-23", cal);
    expect(c.map((x) => x.days)).toEqual([1, 10, 63]);
    expect(c[0].label).toBe("Fin de semana");
    expect(countdowns("2026-10-24")[0]).toMatchObject({ label: "Fin de semana", days: 0 });
  });
});

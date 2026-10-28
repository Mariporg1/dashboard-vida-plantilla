import { describe, expect, it } from "vitest";
import { normalizeCalendarUrl } from "./calendar-url";

describe("enlaces de calendario", () => {
  it("acepta https y convierte webcal", () => {
    expect(normalizeCalendarUrl(" https://ejemplo.test/cal.ics ")).toBe("https://ejemplo.test/cal.ics");
    expect(normalizeCalendarUrl("webcal://ejemplo.test/cal.ics")).toBe("https://ejemplo.test/cal.ics");
    expect(normalizeCalendarUrl('"https://ejemplo.test/a?b=1"')).toBe("https://ejemplo.test/a?b=1");
  });

  it("rechaza lo que no es un enlace", () => {
    expect(normalizeCalendarUrl("")).toBeNull();
    expect(normalizeCalendarUrl("hola")).toBeNull();
    expect(normalizeCalendarUrl("javascript:alert(1)")).toBeNull();
  });
});

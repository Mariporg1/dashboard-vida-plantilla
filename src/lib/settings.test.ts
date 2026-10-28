import { describe, expect, it } from "vitest";
import { activeSources, toSettings } from "./settings";

describe("ajustes", () => {
  it("sin fila: todo activado y con bienvenida pendiente", () => {
    const s = toSettings();
    expect(s.welcomed).toBe(false);
    expect(s.name).toBe("");
    expect(s.on("moodle")).toBe(true);
    expect(activeSources(s)).toEqual(["moodle", "outlook"]);
  });

  it("pestañas ocultas e ignora valores desconocidos", () => {
    const s = toSettings({ name: "Lucía", hiddenTabs: ["trabajo", "outlook", "nada"], welcomedAt: new Date() });
    expect(s.hidden).toEqual(["trabajo", "outlook"]);
    expect(s.on("trabajo")).toBe(false);
    expect(s.on("tareas")).toBe(true);
    expect(activeSources(s)).toEqual(["moodle"]);
  });

  it("los enlaces guardados en Ajustes mandan sobre las variables de entorno", () => {
    process.env.OUTLOOK_ICS_URL = "https://ejemplo.test/env.ics";
    expect(toSettings().outlookIcsUrl).toBe("https://ejemplo.test/env.ics");
    const s = toSettings({ name: "", hiddenTabs: [], welcomedAt: null, outlookIcsUrl: " https://ejemplo.test/ajustes.ics " });
    expect(s.outlookIcsUrl).toBe("https://ejemplo.test/ajustes.ics");
    delete process.env.OUTLOOK_ICS_URL;
  });
});

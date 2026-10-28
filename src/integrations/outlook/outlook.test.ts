import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseOutlookIcs } from "./ical";
import { madridDateKey, madridTime } from "@/lib/dates";

const ics = readFileSync(path.join(__dirname, "../__fixtures__/outlook.ics"), "utf8");
const items = parseOutlookIcs(ics, new Date("2026-10-22T00:00:00Z"), new Date("2026-11-20T00:00:00Z"));
const local = (d: Date | null) => `${madridDateKey(d!)} ${madridTime(d!)}`;

describe("parseOutlookIcs", () => {
  it("respeta la zona horaria de Windows (Romance Standard Time) a ambos lados del cambio de hora", () => {
    const tut = items.find((i) => i.title.startsWith("Tutoría"))!;
    // 27/10 ya es horario de invierno: 11:30 en Madrid son 10:30 UTC.
    expect(tut.startsAt!.toISOString()).toBe("2026-10-27T10:30:00.000Z");
    expect(tut.course).toBe("Despacho 2.14");
    expect(tut.url).toBe("https://outlook.office.com/calendar/view/day/2026/10/27");
  });

  it("expande las repeticiones, quita las excluidas y aplica los cambios puntuales", () => {
    const labs = items.filter((i) => i.title.startsWith("Laboratorio")).map((i) => `${local(i.startsAt)} ${i.title} @${i.course}`);
    expect(labs).toEqual([
      "2026-10-26 10:00 Laboratorio de Física @Lab F1",
      // 02/11 está en EXDATE
      "2026-11-09 12:00 Laboratorio de Física (cambio de aula) @Lab F3",
      "2026-11-16 10:00 Laboratorio de Física @Lab F1",
    ]);
  });

  it("los ids de cada repetición son únicos y estables", () => {
    const ids = items.map((i) => i.externalId);
    expect(new Set(ids).size).toBe(ids.length);
    const again = parseOutlookIcs(ics, new Date("2026-10-22T00:00:00Z"), new Date("2026-11-20T00:00:00Z")).map((i) => i.externalId);
    expect(again).toEqual(ids);
    // El cambio puntual conserva el id de su fecha original.
    expect(ids).toContain("040000008200E00074C5B7101A82E00800000000BBBB:2026-11-09T09:00:00.000Z");
  });

  it("día completo en Madrid y sin eventos cancelados", () => {
    const puente = items.find((i) => i.title.startsWith("Puente"))!;
    expect(puente.allDay).toBe(true);
    expect(local(puente.startsAt)).toBe("2026-11-02 00:00");
    expect(items.some((i) => i.title.includes("cancelada"))).toBe(false);
  });
});

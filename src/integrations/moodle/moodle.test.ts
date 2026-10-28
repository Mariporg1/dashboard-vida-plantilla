import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseMoodleIcs } from "./ical";
import { MoodleClient, fetchMoodleApi } from "./api";
import { IntegrationError } from "../types";
import { madridDateKey } from "@/lib/dates";

const BASE = "https://moodle.ejemplo.edu";
const ics = readFileSync(path.join(__dirname, "../__fixtures__/moodle.ics"), "utf8");
const from = new Date("2026-10-16T00:00:00Z");
const to = new Date("2027-01-21T00:00:00Z");

describe("parseMoodleIcs", () => {
  const items = parseMoodleIcs(ics, BASE, from, to);

  it("importa los eventos de la ventana y descarta los antiguos", () => {
    expect(items.map((i) => i.externalId).sort()).toEqual(["event:123456", "event:123457", "event:123458"]);
  });

  it("extrae asignatura, fecha UTC y enlace", () => {
    const p2 = items.find((i) => i.externalId === "event:123456")!;
    expect(p2).toMatchObject({
      title: "Práctica 2: Procesos e hilos debe entregarse",
      course: "SO-GII",
      kind: "entrega",
      allDay: false,
    });
    expect(p2.startsAt!.toISOString()).toBe("2026-10-28T22:59:00.000Z");
    expect(p2.url).toBe(`${BASE}/calendar/view.php?view=day&time=1793228340`);
  });

  it("los eventos de día completo conservan su día en Madrid", () => {
    const day = items.find((i) => i.externalId === "event:123458")!;
    expect(day.allDay).toBe(true);
    expect(madridDateKey(day.startsAt!)).toBe("2026-10-30");
    expect(day.startsAt!.toISOString()).toBe("2026-10-29T23:00:00.000Z");
  });
});

function fakeFetch(responses: Record<string, unknown>): typeof fetch {
  return (async (_url: string, init: RequestInit) => {
    const fn = new URLSearchParams(init.body as URLSearchParams).get("wsfunction")!;
    const body = typeof responses[fn] === "function" ? (responses[fn] as (p: URLSearchParams) => unknown)(init.body as URLSearchParams) : responses[fn];
    return new Response(JSON.stringify(body ?? {}), { status: 200 });
  }) as typeof fetch;
}

describe("fetchMoodleApi", () => {
  it("combina eventos pendientes y tareas ya entregadas", async () => {
    const client = new MoodleClient(
      BASE,
      "tok",
      fakeFetch({
        core_calendar_get_action_events_by_timesort: {
          events: [
            {
              id: 1, name: "P2 debe entregarse", activityname: "Práctica 2", timesort: 1793228340,
              url: `${BASE}/mod/assign/view.php?id=55`, modulename: "assign", instance: 10,
              course: { fullname: "Sistemas Operativos", shortname: "SO" },
            },
          ],
        },
        mod_assign_get_assignments: {
          courses: [
            {
              id: 1, fullname: "Sistemas Operativos", shortname: "SO",
              assignments: [
                { id: 10, cmid: 55, name: "Práctica 2", duedate: 1793228340 },
                { id: 11, cmid: 56, name: "Práctica 1", duedate: 1792619940 },
                { id: 12, cmid: 57, name: "Muy antigua", duedate: 1700000000 },
              ],
            },
          ],
        },
        mod_assign_get_submission_status: { lastattempt: { submission: { status: "submitted" } } },
      }),
    );
    const items = await fetchMoodleApi(client, BASE, from, to);
    expect(items.map((i) => [i.externalId, i.title, i.status])).toEqual([
      ["event:1", "Práctica 2", "pendiente"],
      ["assign:11", "Práctica 1", "entregada"],
    ]);
    expect(items[1].url).toBe(`${BASE}/mod/assign/view.php?id=56`);
  });

  it("no duplica una tarea aunque Moodle no mande instance o mande dos eventos", async () => {
    const ev = (id: number) => ({
      id, name: "Informe debe entregarse", activityname: "ARPA - Informe 5", timesort: 1793228340,
      url: `${BASE}/mod/assign/view.php?id=77`, modulename: "assign",
      course: { fullname: "Arquitecturas Paralelas", shortname: "ARPA" },
    });
    const client = new MoodleClient(
      BASE,
      "tok",
      fakeFetch({
        core_calendar_get_action_events_by_timesort: { events: [ev(1), ev(2)] },
        mod_assign_get_assignments: {
          courses: [
            { id: 1, fullname: "Arquitecturas Paralelas", shortname: "ARPA", assignments: [{ id: 20, cmid: 77, name: "ARPA - Informe 5", duedate: 1793228340 }] },
          ],
        },
        mod_assign_get_submission_status: { lastattempt: { submission: { status: "new" } } },
      }),
    );
    const items = await fetchMoodleApi(client, BASE, from, to);
    expect(items.map((i) => i.externalId)).toEqual(["event:1"]);
  });

  it("traduce un token inválido a un mensaje claro", async () => {
    const client = new MoodleClient(
      BASE,
      "malo",
      fakeFetch({ core_calendar_get_action_events_by_timesort: { exception: "x", errorcode: "invalidtoken", message: "Invalid token" } }),
    );
    await expect(fetchMoodleApi(client, BASE, from, to)).rejects.toThrow(IntegrationError);
    await expect(fetchMoodleApi(client, BASE, from, to)).rejects.toThrow(/token de Moodle/);
  });
});

describe("extractToken", () => {
  const tok = "0123456789abcdef0123456789abcdef";
  it("lee el token del enlace de la app móvil", async () => {
    const { extractToken } = await import("./token");
    expect(extractToken(`moodlemobile://token=${btoa(`firma:::${tok}`)}`)).toBe(tok);
    expect(extractToken(`moodlemobile://token=${btoa(`firma:::${tok}:::privado`)}`)).toBe(tok);
    expect(extractToken("moodlemobile://token=basura")).toBeNull();
    expect(extractToken("hola")).toBeNull();
  });
});

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Integration, FetchedItem } from "@/integrations/types";
import { IntegrationError } from "@/integrations/types";

// Necesita un Postgres de pruebas: TEST_DATABASE_URL=postgres://... npm test
// Sin esa variable, estos tests se saltan (el resto sigue ejecutándose).
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("runSync (con base de datos)", () => {
  let mod: typeof import("./run");
  let dbmod: typeof import("@/db");
  let schema: typeof import("@/db/schema");

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    dbmod = await import("@/db");
    schema = await import("@/db/schema");
    mod = await import("./run");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(dbmod.db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    await dbmod.db.delete(schema.externalItems);
    await dbmod.db.delete(schema.integrationStatus);
  });

  const item = (id: string, title = id): FetchedItem => ({
    externalId: id, kind: "entrega", title, course: "SO", url: null,
    startsAt: new Date("2026-10-28T22:59:00Z"), endsAt: null, allDay: false, status: "pendiente",
  });

  function fake(source: "moodle" | "outlook", result: () => FetchedItem[]): Integration {
    return { source, label: source, isConfigured: async () => true, fetch: async () => ({ items: result(), mode: "ical" }) };
  }

  const rows = () => dbmod.db.select().from(schema.externalItems).orderBy(schema.externalItems.externalId);

  it("resincronizar no duplica y actualiza los cambios", async () => {
    let data = [item("event:1"), item("event:2")];
    const integ = fake("moodle", () => data);
    await mod.runSync([integ], new Date("2026-10-23T10:00:00Z"));
    data = [item("event:1", "Título cambiado"), item("event:2")];
    await mod.runSync([integ], new Date("2026-10-24T10:00:00Z"));
    const r = await rows();
    expect(r).toHaveLength(2);
    expect(r[0].title).toBe("Título cambiado");
  });

  it("borra lo que ya no viene y conserva lo marcado como hecho", async () => {
    let data = [item("event:1"), item("event:2")];
    const integ = fake("moodle", () => data);
    await mod.runSync([integ], new Date("2026-10-23T10:00:00Z"));
    const { eq } = await import("drizzle-orm");
    await dbmod.db.update(schema.externalItems).set({ dismissedAt: new Date() }).where(eq(schema.externalItems.externalId, "event:1"));
    data = [item("event:1")];
    await mod.runSync([integ], new Date("2026-10-24T10:00:00Z"));
    const r = await rows();
    expect(r.map((x) => x.externalId)).toEqual(["event:1"]);
    expect(r[0].dismissedAt).not.toBeNull();
  });

  it("si una integración falla, la otra sigue y los datos previos se mantienen", async () => {
    await mod.runSync([fake("moodle", () => [item("event:1")])], new Date("2026-10-23T10:00:00Z"));
    const failing: Integration = {
      source: "moodle", label: "Moodle", isConfigured: async () => true,
      fetch: async () => { throw new IntegrationError("Moodle no responde"); },
    };
    const res = await mod.runSync([failing, fake("outlook", () => [item("evt:a")])], new Date("2026-10-24T10:00:00Z"));
    expect(res.map((x) => x.ok)).toEqual([false, true]);
    expect((await rows()).map((x) => `${x.source}/${x.externalId}`)).toEqual(["moodle/event:1", "outlook/evt:a"]);
    const status = await dbmod.db.select().from(schema.integrationStatus);
    const m = status.find((s) => s.source === "moodle")!;
    expect(m.lastError).toBe("Moodle no responde");
    expect(m.lastSuccessAt?.toISOString()).toBe("2026-10-23T10:00:00.000Z");
  });
});

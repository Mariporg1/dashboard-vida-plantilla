import { max } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { integrationStatus } from "@/db/schema";
import { INTEGRATIONS, runSync } from "@/sync/run";
import { activeSources, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MIN_GAP_MINUTES = 15;

// Vercel Cron llama aquí cada día (ver vercel.json).
// Con CRON_SECRET configurado, Vercel manda "Authorization: Bearer $CRON_SECRET" y solo se acepta eso.
// Sin él, cualquiera puede pedir una sincronización, pero como mucho una cada 15 minutos y sin ver
// ningún dato: solo responde si ha ido bien.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!secret) {
    const [{ last }] = await db.select({ last: max(integrationStatus.lastAttemptAt) }).from(integrationStatus);
    if (last && Date.now() - last.getTime() < MIN_GAP_MINUTES * 60_000) {
      return NextResponse.json({ ok: true, skipped: "sincronizado hace poco" });
    }
  }
  const on = activeSources(await getSettings());
  const results = await runSync(INTEGRATIONS.filter((i) => on.includes(i.source)));
  const ok = results.every((r) => r.ok || r.skipped);
  return NextResponse.json(secret ? { ok, results } : { ok });
}

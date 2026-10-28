import { and, eq, gte, count } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

export const MAX_FAILURES = 5;
export const WINDOW_MINUTES = 15;

export async function isLoginBlocked(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.ok, false), gte(loginAttempts.createdAt, since)));
  return row.n >= MAX_FAILURES;
}

export async function recordLoginAttempt(ip: string, ok: boolean) {
  await db.insert(loginAttempts).values({ ip, ok });
}

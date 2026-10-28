import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { MIN_PASSWORD, hashPassword } from "@/lib/password";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { passwordHash } from "@/lib/settings";

// Primera visita: crea la contraseña. Solo funciona mientras no haya ninguna.
export async function POST(req: NextRequest) {
  if (await passwordHash()) {
    return NextResponse.json({ error: "La contraseña ya está creada. Inicia sesión." }, { status: 409 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || password.length < MIN_PASSWORD) {
    return NextResponse.json({ error: `La contraseña necesita al menos ${MIN_PASSWORD} caracteres.` }, { status: 400 });
  }

  const hash = await hashPassword(password);
  // Si dos personas lo intentan a la vez, solo gana la primera.
  const saved = await db
    .insert(settings)
    .values({ id: 1, passwordHash: hash })
    .onConflictDoUpdate({ target: settings.id, set: { passwordHash: hash, updatedAt: new Date() }, setWhere: sql`${settings.passwordHash} is null` })
    .returning({ id: settings.id });
  if (saved.length === 0) {
    return NextResponse.json({ error: "La contraseña ya está creada. Inicia sesión." }, { status: 409 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return res;
}

import { NextResponse, type NextRequest } from "next/server";
import { verifyPassword } from "@/lib/password";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/rate-limit";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { passwordHash } from "@/lib/settings";

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "desconocida";
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (await isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Espera 15 minutos." },
      { status: 429 },
    );
  }

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const stored = await passwordHash();
  const ok = !!password && !!stored && (await verifyPassword(password, stored));
  await recordLoginAttempt(ip, ok);

  if (!ok) return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return res;
}

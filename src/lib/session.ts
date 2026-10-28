import { SignJWT, jwtVerify } from "jose";

// Este módulo se usa también en el middleware (runtime edge): solo APIs web, nada de node:*.
export const SESSION_COOKIE = "sesion";
export const SESSION_DAYS = 30;

const enc = (s: string) => new TextEncoder().encode(s);

/**
 * Clave para firmar la cookie. Si existe AUTH_SECRET se usa; si no, se deriva de la conexión a la
 * base de datos, que ya es secreta y es la única variable obligatoria. Así no hay que inventar nada.
 */
async function secretKey(): Promise<Uint8Array> {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret && secret.length >= 32) return enc(secret);
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) throw new Error("Falta DATABASE_URL (o AUTH_SECRET) para firmar la sesión");
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc(`dashboard-sesion:${dbUrl}`)));
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ sub: "owner" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(await secretKey());
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, await secretKey(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

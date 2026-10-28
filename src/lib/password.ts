import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Formato "scrypt:<salt hex>:<hash hex>". Sin "$" para que Next no intente expandirlo como variable.
const KEYLEN = 64;
export const MIN_PASSWORD = 8;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Al copiar el hash a Vercel es fácil arrastrar espacios, saltos de línea o comillas.
export function normalizeStoredHash(stored: string): string {
  return stored.trim().replace(/^["']|["']$/g, "").trim();
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = normalizeStoredHash(stored).split(":");
  if (algo !== "scrypt" || !/^[0-9a-f]{32}$/i.test(saltHex ?? "") || !/^[0-9a-f]{128}$/i.test(hashHex ?? "")) {
    console.error("AUTH_PASSWORD_HASH no tiene el formato scrypt:<salt>:<hash>. Genéralo de nuevo.");
    return false;
  }
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

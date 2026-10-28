import { describe, expect, it, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, isValidSessionToken } from "./session";

describe("contraseña", () => {
  it("acepta la correcta y rechaza la incorrecta", async () => {
    const hash = await hashPassword("una-contraseña-larga");
    expect(hash).not.toContain("$");
    expect(await verifyPassword("una-contraseña-larga", hash)).toBe(true);
    expect(await verifyPassword("otra", hash)).toBe(false);
  });

  it("tolera espacios y comillas alrededor del hash", async () => {
    const hash = await hashPassword("una-contraseña-larga");
    expect(await verifyPassword("una-contraseña-larga", ` "${hash}"\n`)).toBe(true);
    expect(await verifyPassword("una-contraseña-larga", `'${hash}'`)).toBe(true);
  });

  it("rechaza hashes mal formados", async () => {
    expect(await verifyPassword("x", "basura")).toBe(false);
  });
});

describe("sesión", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "a".repeat(40);
  });

  it("valida un token propio", async () => {
    expect(await isValidSessionToken(await createSessionToken())).toBe(true);
  });

  it("rechaza tokens ausentes, manipulados o firmados con otro secreto", async () => {
    const token = await createSessionToken();
    expect(await isValidSessionToken(undefined)).toBe(false);
    expect(await isValidSessionToken(token.slice(0, -2) + "xx")).toBe(false);
    process.env.AUTH_SECRET = "b".repeat(40);
    expect(await isValidSessionToken(token)).toBe(false);
  });

  it("sin AUTH_SECRET firma con una clave derivada de la base de datos", async () => {
    delete process.env.AUTH_SECRET;
    process.env.DATABASE_URL = "postgres://usuario:clave@localhost/uno";
    const token = await createSessionToken();
    expect(await isValidSessionToken(token)).toBe(true);
    process.env.DATABASE_URL = "postgres://usuario:otra@localhost/uno";
    expect(await isValidSessionToken(token)).toBe(false);
    delete process.env.DATABASE_URL;
  });
});

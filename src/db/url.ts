// La integración de Neon en Vercel crea DATABASE_URL; otras versiones la llaman POSTGRES_URL.
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

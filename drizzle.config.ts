import { defineConfig } from "drizzle-kit";

// drizzle-kit no lee .env.local por sí solo.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Para las migraciones mejor la conexión directa (sin pooler) si la integración de Neon la da.
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.POSTGRES_URL)! },
});

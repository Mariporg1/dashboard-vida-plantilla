import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

// Reutiliza la conexión entre recargas en desarrollo y entre invocaciones en serverless.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

const sql =
  globalForDb.sql ??
  // prepare: false es necesario con el pooler de Neon (PgBouncer en modo transacción).
  postgres(databaseUrl()!, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });

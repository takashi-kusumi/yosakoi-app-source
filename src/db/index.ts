import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __yosakoiPgPool: Pool | undefined;
}

function shouldUseSsl() {
  const url = process.env.DATABASE_URL || "";
  if (process.env.PGSSL === "disable") return false;
  if (process.env.PGSSL === "require") return true;
  // Most managed Postgres providers (Neon / Supabase / Vercel Postgres)
  // require SSL and encode it in the connection string.
  return /sslmode=require|supabase\.co|neon\.tech|vercel-storage\.com/.test(
    url
  );
}

const pool =
  global.__yosakoiPgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  global.__yosakoiPgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Db = typeof db;

import pg from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let initialized = false;

export function getDatabase(): pg.Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DB_SSL === "false" ? false : undefined
    });
  }
  return pool;
}

export async function initDatabase(): Promise<boolean> {
  const db = getDatabase();
  if (!db) return false;
  if (initialized) return true;

  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  await db.query(schema);
  await db.query("SELECT 1");
  initialized = true;
  return true;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initialized = false;
  }
}

export async function dbHealth(): Promise<{ configured: boolean; ok: boolean }> {
  const db = getDatabase();
  if (!db) return { configured: false, ok: false };
  try {
    await db.query("SELECT 1");
    return { configured: true, ok: true };
  } catch {
    return { configured: true, ok: false };
  }
}

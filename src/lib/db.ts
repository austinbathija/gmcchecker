import { neon } from "@neondatabase/serverless";
import type { ScanResult } from "./scanner";

let cachedSql: ReturnType<typeof neon> | null = null;

function getClient() {
  if (cachedSql) return cachedSql;
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_UNPOOLED;
  if (!url) throw new Error("No Postgres connection string found in env vars");
  cachedSql = neon(url);
  return cachedSql;
}

let initPromise: Promise<void> | null = null;

async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = getClient();
      await sql`
        CREATE TABLE IF NOT EXISTS scans (
          id SERIAL PRIMARY KEY,
          domain TEXT NOT NULL,
          score INTEGER NOT NULL,
          passed INTEGER NOT NULL,
          failed INTEGER NOT NULL,
          warnings INTEGER NOT NULL,
          checks JSONB NOT NULL,
          scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
    })();
  }
  return initPromise;
}

export async function logScan(result: ScanResult) {
  await initDb();
  const sql = getClient();
  await sql`
    INSERT INTO scans (domain, score, passed, failed, warnings, checks, scanned_at)
    VALUES (
      ${result.url},
      ${result.score},
      ${result.summary.passed},
      ${result.summary.failed},
      ${result.summary.warnings},
      ${JSON.stringify(result.checks)},
      ${result.scannedAt}
    )
  `;
}

export interface StoredScan {
  id: number;
  domain: string;
  score: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: { id: string; category: string; name: string; status: string; description: string; fix?: string }[];
  scanned_at: string;
}

export async function getAllScans(): Promise<StoredScan[]> {
  await initDb();
  const sql = getClient();
  const rows = await sql`SELECT * FROM scans ORDER BY scanned_at DESC`;
  return rows as StoredScan[];
}

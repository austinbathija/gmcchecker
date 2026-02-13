import { neon } from "@neondatabase/serverless";
import type { ScanResult } from "./scanner";

function getClient() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL env var is required");
  return neon(url);
}

let initialized = false;

async function initDb() {
  if (initialized) return;
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
  initialized = true;
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

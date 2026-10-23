import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://negotiateai:negotiateai@localhost:5432/negotiateai',
  max: 10,
});

/** Creates tables if missing. Retries so the API can start before Postgres is ready. */
export async function initDb(retries = 20, delayMs = 3000): Promise<void> {
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'db/init.sql'), 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(sql);
      console.log('Database ready');
      return;
    } catch (err) {
      if (attempt >= retries) throw err;
      console.warn(`Database not ready (attempt ${attempt}/${retries}), retrying...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
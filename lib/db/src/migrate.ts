import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

async function baseline(): Promise<void> {
  // Skip baseline entirely on fresh installs — drizzle migrate() handles everything.
  const { rows: usersExists } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `);
  if (!usersExists[0]?.exists) return;

  // Ensure the migrations table exists (safe on re-runs).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // Sentinels: SQL that returns rows only when a migration's effects are already in the DB.
  // Migrations whose sentinel returns no rows are skipped so drizzle runs them normally.
  const SENTINELS: Record<string, string> = {
    "0000_cute_nick_fury":   "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'",
    "0001_ancient_hercules": "SELECT 1 FROM information_schema.tables WHERE table_name = 'topics' AND table_schema = 'public'",
    "0002_busy_barracuda":   "SELECT 1 FROM information_schema.tables WHERE table_name = 'agenda_item_comments' AND table_schema = 'public'",
    "0003_plan_staff":       "SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_staff' AND table_schema = 'public'",
  };

  const { createHash } = await import("crypto");
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  let journal: { entries: { tag: string; when: number }[] } = { entries: [] };
  try {
    journal = JSON.parse(await readFile(journalPath, "utf-8"));
  } catch {
    return;
  }

  for (const entry of journal.entries) {
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    let sql: string;
    try {
      sql = await readFile(sqlPath, "utf-8");
    } catch {
      continue;
    }
    const hash = createHash("sha256").update(sql).digest("hex");

    // Skip if this exact hash is already recorded (idempotent re-runs).
    const { rows: hashExists } = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM "__drizzle_migrations" WHERE hash = $1) AS exists`,
      [hash],
    );
    if (hashExists[0]?.exists) {
      console.log(`Baseline: ${entry.tag} already recorded.`);
      continue;
    }

    // Only mark as applied when the migration's effects are confirmed in the DB.
    const sentinel = SENTINELS[entry.tag];
    if (sentinel) {
      const { rows } = await pool.query(sentinel);
      if (rows.length === 0) {
        console.log(`Baseline: skipping ${entry.tag} — not yet applied, will migrate normally.`);
        continue;
      }
    }

    await pool.query(
      `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
      [hash, entry.when],
    );
    console.log(`Baseline: marked ${entry.tag} as applied.`);
  }

  console.log("Baseline complete.");
}

async function runMigrate(): Promise<void> {
  await baseline();
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
  await pool.end();
}

runMigrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

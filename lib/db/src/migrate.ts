import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

async function baseline(): Promise<void> {
  // If users table already exists but __drizzle_migrations does not, we're transitioning
  // from push-force. Insert all current migration hashes as "already applied" so drizzle
  // won't try to re-create tables that already exist.
  const { rows: migrationsTableExists } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
    ) AS exists
  `);
  if (migrationsTableExists[0]?.exists) return;

  const { rows: usersExists } = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'users'
    ) AS exists
  `);
  if (!usersExists[0]?.exists) return;

  console.log("Baseline: existing schema detected — marking all migrations as applied.");

  await pool.query(`
    CREATE TABLE "__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  // Read migration tags from journal and compute SQL content hash (sha256) for each.
  // Only baseline a migration if its sentinel table/column already exists in the DB —
  // this ensures new migrations (whose effects are not yet in the DB) run normally.
  const SENTINELS: Record<string, string> = {
    "0000_cute_nick_fury":    "SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public'",
    "0001_ancient_hercules":  "SELECT 1 FROM information_schema.tables WHERE table_name = 'topics' AND table_schema = 'public'",
    "0002_busy_barracuda":    "SELECT 1 FROM information_schema.tables WHERE table_name = 'agenda_item_comments' AND table_schema = 'public'",
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
    const sentinel = SENTINELS[entry.tag];
    if (sentinel) {
      const { rows } = await pool.query(sentinel);
      if (rows.length === 0) {
        console.log(`Baseline: skipping ${entry.tag} — table not yet in DB, will migrate.`);
        continue;
      }
    }
    const sqlPath = path.join(migrationsFolder, `${entry.tag}.sql`);
    try {
      const sql = await readFile(sqlPath, "utf-8");
      const hash = createHash("sha256").update(sql).digest("hex");
      await pool.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [hash, entry.when],
      );
      console.log(`Baseline: marked ${entry.tag} as applied.`);
    } catch {
      // skip missing SQL files
    }
  }
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

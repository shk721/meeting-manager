import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { pool } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile, readdir } from "fs/promises";

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

  // Each migration .sql file has a corresponding .json file containing the hash
  let files: string[] = [];
  try {
    files = await readdir(migrationsFolder);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    try {
      const meta = JSON.parse(
        await readFile(path.join(migrationsFolder, file), "utf-8"),
      ) as { hash?: string };
      if (meta.hash) {
        await pool.query(
          `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
          [meta.hash, Date.now()],
        );
      }
    } catch {
      // skip unreadable meta files
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

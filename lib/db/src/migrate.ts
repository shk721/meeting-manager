import { pool } from "./index.js";
import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.join(__dirname, "migrations");

// PostgreSQL error codes for "already exists" scenarios — safe to skip
const ALREADY_EXISTS_CODES = new Set(["42P07", "42701", "42710", "42P16"]);

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "_migrations" (
      id SERIAL PRIMARY KEY,
      tag text NOT NULL UNIQUE,
      applied_at timestamp with time zone DEFAULT now() NOT NULL
    )
  `);
}

async function isApplied(tag: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM "_migrations" WHERE tag = $1`,
    [tag],
  );
  return rows.length > 0;
}

async function runMigrationFile(tag: string): Promise<void> {
  const sqlPath = path.join(migrationsFolder, `${tag}.sql`);
  const content = await readFile(sqlPath, "utf-8");

  const statements = content
    .split("--> statement-breakpoint")
    .flatMap((chunk) =>
      chunk
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => (s.endsWith(";") ? s : s + ";")),
    );

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err: any) {
      const code: string | undefined = err?.code ?? err?.cause?.code;
      if (code && ALREADY_EXISTS_CODES.has(code)) {
        console.log(`  Skipped (already exists, code=${code}): ${stmt.substring(0, 80).trim()}`);
      } else {
        console.error(`  Failed statement: ${stmt.substring(0, 80).trim()}`);
        throw err;
      }
    }
  }

  await pool.query(`INSERT INTO "_migrations" (tag) VALUES ($1)`, [tag]);
  console.log(`Applied: ${tag}`);
}

async function runMigrate(): Promise<void> {
  await ensureMigrationsTable();

  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(await readFile(journalPath, "utf-8")) as {
    entries: { tag: string }[];
  };

  for (const entry of journal.entries) {
    if (await isApplied(entry.tag)) {
      console.log(`Already applied: ${entry.tag}`);
      continue;
    }
    console.log(`Applying: ${entry.tag}`);
    await runMigrationFile(entry.tag);
  }

  console.log("Migrations complete.");
  await pool.end();
}

runMigrate().catch((err) => {
  console.error(err);
  process.exit(1);
});

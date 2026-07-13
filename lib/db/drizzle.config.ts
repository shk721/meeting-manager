import { defineConfig } from "drizzle-kit";
import path from "path";

// DATABASE_URL is required for push/migrate but NOT for generate (schema-only operation)
const url = process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder";

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
});

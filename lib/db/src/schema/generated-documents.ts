import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const generatedDocumentsTable = pgTable("generated_documents", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // "meeting" | "plan" | "governance"
  entityId: integer("entity_id").notNull(),
  format: text("format").notNull().default("pdf"), // "pdf" for now
  title: text("title").notNull(),
  status: text("status").notNull().default("generated"), // "generated" | "failed"
  fileUrl: text("file_url"), // local path on disk
  frozenData: jsonb("frozen_data"), // snapshot at generation time
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GeneratedDocument = typeof generatedDocumentsTable.$inferSelect;

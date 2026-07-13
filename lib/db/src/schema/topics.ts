import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

// Topics are recurring subjects that can appear across multiple meetings/agenda items
export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  ownerId: integer("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  organizationId: integer("organization_id"),
  // status: active | deferred | resolved | archived
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTopicSchema = createInsertSchema(topicsTable).omit({ id: true, createdAt: true });
export type Topic = typeof topicsTable.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

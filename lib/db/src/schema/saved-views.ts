import { pgTable, text, serial, timestamp, integer, index } from "drizzle-orm/pg-core";

export const savedViewsTable = pgTable("saved_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'meetings' | 'tasks'
  filters: text("filters").notNull().default("{}"), // JSON string
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("idx_saved_views_user_id").on(t.userId),
]);

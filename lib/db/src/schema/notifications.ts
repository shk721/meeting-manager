import { pgTable, text, serial, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: integer("related_id"),
  relatedType: text("related_type"),
  isRead: boolean("is_read").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
}, (t) => [
  index("idx_notifications_user_id").on(t.userId),
  index("idx_notifications_user_read").on(t.userId, t.isRead),
  index("idx_notifications_created_at").on(t.createdAt),
]);

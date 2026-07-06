import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const reportSubscriptionsTable = pgTable("report_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  frequency: text("frequency").notNull().default("weekly"),
  includeMetrics: boolean("include_metrics").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

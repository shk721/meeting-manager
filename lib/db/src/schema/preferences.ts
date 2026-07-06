import { pgTable, text, serial, timestamp, integer, boolean, index, unique } from "drizzle-orm/pg-core";

export const preferencesTable = pgTable("preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  notificationsEmail: boolean("notifications_email").notNull().default(true),
  notificationsPush: boolean("notifications_push").notNull().default(true),
  notificationsSms: boolean("notifications_sms").notNull().default(false),
  emailDigest: text("email_digest").notNull().default("daily"),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorMethod: text("two_factor_method"),
  twoFactorPendingCode: text("two_factor_pending_code"),
  showInDirectory: boolean("show_in_directory").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_preferences_user_id").on(t.userId),
  index("idx_preferences_user_id").on(t.userId),
]);

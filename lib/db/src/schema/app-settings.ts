import { pgTable, serial, timestamp, integer, boolean, text } from "drizzle-orm/pg-core";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  // Notifications
  notifUpcomingMeetings: boolean("notif_upcoming_meetings").notNull().default(true),
  notifDueTasks: boolean("notif_due_tasks").notNull().default(true),
  notifPendingDecisions: boolean("notif_pending_decisions").notNull().default(true),
  notifPlanUpdates: boolean("notif_plan_updates").notNull().default(true),
  notifWeeklyDigest: boolean("notif_weekly_digest").notNull().default(false),
  // Organization
  orgName: text("org_name"),
  timezone: text("timezone").notNull().default("Asia/Riyadh"),
  calendarSystem: text("calendar_system").notNull().default("gregorian"),
  language: text("language").notNull().default("ar"),
  minutesCycle: text("minutes_cycle").notNull().default("single"),
  // Appearance
  themeMode: text("theme_mode").notNull().default("light"),
  displayDensity: text("display_density").notNull().default("standard"),
  // Planning module
  planningAutoProgress: boolean("planning_auto_progress").notNull().default(true),
  planningMilestonesLayer: boolean("planning_milestones_layer").notNull().default(false),
  planningMandatoryImpact: boolean("planning_mandatory_impact").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type AppSettings = typeof appSettingsTable.$inferSelect;

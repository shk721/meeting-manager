import { pgTable, serial, integer, date, timestamp } from "drizzle-orm/pg-core";

export const meetingMetricsTable = pgTable("meeting_metrics", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  effectivenessScore: integer("effectiveness_score").notNull().default(0),
  actionItemsCreated: integer("action_items_created").notNull().default(0),
  decisionsMade: integer("decisions_made").notNull().default(0),
  participantsEngaged: integer("participants_engaged").notNull().default(0),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productivityMetricsTable = pgTable("productivity_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekOf: date("week_of", { mode: "string" }).notNull(),
  meetingsAttended: integer("meetings_attended").notNull().default(0),
  meetingsOrganized: integer("meetings_organized").notNull().default(0),
  actionItemsOwned: integer("action_items_owned").notNull().default(0),
  actionItemsCompleted: integer("action_items_completed").notNull().default(0),
  productivityScore: integer("productivity_score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

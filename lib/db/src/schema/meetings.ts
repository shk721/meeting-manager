import { pgTable, text, serial, timestamp, integer, date, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const meetingsTable = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull(),
  status: text("status").notNull().default("scheduled"),
  project: text("project"),
  team: text("team"),
  location: text("location"),
  objectives: text("objectives"),
  chairpersonId: integer("chairperson_id"),
  // @deprecated: replaced by agenda_items table; column retained for backward compatibility
  agendaItems: text("agenda_items").array().default([]),
  isRecurring: boolean("is_recurring").notNull().default(false),
  recurrencePattern: text("recurrence_pattern"),
  parentMeetingId: integer("parent_meeting_id"),
  invitationsSentAt: timestamp("invitations_sent_at", { withTimezone: true }),
  minutesSentAt: timestamp("minutes_sent_at", { withTimezone: true }),
  // Governance context link — enables quorum tracking and formal session recording
  governanceContextId: integer("governance_context_id"),
  // Plan linkage — one meeting can belong to one plan (nullable)
  planId: integer("plan_id"),
  // Multi-tenancy seed (nullable, not enforced)
  organizationId: integer("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_meetings_date").on(t.date),
  index("idx_meetings_status").on(t.status),
  index("idx_meetings_governance_context_id").on(t.governanceContextId),
]);

export const meetingAttendeesTable = pgTable("meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
}, (t) => [
  index("idx_meeting_attendees_meeting_id").on(t.meetingId),
  index("idx_meeting_attendees_user_id").on(t.userId),
]);

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;

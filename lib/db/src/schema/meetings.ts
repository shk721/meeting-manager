import { pgTable, text, serial, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

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
  committeeId: integer("committee_id"),
  recurringType: text("recurring_type").notNull().default("none"),
  agendaItems: text("agenda_items").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const meetingAttendeesTable = pgTable("meeting_attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: integer("user_id").notNull(),
  attendeeType: text("attendee_type").notNull().default("member"),
  forAgendaItem: text("for_agenda_item"),
  attended: boolean("attended").notNull().default(false),
});

export const insertMeetingSchema = createInsertSchema(meetingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetingsTable.$inferSelect;

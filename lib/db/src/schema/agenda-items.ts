import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { meetingsTable } from "./meetings";
import { topicsTable } from "./topics";

export const agendaItemsTable = pgTable("agenda_items", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().references(() => meetingsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  durationMin: integer("duration_min"),
  presenterId: integer("presenter_id"),
  // status: pending | discussed | deferred | cancelled
  status: text("status").notNull().default("pending"),
  // outcomeStatus tracks lifecycle: pending | discussed | decided | deferred | cancelled
  outcomeStatus: text("outcome_status").notNull().default("pending"),
  discussionNotes: text("discussion_notes"),
  topicId: integer("topic_id").references(() => topicsTable.id, { onDelete: "set null" }),
  deferredToMeetingId: integer("deferred_to_meeting_id").references(() => meetingsTable.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  notes: text("notes"),
  carryForward: boolean("carry_forward").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAgendaItemSchema = createInsertSchema(agendaItemsTable).omit({ id: true, createdAt: true });
export type AgendaItem = typeof agendaItemsTable.$inferSelect;
export type InsertAgendaItem = z.infer<typeof insertAgendaItemSchema>;

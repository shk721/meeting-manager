import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const minutesTable = pgTable("minutes", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull().unique(),
  executiveSummary: text("executive_summary"),
  discussionItems: text("discussion_items"),
  risks: text("risks"),
  previousFollowUp: text("previous_follow_up"),
  status: text("status").notNull().default("draft"),
  approvedById: integer("approved_by_id"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMinutesSchema = createInsertSchema(minutesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMinutes = z.infer<typeof insertMinutesSchema>;
export type Minutes = typeof minutesTable.$inferSelect;

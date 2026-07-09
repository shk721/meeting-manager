import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  agendaItem: text("agenda_item"),
  content: text("content").notNull(),
  notes: text("notes"),
  // Planning context
  planId: integer("plan_id"),
  impactType: text("impact_type"), // "scope_change"|"timeline_change"|"resource_change"|"priority_change"|"risk_acceptance"|"escalation"|"other"
  impactTarget: text("impact_target"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;

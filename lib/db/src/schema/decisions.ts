import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  // meetingId is now nullable — decisions can originate from meetings, governance contexts, plans, or be standalone
  meetingId: integer("meeting_id"),
  agendaItem: text("agenda_item"),
  // title: one-line summary (auto-filled from content on migration)
  title: text("title"),
  content: text("content").notNull(),
  notes: text("notes"),
  // status: draft | pending_review | approved | rejected | deferred | cancelled
  status: text("status").notNull().default("approved"),
  // Governance context source (alternative to meetingId)
  governanceContextId: integer("governance_context_id"),
  // Who approved and when
  approvedBy: integer("approved_by"),
  // Link to the specific agenda item that produced this decision
  agendaItemId: integer("agenda_item_id"),
  // Execution
  dueDate: text("due_date"),
  assignedTo: integer("assigned_to"),
  // Planning context
  planId: integer("plan_id"),
  // impactType: scope | resources | timeline | policy | delegation | cancellation | other
  impactType: text("impact_type"),
  impactTarget: text("impact_target"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;

import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { meetingsTable } from "./meetings";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const decisionsTable = pgTable("decisions", {
  id: serial("id").primaryKey(),
  // meetingId is nullable — decisions can originate from meetings, governance contexts, plans, or be standalone
  meetingId: integer("meeting_id").references(() => meetingsTable.id, { onDelete: "set null" }),
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
  dueDate: date("due_date", { mode: "string" }),
  assignedTo: integer("assigned_to"),
  // Planning context
  planId: integer("plan_id"),
  // impactType: scope | resources | timeline | policy | delegation | cancellation | other
  impactType: text("impact_type"),
  impactTarget: text("impact_target"),
  // decision_type: strategic | operational | procedural | financial | hr | other
  decisionType: text("decision_type"),
  // rationale: institutional explanation / justification for the decision
  rationale: text("rationale"),
  // Multi-tenancy seed (nullable, not enforced)
  organizationId: integer("organization_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDecisionSchema = createInsertSchema(decisionsTable).omit({ id: true, createdAt: true });
export type InsertDecision = z.infer<typeof insertDecisionSchema>;
export type Decision = typeof decisionsTable.$inferSelect;

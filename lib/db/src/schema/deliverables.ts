import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { plansTable } from "./plans";
import { agendaItemsTable } from "./agenda-items";

export const deliverablesTable = pgTable("deliverables", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  agendaItemId: integer("agenda_item_id").references(() => agendaItemsTable.id, { onDelete: "set null" }),
  phaseId: integer("phase_id"),
  workstreamId: integer("workstream_id"),
  title: text("title").notNull(),
  description: text("description"),
  acceptanceCriteria: text("acceptance_criteria"),
  // status: not_started | in_progress | under_review | accepted | rejected
  status: text("status").notNull().default("not_started"),
  ownerId: integer("owner_id"),
  reviewerId: integer("reviewer_id"),
  dueDate: date("due_date", { mode: "string" }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  progressPercent: integer("progress_percent").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeliverableSchema = createInsertSchema(deliverablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type Deliverable = typeof deliverablesTable.$inferSelect;
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;

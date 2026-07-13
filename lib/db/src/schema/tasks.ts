import { pgTable, text, serial, timestamp, integer, date, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { meetingsTable } from "./meetings";
import { plansTable } from "./plans";
import { agendaItemsTable } from "./agenda-items";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  completionPercent: integer("completion_percent").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }),
  agendaItem: text("agenda_item"),
  agendaItemId: integer("agenda_item_id").references(() => agendaItemsTable.id, { onDelete: "set null" }),
  meetingId: integer("meeting_id").references(() => meetingsTable.id, { onDelete: "set null" }),
  decisionId: integer("decision_id"),
  assigneeId: integer("assignee_id"),
  // DT context — set when task originates from / is linked to a DT component
  componentId: integer("component_id"),
  // Committee context — set when task originates from a committee decision/assignment
  committeeId: integer("committee_id"),
  // Planning context — set when task is linked to a plan/phase/workstream
  planId: integer("plan_id").references(() => plansTable.id, { onDelete: "set null" }),
  phaseId: integer("phase_id"),
  workstreamId: integer("workstream_id"),
  // Deliverable context — task can belong to a deliverable within a workstream
  deliverableId: integer("deliverable_id"),
  // Contribution weight (%) toward plan progress — default 1 (equal weight)
  progressWeight: integer("progress_weight").notNull().default(1),
  // Multi-tenancy seed (nullable, not enforced)
  organizationId: integer("organization_id"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("idx_tasks_meeting_id").on(t.meetingId),
  index("idx_tasks_plan_id").on(t.planId),
  index("idx_tasks_assignee_id").on(t.assigneeId),
  index("idx_tasks_status").on(t.status),
  index("idx_tasks_agenda_item_id").on(t.agendaItemId),
]);

export const taskCommentsTable = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  content: text("content").notNull(),
  authorId: integer("author_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskChangelogTable = pgTable("task_changelog", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedById: integer("changed_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;

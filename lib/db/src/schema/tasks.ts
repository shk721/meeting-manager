import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  completionPercent: integer("completion_percent").notNull().default(0),
  dueDate: date("due_date", { mode: "string" }),
  agendaItem: text("agenda_item"),
  meetingId: integer("meeting_id"),
  decisionId: integer("decision_id"),
  assigneeId: integer("assignee_id"),
  // DT context — set when task originates from / is linked to a DT component
  componentId: integer("component_id"),
  // Committee context — set when task originates from a committee decision/assignment
  committeeId: integer("committee_id"),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

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

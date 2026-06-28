import { pgTable, text, serial, timestamp, integer, date, jsonb } from "drizzle-orm/pg-core";

// ─── Projects ────────────────────────────────────────────────────────────────
export const dtProjectsTable = pgTable("dt_projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  deadline: date("deadline", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DtProject = typeof dtProjectsTable.$inferSelect;

// ─── Sub-plans ───────────────────────────────────────────────────────────────
export const dtSubplansTable = pgTable("dt_subplans", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("لم يبدأ"),
  progress: integer("progress").notNull().default(0),
  deadline: date("deadline", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DtSubplan = typeof dtSubplansTable.$inferSelect;

// ─── Resources ───────────────────────────────────────────────────────────────
export const dtResourcesTable = pgTable("dt_resources", {
  id: serial("id").primaryKey(),
  subplanId: integer("subplan_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  allocation: integer("allocation").notNull().default(100),
});

export type DtResource = typeof dtResourcesTable.$inferSelect;

// ─── Components (محركات التحول) ───────────────────────────────────────────────
export const dtComponentsTable = pgTable("dt_components", {
  id: serial("id").primaryKey(),
  subplanId: integer("subplan_id").notNull(),
  driver: text("driver").notNull(),
  title: text("title").notNull(),
  desc: text("desc").notNull().default(""),
  priority: text("priority").notNull().default("متوسطة"),
  refYear: integer("ref_year").notNull().default(2024),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DtComponent = typeof dtComponentsTable.$inferSelect;

// ─── DT Tasks ─────────────────────────────────────────────────────────────────
export const dtTasksTable = pgTable("dt_tasks", {
  id: serial("id").primaryKey(),
  componentId: integer("component_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("مفتوح"),
  assignee: text("assignee").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DtTask = typeof dtTasksTable.$inferSelect;

// ─── DT Task Updates (سجل التحديثات) ─────────────────────────────────────────
export const dtTaskUpdatesTable = pgTable("dt_task_updates", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  note: text("note").notNull(),
  auto: text("auto"),
  by: text("by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DtTaskUpdate = typeof dtTaskUpdatesTable.$inferSelect;

// ─── Snapshots ───────────────────────────────────────────────────────────────
export const dtSnapshotsTable = pgTable("dt_snapshots", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  label: text("label").notNull(),
  period: text("period").notNull().default("manual"),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DtSnapshot = typeof dtSnapshotsTable.$inferSelect;

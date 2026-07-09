import { pgTable, text, serial, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const plansTable = pgTable("plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("operational"), // "readiness" | "operational"
  status: text("status").notNull().default("draft"),   // "draft"|"active"|"in_progress"|"on_hold"|"overdue"|"completed"
  templateId: integer("template_id"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  notes: text("notes"),
  createdById: integer("created_by_id"),
  // Organizational context (nullable for backward compatibility)
  organizationId: integer("organization_id"),
  departmentId: integer("department_id"),
  ownerId: integer("owner_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const planPhasesTable = pgTable("plan_phases", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  status: text("status").notNull().default("pending"), // "pending"|"in_progress"|"completed"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planWorksstreamsTable = pgTable("plan_workstreams", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  // phaseId is nullable — null means the workstream spans the full plan (cross-phase)
  phaseId: integer("phase_id").references(() => planPhasesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull().default(0),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planTemplatesTable = pgTable("plan_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("operational"), // "readiness" | "operational"
  description: text("description"),
  phaseCount: integer("phase_count").notNull().default(0),
  usageCount: integer("usage_count").notNull().default(0),
  phasesJson: text("phases_json").notNull().default("[]"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlanSchema = createInsertSchema(plansTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlanPhaseSchema = createInsertSchema(planPhasesTable).omit({ id: true, createdAt: true });
export const insertPlanWorkstreamSchema = createInsertSchema(planWorksstreamsTable).omit({ id: true, createdAt: true });

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plansTable.$inferSelect;
export type PlanPhase = typeof planPhasesTable.$inferSelect;
export type PlanWorkstream = typeof planWorksstreamsTable.$inferSelect;
export type PlanTemplate = typeof planTemplatesTable.$inferSelect;

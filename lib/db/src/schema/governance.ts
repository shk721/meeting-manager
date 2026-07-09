import { pgTable, text, serial, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const governanceContextsTable = pgTable("governance_contexts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id"),
  departmentId: integer("department_id"),
  name: text("name").notNull(),
  // type: committee | board | team | working_group | task_force | joint
  type: text("type").notNull(),
  // scope: internal | external | joint
  scope: text("scope").notNull().default("internal"),
  // classification: general | confidential | restricted | top_secret
  classification: text("classification").notNull().default("general"),
  // status: active | suspended | dissolved
  status: text("status").notNull().default("active"),
  description: text("description"),
  mandate: text("mandate"),
  meetingFrequency: text("meeting_frequency"),
  quorumPercent: integer("quorum_percent").notNull().default(50),
  establishedAt: date("established_at", { mode: "string" }),
  dissolvedAt: date("dissolved_at", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const governanceMembersTable = pgTable("governance_members", {
  id: serial("id").primaryKey(),
  governanceContextId: integer("governance_context_id").notNull(),
  userId: integer("user_id"),
  externalName: text("external_name"),
  externalEmail: text("external_email"),
  // role: chair | vice_chair | secretary | member | observer | alternate
  role: text("role").notNull().default("member"),
  isVoting: boolean("is_voting").notNull().default(true),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGovernanceContextSchema = createInsertSchema(governanceContextsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertGovernanceMemberSchema = createInsertSchema(governanceMembersTable).omit({ id: true, createdAt: true });

export type GovernanceContext = typeof governanceContextsTable.$inferSelect;
export type GovernanceMember = typeof governanceMembersTable.$inferSelect;
export type InsertGovernanceContext = z.infer<typeof insertGovernanceContextSchema>;
export type InsertGovernanceMember = z.infer<typeof insertGovernanceMemberSchema>;

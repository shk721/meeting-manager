import { pgTable, text, serial, timestamp, integer, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const organizationsTable = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  type: text("type").notNull().default("government"),
  // government | private | semi_government | ngo
  logoUrl: text("logo_url"),
  website: text("website"),
  description: text("description"),
  countryCode: text("country_code").notNull().default("SA"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").notNull(),
  parentId: integer("parent_id"),
  // self-referential: NULL = root department
  name: text("name").notNull(),
  nameEn: text("name_en"),
  code: text("code"),
  // level: 1=قطاع 2=إدارة عامة 3=إدارة 4=قسم
  level: integer("level").notNull().default(1),
  description: text("description"),
  managerId: integer("manager_id"),
  status: text("status").notNull().default("active"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const userDepartmentsTable = pgTable("user_departments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  departmentId: integer("department_id").notNull(),
  isPrimary: boolean("is_primary").notNull().default(true),
  role: text("role").notNull().default("member"),
  // head | deputy | member
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrganizationSchema = createInsertSchema(organizationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserDepartmentSchema = createInsertSchema(userDepartmentsTable).omit({ id: true, createdAt: true });

export type Organization = typeof organizationsTable.$inferSelect;
export type Department = typeof departmentsTable.$inferSelect;
export type UserDepartment = typeof userDepartmentsTable.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type InsertUserDepartment = z.infer<typeof insertUserDepartmentSchema>;

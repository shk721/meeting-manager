import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  department: text("department"),
  avatar: text("avatar"),
  bio: text("bio"),
  phone: text("phone"),
  timezone: text("timezone").default("UTC"),
  theme: text("theme").default("auto"),
  language: text("language").default("ar"),
  // Organizational context (nullable — assigned by admin via settings)
  organizationId: integer("organization_id"),
  departmentId: integer("department_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

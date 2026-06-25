import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const committeesTable = pgTable("committees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("committee"),
  chairpersonId: integer("chairperson_id"),
  secretaryId: integer("secretary_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const committeeMembersTable = pgTable("committee_members", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: date("joined_at", { mode: "string" }),
});

export const insertCommitteeSchema = createInsertSchema(committeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCommitteeMemberSchema = createInsertSchema(committeeMembersTable).omit({ id: true });
export type InsertCommittee = z.infer<typeof insertCommitteeSchema>;
export type Committee = typeof committeesTable.$inferSelect;
export type CommitteeMember = typeof committeeMembersTable.$inferSelect;

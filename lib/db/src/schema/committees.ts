import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Committees ────────────────────────────────────────────────────────────
export const committeesTable = pgTable("committees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("external"), // "external" | "internal"
  organization: text("organization"),
  description: text("description"),
  frequency: text("frequency"),
  status: text("status").notNull().default("active"), // active | inactive | archived
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCommitteeSchema = createInsertSchema(committeesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommittee = z.infer<typeof insertCommitteeSchema>;
export type Committee = typeof committeesTable.$inferSelect;

// ─── Representatives ─────────────────────────────────────────────────────────
export const committeeRepresentativesTable = pgTable("committee_representatives", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  userId: integer("user_id"),
  externalName: text("external_name"),
  externalEmail: text("external_email"),
  role: text("role").notNull().default("member"), // head | member | alternate
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommitteeRepresentativeSchema = createInsertSchema(committeeRepresentativesTable).omit({ id: true, createdAt: true });
export type InsertCommitteeRepresentative = z.infer<typeof insertCommitteeRepresentativeSchema>;
export type CommitteeRepresentative = typeof committeeRepresentativesTable.$inferSelect;

// ─── Sessions ────────────────────────────────────────────────────────────────
export const committeeSessionsTable = pgTable("committee_sessions", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  meetingId: integer("meeting_id"),           // optional link to a formal meeting
  title: text("title").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  location: text("location"),
  status: text("status").notNull().default("scheduled"), // scheduled | completed | cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCommitteeSessionSchema = createInsertSchema(committeeSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCommitteeSession = z.infer<typeof insertCommitteeSessionSchema>;
export type CommitteeSession = typeof committeeSessionsTable.$inferSelect;

// ─── Decisions (incoming) ────────────────────────────────────────────────────
export const committeeDecisionsTable = pgTable("committee_decisions", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  sessionId: integer("session_id"),
  content: text("content").notNull(),
  notes: text("notes"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommitteeDecisionSchema = createInsertSchema(committeeDecisionsTable).omit({ id: true, createdAt: true });
export type InsertCommitteeDecision = z.infer<typeof insertCommitteeDecisionSchema>;
export type CommitteeDecision = typeof committeeDecisionsTable.$inferSelect;

// ─── Outgoing information ─────────────────────────────────────────────────────
export const committeeOutgoingTable = pgTable("committee_outgoing", {
  id: serial("id").primaryKey(),
  committeeId: integer("committee_id").notNull(),
  sessionId: integer("session_id"),
  subject: text("subject").notNull(),
  content: text("content"),
  sentDate: date("sent_date", { mode: "string" }),
  sentById: integer("sent_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommitteeOutgoingSchema = createInsertSchema(committeeOutgoingTable).omit({ id: true, createdAt: true });
export type InsertCommitteeOutgoing = z.infer<typeof insertCommitteeOutgoingSchema>;
export type CommitteeOutgoing = typeof committeeOutgoingTable.$inferSelect;

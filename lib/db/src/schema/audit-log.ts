import { pgTable, text, bigserial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

// Audit log records are immutable — no updatedAt, no insert schema needed
export const auditLogTable = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  // entityType: meeting | decision | task | plan | deliverable | governance_context | user | department
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  // action: create | update | delete | status_change | member_add | member_remove | assignment
  action: text("action").notNull(),
  actorId: integer("actor_id"),
  actorIp: text("actor_ip"),
  // changes: { fieldName: [oldValue, newValue] }
  changes: jsonb("changes"),
  context: text("context"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLogTable.$inferSelect;

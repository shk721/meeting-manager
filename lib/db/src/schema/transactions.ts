import {
  pgTable, text, serial, integer, boolean, date,
  timestamp, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// ─── Main transactions table ──────────────────────────────────────────────────

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),

  // Core identity
  transactionType: text("transaction_type").notNull(), // برقية|خطاب|تعميم|بريد_رسمي|وارد|صادر|أخرى
  title: text("title").notNull(),
  summary: text("summary"),

  // Parties
  sendingParty: text("sending_party"),
  receivingParty: text("receiving_party"),

  // Dates
  transactionDate: date("transaction_date"),
  receiptDate: date("receipt_date"),
  dueDate: date("due_date"),

  // Purpose & classification
  purpose: text("purpose").notNull().default("for_info"), // for_info|for_action|for_reply|for_referral|for_follow_up|for_filing
  confidentiality: text("confidentiality").notNull().default("normal"), // normal|confidential|restricted|top_secret
  priority: text("priority").notNull().default("normal"), // low|normal|high|urgent

  // Status (dual-track)
  platformStatus: text("platform_status").notNull().default("new"),
  // new|pending_classification|for_info|requires_action|in_progress|waiting_external|replied|verified_complete|closed
  officialSystemStatus: text("official_system_status"), // مقيدة|محالة|تحت_الإجراء|مجاب_عنها|محفوظة

  // Action classification
  actionRequired: text("action_required").notNull().default("pending_classification"),
  // for_info|requires_action|undetermined|pending_classification
  requiredAction: text("required_action"), // ما الإجراء المطلوب

  // Completion verification
  completionEvidence: text("completion_evidence"),
  replySentAt: timestamp("reply_sent_at", { withTimezone: true }),
  replyReference: text("reply_reference"), // رقم الرد الصادر
  closedReason: text("closed_reason"),
  closedAt: timestamp("closed_at", { withTimezone: true }),

  // References
  externalUrl: text("external_url"),
  notes: text("notes"),

  // Integration metadata
  dataSource: text("data_source").notNull().default("manual"), // manual|excel_import|api_sync
  sourceSystem: text("source_system"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),

  // Relations
  assigneeId: integer("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
  verifiedById: integer("verified_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  createdById: integer("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  organizationId: integer("organization_id"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Transaction identifiers (multiple ref numbers) ───────────────────────────

export const transactionIdentifiersTable = pgTable("transaction_identifiers", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull()
    .references(() => transactionsTable.id, { onDelete: "cascade" }),
  number: text("number").notNull(),
  numberType: text("number_type").notNull(), // صادر_خارجي|وارد_داخلي|قيد_مراسلات|نظام_آخر|مرجع_رد
  issuingSystem: text("issuing_system"),
  issueDate: date("issue_date"),
  isPrimary: boolean("is_primary").notNull().default(false),
  externalUrl: text("external_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Links between transactions ───────────────────────────────────────────────

export const transactionLinksTable = pgTable("transaction_links", {
  id: serial("id").primaryKey(),
  fromTransactionId: integer("from_transaction_id").notNull()
    .references(() => transactionsTable.id, { onDelete: "cascade" }),
  toTransactionId: integer("to_transaction_id").notNull()
    .references(() => transactionsTable.id, { onDelete: "cascade" }),
  linkType: text("link_type").notNull(),
  // رد_على|وردت_بناء_على|إشارة_إلى|إلحاق|استكمال|إحالة|نسخة_من|تلغي|مرتبطة_بالموضوع
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Links to platform entities ───────────────────────────────────────────────

export const transactionContextLinksTable = pgTable("transaction_context_links", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull()
    .references(() => transactionsTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  // meeting|agenda_item|decision|task|plan|deliverable|governance_context|generated_document|topic
  entityId: integer("entity_id").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Transaction = typeof transactionsTable.$inferSelect;
export type TransactionIdentifier = typeof transactionIdentifiersTable.$inferSelect;
export type TransactionLink = typeof transactionLinksTable.$inferSelect;
export type TransactionContextLink = typeof transactionContextLinksTable.$inferSelect;

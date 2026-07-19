CREATE TABLE "transactions" (
  "id" serial PRIMARY KEY,
  "transaction_type" text NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "sending_party" text,
  "receiving_party" text,
  "transaction_date" date,
  "receipt_date" date,
  "due_date" date,
  "purpose" text NOT NULL DEFAULT 'for_info',
  "confidentiality" text NOT NULL DEFAULT 'normal',
  "priority" text NOT NULL DEFAULT 'normal',
  "platform_status" text NOT NULL DEFAULT 'new',
  "official_system_status" text,
  "action_required" text NOT NULL DEFAULT 'pending_classification',
  "required_action" text,
  "completion_evidence" text,
  "reply_sent_at" timestamptz,
  "reply_reference" text,
  "closed_reason" text,
  "closed_at" timestamptz,
  "external_url" text,
  "notes" text,
  "data_source" text NOT NULL DEFAULT 'manual',
  "source_system" text,
  "last_synced_at" timestamptz,
  "assignee_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "verified_by_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "organization_id" integer,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transaction_identifiers" (
  "id" serial PRIMARY KEY,
  "transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "number" text NOT NULL,
  "number_type" text NOT NULL,
  "issuing_system" text,
  "issue_date" date,
  "is_primary" boolean NOT NULL DEFAULT false,
  "external_url" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transaction_links" (
  "id" serial PRIMARY KEY,
  "from_transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "to_transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "link_type" text NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "transaction_context_links" (
  "id" serial PRIMARY KEY,
  "transaction_id" integer NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" integer NOT NULL,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "tx_identifiers_transaction_id_idx" ON "transaction_identifiers"("transaction_id");
CREATE INDEX "tx_links_from_idx" ON "transaction_links"("from_transaction_id");
CREATE INDEX "tx_links_to_idx" ON "transaction_links"("to_transaction_id");
CREATE INDEX "tx_context_links_transaction_id_idx" ON "transaction_context_links"("transaction_id");
CREATE INDEX "tx_context_links_entity_idx" ON "transaction_context_links"("entity_type", "entity_id");
CREATE INDEX "transactions_platform_status_idx" ON "transactions"("platform_status");
CREATE INDEX "transactions_assignee_id_idx" ON "transactions"("assignee_id");
CREATE INDEX "transactions_due_date_idx" ON "transactions"("due_date");

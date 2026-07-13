CREATE TABLE "topics" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"owner_id" integer,
	"organization_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "outcome_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "discussion_notes" text;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "topic_id" integer;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD COLUMN "deferred_to_meeting_id" integer;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_deferred_to_meeting_id_meetings_id_fk" FOREIGN KEY ("deferred_to_meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
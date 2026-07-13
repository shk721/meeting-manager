CREATE TABLE "agenda_item_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"agenda_item_id" integer NOT NULL,
	"content" text NOT NULL,
	"author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "agenda_item_id" integer;--> statement-breakpoint
ALTER TABLE "deliverables" ADD COLUMN "agenda_item_id" integer;--> statement-breakpoint
ALTER TABLE "agenda_item_comments" ADD CONSTRAINT "agenda_item_comments_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_item_comments" ADD CONSTRAINT "agenda_item_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_agenda_item_id_agenda_items_id_fk" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_decisions_agenda_item_id" ON "decisions" USING btree ("agenda_item_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_agenda_item_id" ON "tasks" USING btree ("agenda_item_id");
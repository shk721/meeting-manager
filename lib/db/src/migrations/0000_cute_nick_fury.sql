CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"department" text,
	"avatar" text,
	"bio" text,
	"phone" text,
	"timezone" text DEFAULT 'UTC',
	"theme" text DEFAULT 'auto',
	"language" text DEFAULT 'ar',
	"organization_id" integer,
	"department_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "meeting_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"project" text,
	"team" text,
	"location" text,
	"objectives" text,
	"chairperson_id" integer,
	"agenda_items" text[] DEFAULT '{}',
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurrence_pattern" text,
	"parent_meeting_id" integer,
	"invitations_sent_at" timestamp with time zone,
	"minutes_sent_at" timestamp with time zone,
	"governance_context_id" integer,
	"plan_id" integer,
	"organization_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "minutes" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"executive_summary" text,
	"discussion_items" text,
	"risks" text,
	"previous_follow_up" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "minutes_meeting_id_unique" UNIQUE("meeting_id")
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer,
	"agenda_item" text,
	"title" text,
	"content" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'approved' NOT NULL,
	"governance_context_id" integer,
	"approved_by" integer,
	"agenda_item_id" integer,
	"due_date" date,
	"assigned_to" integer,
	"plan_id" integer,
	"impact_type" text,
	"impact_target" text,
	"decision_type" text,
	"rationale" text,
	"organization_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_changelog" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"content" text NOT NULL,
	"author_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"completion_percent" integer DEFAULT 0 NOT NULL,
	"due_date" date,
	"agenda_item" text,
	"meeting_id" integer,
	"decision_id" integer,
	"assignee_id" integer,
	"component_id" integer,
	"committee_id" integer,
	"plan_id" integer,
	"phase_id" integer,
	"workstream_id" integer,
	"deliverable_id" integer,
	"progress_weight" integer DEFAULT 1 NOT NULL,
	"organization_id" integer,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"subplan_id" integer NOT NULL,
	"driver" text NOT NULL,
	"title" text NOT NULL,
	"desc" text DEFAULT '' NOT NULL,
	"priority" text DEFAULT 'متوسطة' NOT NULL,
	"ref_year" integer DEFAULT 2024 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"deadline" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_resources" (
	"id" serial PRIMARY KEY NOT NULL,
	"subplan_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"allocation" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"label" text NOT NULL,
	"period" text DEFAULT 'manual' NOT NULL,
	"metrics" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_subplans" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'لم يبدأ' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"deadline" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dt_task_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"note" text NOT NULL,
	"auto" text,
	"by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" integer NOT NULL,
	"session_id" integer,
	"content" text NOT NULL,
	"notes" text,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_outgoing" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" integer NOT NULL,
	"session_id" integer,
	"subject" text NOT NULL,
	"content" text,
	"sent_date" date,
	"sent_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_representatives" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" integer NOT NULL,
	"user_id" integer,
	"external_name" text,
	"external_email" text,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" integer NOT NULL,
	"meeting_id" integer,
	"title" text NOT NULL,
	"date" date NOT NULL,
	"location" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'external' NOT NULL,
	"organization" text,
	"description" text,
	"frequency" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_id" integer,
	"related_type" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"filters" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notifications_email" boolean DEFAULT true NOT NULL,
	"notifications_push" boolean DEFAULT true NOT NULL,
	"notifications_sms" boolean DEFAULT false NOT NULL,
	"email_digest" text DEFAULT 'daily' NOT NULL,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_method" text,
	"two_factor_pending_code" text,
	"show_in_directory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_preferences_user_id" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"minutes_before" integer NOT NULL,
	"is_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"effectiveness_score" integer DEFAULT 0 NOT NULL,
	"action_items_created" integer DEFAULT 0 NOT NULL,
	"decisions_made" integer DEFAULT 0 NOT NULL,
	"participants_engaged" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productivity_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"week_of" date NOT NULL,
	"meetings_attended" integer DEFAULT 0 NOT NULL,
	"meetings_organized" integer DEFAULT 0 NOT NULL,
	"action_items_owned" integer DEFAULT 0 NOT NULL,
	"action_items_completed" integer DEFAULT 0 NOT NULL,
	"productivity_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" text NOT NULL,
	"frequency" text DEFAULT 'weekly' NOT NULL,
	"include_metrics" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'operational' NOT NULL,
	"description" text,
	"phase_count" integer DEFAULT 0 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"phases_json" text DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_workstreams" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"phase_id" integer,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'operational' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"template_id" integer,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_by_id" integer,
	"organization_id" integer,
	"department_id" integer,
	"owner_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notif_upcoming_meetings" boolean DEFAULT true NOT NULL,
	"notif_due_tasks" boolean DEFAULT true NOT NULL,
	"notif_pending_decisions" boolean DEFAULT true NOT NULL,
	"notif_plan_updates" boolean DEFAULT true NOT NULL,
	"notif_weekly_digest" boolean DEFAULT false NOT NULL,
	"org_name" text,
	"timezone" text DEFAULT 'Asia/Riyadh' NOT NULL,
	"calendar_system" text DEFAULT 'gregorian' NOT NULL,
	"language" text DEFAULT 'ar' NOT NULL,
	"minutes_cycle" text DEFAULT 'single' NOT NULL,
	"theme_mode" text DEFAULT 'light' NOT NULL,
	"display_density" text DEFAULT 'standard' NOT NULL,
	"planning_auto_progress" boolean DEFAULT true NOT NULL,
	"planning_milestones_layer" boolean DEFAULT false NOT NULL,
	"planning_mandatory_impact" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"parent_id" integer,
	"name" text NOT NULL,
	"name_en" text,
	"code" text,
	"level" integer DEFAULT 1 NOT NULL,
	"description" text,
	"manager_id" integer,
	"status" text DEFAULT 'active' NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_en" text,
	"type" text DEFAULT 'government' NOT NULL,
	"logo_url" text,
	"website" text,
	"description" text,
	"country_code" text DEFAULT 'SA' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"department_id" integer NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_contexts" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"department_id" integer,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"scope" text DEFAULT 'internal' NOT NULL,
	"classification" text DEFAULT 'general' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"description" text,
	"mandate" text,
	"meeting_frequency" text,
	"quorum_percent" integer DEFAULT 50 NOT NULL,
	"established_at" date,
	"dissolved_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"governance_context_id" integer NOT NULL,
	"user_id" integer,
	"external_name" text,
	"external_email" text,
	"role" text DEFAULT 'member' NOT NULL,
	"is_voting" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agenda_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"meeting_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"duration_min" integer,
	"presenter_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"notes" text,
	"carry_forward" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverables" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"phase_id" integer,
	"workstream_id" integer,
	"title" text NOT NULL,
	"description" text,
	"acceptance_criteria" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"owner_id" integer,
	"reviewer_id" integer,
	"due_date" date,
	"submitted_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"action" text NOT NULL,
	"actor_id" integer,
	"actor_ip" text,
	"changes" jsonb,
	"context" text,
	"session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"format" text DEFAULT 'pdf' NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"file_url" text,
	"frozen_data" jsonb,
	"created_by_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_governance_context_id_governance_contexts_id_fk" FOREIGN KEY ("governance_context_id") REFERENCES "public"."governance_contexts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_phases" ADD CONSTRAINT "plan_phases_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_workstreams" ADD CONSTRAINT "plan_workstreams_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_workstreams" ADD CONSTRAINT "plan_workstreams_phase_id_plan_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."plan_phases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_departments" ADD CONSTRAINT "user_departments_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "governance_members" ADD CONSTRAINT "governance_members_governance_context_id_governance_contexts_id_fk" FOREIGN KEY ("governance_context_id") REFERENCES "public"."governance_contexts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_items" ADD CONSTRAINT "agenda_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_meeting_attendees_meeting_id" ON "meeting_attendees" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_meeting_attendees_user_id" ON "meeting_attendees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_meetings_date" ON "meetings" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_meetings_status" ON "meetings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_meetings_governance_context_id" ON "meetings" USING btree ("governance_context_id");--> statement-breakpoint
CREATE INDEX "idx_decisions_meeting_id" ON "decisions" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_decisions_plan_id" ON "decisions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_decisions_governance_context_id" ON "decisions" USING btree ("governance_context_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_meeting_id" ON "tasks" USING btree ("meeting_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_plan_id" ON "tasks" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_assignee_id" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_read" ON "notifications" USING btree ("user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_saved_views_user_id" ON "saved_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_preferences_user_id" ON "preferences" USING btree ("user_id");
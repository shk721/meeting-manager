CREATE TABLE "plan_staff" (
  "id" serial PRIMARY KEY,
  "plan_id" integer NOT NULL REFERENCES "plans"("id") ON DELETE CASCADE,
  "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
  "external_name" text,
  "external_email" text,
  "external_phone" text,
  "role" text NOT NULL DEFAULT 'عضو',
  "specialty" text,
  "employment_status" text NOT NULL DEFAULT 'regular_hours',
  "work_location" text,
  "department" text,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX "plan_staff_plan_id_idx" ON "plan_staff"("plan_id");
CREATE INDEX "plan_staff_user_id_idx" ON "plan_staff"("user_id");

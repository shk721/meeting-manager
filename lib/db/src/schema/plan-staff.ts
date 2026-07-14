import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { plansTable } from "./plans";
import { usersTable } from "./users";

export const planStaffTable = pgTable("plan_staff", {
  id:               serial("id").primaryKey(),
  planId:           integer("plan_id").notNull().references(() => plansTable.id, { onDelete: "cascade" }),
  userId:           integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  externalName:     text("external_name"),
  externalEmail:    text("external_email"),
  externalPhone:    text("external_phone"),
  role:             text("role").notNull().default("عضو"),
  specialty:        text("specialty"),
  // secondment = انتداب | assignment = تكليف | regular_hours = خلال الدوام الرسمي
  employmentStatus: text("employment_status").notNull().default("regular_hours"),
  workLocation:     text("work_location"),
  department:       text("department"),
  startDate:        date("start_date"),
  endDate:          date("end_date"),
  notes:            text("notes"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
});

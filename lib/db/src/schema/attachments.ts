import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const meetingAttachmentsTable = pgTable("meeting_attachments", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  data: text("data").notNull(),
  uploadedById: integer("uploaded_by_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMeetingAttachmentSchema = createInsertSchema(meetingAttachmentsTable).omit({ id: true, createdAt: true });
export type InsertMeetingAttachment = z.infer<typeof insertMeetingAttachmentSchema>;
export type MeetingAttachment = typeof meetingAttachmentsTable.$inferSelect;

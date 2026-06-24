import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { db, minutesTable, usersTable, meetingsTable, meetingAttendeesTable } from "@workspace/db";
import { CreateMeetingMinutesBody } from "@workspace/api-zod";
import { formatUser } from "./users";
import { requireRole } from "../middleware/auth";
import { sendMinutesApprovedEmail } from "../lib/mailer";

const router: IRouter = Router();

function formatMinutes(minutes: typeof minutesTable.$inferSelect, approvedBy: typeof usersTable.$inferSelect | null) {
  return {
    id: minutes.id, meetingId: minutes.meetingId,
    executiveSummary: minutes.executiveSummary ?? null,
    discussionItems: minutes.discussionItems ?? null,
    risks: minutes.risks ?? null,
    previousFollowUp: minutes.previousFollowUp ?? null,
    status: minutes.status,
    approvedBy: approvedBy ? formatUser(approvedBy) : null,
    approvedAt: minutes.approvedAt?.toISOString() ?? null,
    createdAt: minutes.createdAt.toISOString(),
    updatedAt: minutes.updatedAt.toISOString(),
  };
}

router.get("/meetings/:id/minutes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const meetingId = parseInt(raw, 10);

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));
  if (!minutes) { res.status(404).json({ error: "Minutes not found" }); return; }

  const [approvedBy] = minutes.approvedById
    ? await db.select().from(usersTable).where(eq(usersTable.id, minutes.approvedById))
    : [null];

  res.json(formatMinutes(minutes, approvedBy ?? null));
});

router.post("/meetings/:id/minutes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const meetingId = parseInt(raw, 10);

  const parsed = CreateMeetingMinutesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));

  let minutes: typeof minutesTable.$inferSelect;
  if (existing.length > 0) {
    const [updated] = await db.update(minutesTable)
      .set(parsed.data).where(eq(minutesTable.meetingId, meetingId)).returning();
    minutes = updated;
  } else {
    const [created] = await db.insert(minutesTable)
      .values({ meetingId, ...parsed.data }).returning();
    minutes = created;
  }

  res.status(201).json(formatMinutes(minutes, null));
});

router.post("/minutes/:id/approve", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const minutesId = parseInt(raw, 10);
  const sessionUserId = (req.session as any).userId;

  const [updated] = await db.update(minutesTable)
    .set({ status: "approved", approvedById: sessionUserId ?? null, approvedAt: new Date() })
    .where(eq(minutesTable.id, minutesId)).returning();

  if (!updated) { res.status(404).json({ error: "Minutes not found" }); return; }

  const [approvedBy] = updated.approvedById
    ? await db.select().from(usersTable).where(eq(usersTable.id, updated.approvedById))
    : [null];

  // Send email notifications to all attendees (fire and forget)
  void (async () => {
    try {
      const [meeting] = await db.select().from(meetingsTable)
        .where(eq(meetingsTable.id, updated.meetingId));
      if (!meeting) return;

      const attendeeRows = await db.select().from(meetingAttendeesTable)
        .where(eq(meetingAttendeesTable.meetingId, updated.meetingId));
      const attendeeIds = attendeeRows.map(a => a.userId);
      if (attendeeIds.length === 0) return;

      const attendees = await db.select().from(usersTable)
        .where(inArray(usersTable.id, attendeeIds));

      await sendMinutesApprovedEmail({
        toEmails: attendees.map(a => a.email).filter(Boolean),
        meetingTitle: meeting.title,
        approverName: approvedBy?.fullName ?? "مسؤول",
      });
    } catch {}
  })();

  res.json(formatMinutes(updated, approvedBy ?? null));
});

// GET /meetings/:id/minutes/export — returns PDF
router.get("/meetings/:id/minutes/export", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const meetingId = parseInt(raw, 10);

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));
  if (!minutes) { res.status(404).json({ error: "Minutes not found" }); return; }

  const doc = new PDFDocument({ margin: 50, size: "A4" });

  const filename = `minutes-${meetingId}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Title
  doc.fontSize(20).text(meeting.title, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(12).text(`Date: ${meeting.date}  Time: ${meeting.time ?? ""}`, { align: "center" });
  if (meeting.location) doc.text(`Location: ${meeting.location}`, { align: "center" });
  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown();

  function section(title: string, content: string | null | undefined) {
    if (!content) return;
    doc.fontSize(14).text(title, { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).text(content);
    doc.moveDown();
  }

  section("Executive Summary", minutes.executiveSummary);
  section("Discussion Items", minutes.discussionItems);
  section("Risks", minutes.risks);
  section("Previous Follow-up", minutes.previousFollowUp);

  if (minutes.status === "approved" && minutes.approvedAt) {
    doc.moveDown();
    doc.fontSize(11).text(`Approved: ${new Date(minutes.approvedAt).toLocaleDateString()}`);
  }

  doc.end();
});

export default router;

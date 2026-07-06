import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import {
  db, meetingsTable, minutesTable, tasksTable, decisionsTable,
  meetingAttendeesTable, usersTable, reportSubscriptionsTable,
} from "@workspace/db";
import {
  generateMeetingPDF,
  generateWeeklyReportPDF,
  generateMeetingICalString,
  generateMeetingsCSV,
  generateActionItemsCSV,
  generateExcelBuffer,
} from "../services/export";

const router: IRouter = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// GET /export/meeting/:id/pdf
router.get("/export/meeting/:id/pdf", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, id));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.meetingId, id));
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.meetingId, id));
  const attendeeRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
  const attendeeIds = attendeeRows.map(a => a.userId);
  const attendees = attendeeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeIds))
    : [];

  const pdfBuffer = generateMeetingPDF(meeting, minutes ?? null, tasks, decisions, attendees);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="meeting-${id}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

// GET /export/meeting/:id/ical
router.get("/export/meeting/:id/ical", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const attendeeRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
  const attendeeIds = attendeeRows.map(a => a.userId);
  const attendees = attendeeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeIds))
    : [];

  const ical = generateMeetingICalString(meeting, attendees);

  res.set({
    "Content-Type": "text/calendar",
    "Content-Disposition": `attachment; filename="meeting-${id}.ics"`,
  });
  res.send(ical);
});

// POST /export/meetings/bulk
router.post("/export/meetings/bulk", async (req, res): Promise<void> => {
  const { meeting_ids, format } = req.body as { meeting_ids: number[]; format: string };
  if (!Array.isArray(meeting_ids) || meeting_ids.length === 0) {
    res.status(400).json({ error: "meeting_ids must be a non-empty array" });
    return;
  }
  if (!["excel", "csv", "json"].includes(format)) {
    res.status(400).json({ error: "format must be excel, csv, or json" });
    return;
  }

  const meetings = await db.select().from(meetingsTable).where(inArray(meetingsTable.id, meeting_ids));

  if (format === "json") {
    res.json(meetings);
    return;
  }
  if (format === "csv") {
    const csv = generateMeetingsCSV(meetings);
    res.set({ "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=\"meetings.csv\"" });
    res.send(csv);
    return;
  }
  // excel
  const buffer = generateExcelBuffer(meetings);
  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": "attachment; filename=\"meetings.xlsx\"",
    "Content-Length": buffer.length,
  });
  res.send(buffer);
});

// GET /export/report/weekly?user_id=&week=YYYY-MM-DD
router.get("/export/report/weekly", async (req, res): Promise<void> => {
  const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : (req.session as any).userId as number;
  const week = (req.query.week as string) ?? today();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const weekEnd = week;
  const weekStart = new Date(week);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const attendeeRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.userId, userId));
  const meetingIds = attendeeRows.map(a => a.meetingId);
  const meetings = meetingIds.length > 0
    ? (await db.select().from(meetingsTable).where(inArray(meetingsTable.id, meetingIds)))
        .filter(m => m.date >= weekStartStr && m.date <= weekEnd)
    : [];

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, userId));

  const pdfBuffer = generateWeeklyReportPDF(user.fullName, meetings, tasks, week);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="weekly-report-${week}.pdf"`,
    "Content-Length": pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

// GET /export/report/team?period=month
router.get("/export/report/team", async (req, res): Promise<void> => {
  const period = (req.query.period as string) ?? "month";
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (period === "month" ? 30 : 7));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const meetings = (await db.select().from(meetingsTable))
    .filter(m => m.date >= cutoffStr && m.date <= today());
  const tasks = await db.select().from(tasksTable);

  const pdfBuffer = generateWeeklyReportPDF("الفريق", meetings, tasks, `${cutoffStr} → ${today()}`);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": "attachment; filename=\"team-report.pdf\"",
    "Content-Length": pdfBuffer.length,
  });
  res.send(pdfBuffer);
});

// GET /export/actionitems/csv
router.get("/export/actionitems/csv", async (_req, res): Promise<void> => {
  const tasks = await db.select().from(tasksTable)
    .where(and(
      // open or in_progress only
    ));
  const openTasks = tasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const csv = generateActionItemsCSV(openTasks);
  res.set({ "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=\"action-items.csv\"" });
  res.send(csv);
});

// POST /export/subscribe
router.post("/export/subscribe", async (req, res): Promise<void> => {
  const { email, frequency, include_metrics } = req.body as { email: string; frequency: string; include_metrics?: boolean };
  const userId = (req.session as any).userId as number;

  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "Valid email is required" });
    return;
  }
  if (!["weekly", "monthly"].includes(frequency ?? "")) {
    res.status(400).json({ error: "frequency must be weekly or monthly" });
    return;
  }

  const [sub] = await db.insert(reportSubscriptionsTable).values({
    userId,
    email,
    frequency,
    includeMetrics: include_metrics ?? true,
  }).returning();

  res.status(201).json(sub);
});

export default router;

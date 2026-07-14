import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import {
  db, meetingsTable, minutesTable, tasksTable, decisionsTable,
  meetingAttendeesTable, usersTable, reportSubscriptionsTable,
  plansTable, planPhasesTable, planWorksstreamsTable,
} from "@workspace/db";
import {
  generateMeetingPDF,
  generateWeeklyReportPDF,
  generateMeetingICalString,
  generateMeetingsCSV,
  generateActionItemsCSV,
  generateExcelBuffer,
  generatePlanPDF,
  generatePlanExcel,
  generateMinutesDocx,
  generatePlanDocx,
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

// GET /export/meeting/:id/docx
router.get("/export/meeting/:id/docx", async (req, res): Promise<void> => {
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

  const buffer = await generateMinutesDocx(meeting, minutes ?? null, tasks, decisions, attendees);

  const safeName = meeting.title.replace(/[^a-zA-Z0-9؀-ۿ\s]/g, "").trim().replace(/\s+/g, "-");
  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "Content-Disposition": `attachment; filename="minutes-${safeName}-${id}.docx"`,
    "Content-Length": buffer.length,
  });
  res.send(buffer);
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

// GET /export/plan/:id/pdf
router.get("/export/plan/:id/pdf", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

    const [phases, rawTasks, rawDecisions] = await Promise.all([
      db.select().from(planPhasesTable).where(eq(planPhasesTable.planId, id)),
      db.select().from(tasksTable).where(eq(tasksTable.planId, id)),
      db.select().from(decisionsTable).where(eq(decisionsTable.planId, id)),
    ]);

    const assigneeIds = [...new Set(rawTasks.map(t => t.assigneeId).filter(Boolean))] as number[];
    const assignees = assigneeIds.length > 0
      ? await db.select().from(usersTable).where(inArray(usersTable.id, assigneeIds))
      : [];
    const assigneeMap = Object.fromEntries(assignees.map(u => [u.id, u.fullName]));

    const totalPct = rawTasks.reduce((s, t) => s + (t.completionPercent ?? 0), 0);
    const progress = rawTasks.length > 0 ? Math.round(totalPct / rawTasks.length) : 0;

    const pdfBuffer = generatePlanPDF({
      title: plan.title,
      description: plan.description ?? null,
      type: plan.type,
      status: plan.status,
      startDate: plan.startDate ?? null,
      endDate: plan.endDate ?? null,
      progress,
      phases: phases.map(ph => ({ title: ph.title, status: ph.status, startDate: ph.startDate ?? null, endDate: ph.endDate ?? null })),
      tasks: rawTasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate ?? null, completionPercent: t.completionPercent, assigneeName: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null })),
      decisions: rawDecisions.map(d => ({ title: d.title ?? null, content: d.content, status: d.status ?? "approved", createdAt: d.createdAt.toISOString() })),
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="plan-${id}.pdf"`,
      "Content-Length": pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Plan PDF export error:", err?.message ?? err);
    res.status(500).json({ error: "فشل تصدير PDF" });
  }
});

// GET /export/plan/:id/excel
router.get("/export/plan/:id/excel", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const [phases, rawTasks, rawDecisions] = await Promise.all([
    db.select().from(planPhasesTable).where(eq(planPhasesTable.planId, id)),
    db.select().from(tasksTable).where(eq(tasksTable.planId, id)),
    db.select().from(decisionsTable).where(eq(decisionsTable.planId, id)),
  ]);

  const assigneeIds = [...new Set(rawTasks.map(t => t.assigneeId).filter(Boolean))] as number[];
  const assignees = assigneeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, assigneeIds))
    : [];
  const assigneeMap = Object.fromEntries(assignees.map(u => [u.id, u.fullName]));

  const totalPct = rawTasks.reduce((s, t) => s + (t.completionPercent ?? 0), 0);
  const progress = rawTasks.length > 0 ? Math.round(totalPct / rawTasks.length) : 0;

  const buffer = generatePlanExcel({
    title: plan.title,
    description: plan.description ?? null,
    type: plan.type,
    status: plan.status,
    startDate: plan.startDate ?? null,
    endDate: plan.endDate ?? null,
    progress,
    phases: phases.map(ph => ({ title: ph.title, status: ph.status, startDate: ph.startDate ?? null, endDate: ph.endDate ?? null })),
    tasks: rawTasks.map(t => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate ?? null, completionPercent: t.completionPercent, assigneeName: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null })),
    decisions: rawDecisions.map(d => ({ title: d.title ?? null, content: d.content, status: d.status ?? "approved", createdAt: d.createdAt.toISOString() })),
  });

  res.set({
    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="plan-${id}.xlsx"`,
    "Content-Length": buffer.length,
  });
  res.send(buffer);
});

// GET /export/plan/:id/word — DOCX via docx package
router.get("/export/plan/:id/word", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
    if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

    const [phases, workstreams, rawTasks, rawDecisions] = await Promise.all([
      db.select().from(planPhasesTable).where(eq(planPhasesTable.planId, id)).orderBy(planPhasesTable.orderIndex),
      db.select().from(planWorksstreamsTable).where(eq(planWorksstreamsTable.planId, id)).orderBy(planWorksstreamsTable.orderIndex),
      db.select().from(tasksTable).where(eq(tasksTable.planId, id)),
      db.select().from(decisionsTable).where(eq(decisionsTable.planId, id)),
    ]);

    let ownerName = "";
    if (plan.ownerId) {
      const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, plan.ownerId));
      ownerName = owner?.fullName ?? "";
    }

    const assigneeIds = [...new Set(rawTasks.map(t => t.assigneeId).filter(Boolean))] as number[];
    const assigneeMap: Record<number, string> = assigneeIds.length > 0
      ? Object.fromEntries(
          (await db.select().from(usersTable).where(inArray(usersTable.id, assigneeIds))).map(u => [u.id, u.fullName])
        )
      : {};

    const totalPct = rawTasks.reduce((s, t) => s + (t.completionPercent ?? 0), 0);
    const progress = rawTasks.length > 0 ? Math.round(totalPct / rawTasks.length) : 0;

    const buffer = generatePlanDocx({
      title: plan.title,
      description: plan.description ?? null,
      notes: plan.notes ?? null,
      type: plan.type,
      status: plan.status,
      startDate: plan.startDate ?? null,
      endDate: plan.endDate ?? null,
      ownerName,
      progress,
      phases: phases.map(ph => ({ title: ph.title, status: ph.status, startDate: ph.startDate ?? null, endDate: ph.endDate ?? null })),
      workstreams: workstreams.map(ws => ({
        title: ws.title,
        tasks: rawTasks.filter(t => t.workstreamId === ws.id).map(t => ({
          title: t.title, status: t.status,
          assigneeName: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null,
          completionPercent: t.completionPercent ?? 0, dueDate: t.dueDate ?? null,
        })),
      })),
      tasks: rawTasks.map(t => ({
        title: t.title, status: t.status, priority: t.priority,
        dueDate: t.dueDate ?? null, completionPercent: t.completionPercent ?? 0,
        assigneeName: t.assigneeId ? (assigneeMap[t.assigneeId] ?? null) : null,
      })),
      decisions: rawDecisions.map(d => ({ title: d.title ?? null, content: d.content, status: d.status ?? "approved" })),
    });

    // HTTP headers only allow ASCII; use RFC 5987 filename* for the Arabic title
    const utf8Name = encodeURIComponent(`${plan.title}-${id}.doc`);
    res.set({
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="plan-${id}.doc"; filename*=UTF-8''${utf8Name}`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  } catch (err: any) {
    console.error("Plan Word export error:", err?.message ?? err);
    res.status(500).json({ error: "فشل تصدير Word" });
  }
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

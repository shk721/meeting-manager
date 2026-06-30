import { Router, type IRouter } from "express";
import { eq, inArray, and } from "drizzle-orm";
import {
  db, meetingsTable, meetingAttendeesTable,
  usersTable, minutesTable, tasksTable, decisionsTable,
  taskCommentsTable, taskChangelogTable,
} from "@workspace/db";
import {
  GetMeetingsQueryParams, CreateMeetingBody,
  GetMeetingParams, UpdateMeetingParams, UpdateMeetingBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";

const router: IRouter = Router();

async function getMeetingWithMeta(meetingId: number) {
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) return null;

  const [chairperson] = meeting.chairpersonId
    ? await db.select().from(usersTable).where(eq(usersTable.id, meeting.chairpersonId))
    : [null];

  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, meetingId));
  const attendeeIds = attendeeRows.map(a => a.userId);
  const attendees = attendeeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeIds))
    : [];

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.meetingId, meetingId));

  return {
    id: meeting.id,
    title: meeting.title,
    date: meeting.date,
    time: meeting.time,
    status: meeting.status,
    project: meeting.project ?? null,
    team: meeting.team ?? null,
    location: meeting.location ?? null,
    chairperson: chairperson ? formatUser(chairperson) : null,
    attendeeCount: attendees.length,
    taskCount: tasks.length,
    hasMinutes: !!minutes,
    minutesApproved: minutes?.status === "approved",
    invitationsSentAt: meeting.invitationsSentAt?.toISOString() ?? null,
    minutesSentAt: meeting.minutesSentAt?.toISOString() ?? null,
    createdAt: meeting.createdAt.toISOString(),
  };
}

router.get("/meetings", async (req, res): Promise<void> => {
  const query = GetMeetingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  let meetings = await db.select().from(meetingsTable).orderBy(meetingsTable.date);

  if (query.data.status) {
    meetings = meetings.filter(m => m.status === query.data.status);
  }
  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    meetings = meetings.filter(m =>
      m.title.toLowerCase().includes(s) ||
      (m.project ?? "").toLowerCase().includes(s) ||
      (m.team ?? "").toLowerCase().includes(s)
    );
  }

  const results = await Promise.all(meetings.map(m => getMeetingWithMeta(m.id)));
  res.json(results.filter(Boolean));
});

router.post("/meetings", async (req, res): Promise<void> => {
  const parsed = CreateMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { attendeeIds, agendaItems, ...rest } = parsed.data;

  const [meeting] = await db.insert(meetingsTable).values({
    ...rest,
    agendaItems: agendaItems ?? [],
  }).returning();

  if (attendeeIds && attendeeIds.length > 0) {
    await db.insert(meetingAttendeesTable).values(
      attendeeIds.map(uid => ({ meetingId: meeting.id, userId: uid }))
    );
  }

  const result = await getMeetingWithMeta(meeting.id);
  res.status(201).json(result);
});

router.get("/meetings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const [chairperson] = meeting.chairpersonId
    ? await db.select().from(usersTable).where(eq(usersTable.id, meeting.chairpersonId))
    : [null];

  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, id));
  const attendeeIds = attendeeRows.map(a => a.userId);
  const attendees = attendeeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeIds))
    : [];

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, id));
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.meetingId, id));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.meetingId, id));

  const tasksWithAssignees = await Promise.all(tasks.map(async task => {
    const [assignee] = task.assigneeId
      ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId))
      : [null];
    return {
      id: task.id, title: task.title, description: task.description ?? null,
      status: task.status, priority: task.priority,
      completionPercent: task.completionPercent, dueDate: task.dueDate ?? null,
      agendaItem: task.agendaItem ?? null,
      meetingId: task.meetingId ?? null, decisionId: task.decisionId ?? null,
      assignee: assignee ? formatUser(assignee) : null,
      tags: task.tags ?? [], createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }));

  let minutesData = null;
  if (minutes) {
    const [approvedBy] = minutes.approvedById
      ? await db.select().from(usersTable).where(eq(usersTable.id, minutes.approvedById))
      : [null];
    minutesData = {
      id: minutes.id, meetingId: minutes.meetingId,
      executiveSummary: minutes.executiveSummary ?? null,
      discussionItems: minutes.discussionItems ?? null,
      risks: minutes.risks ?? null, previousFollowUp: minutes.previousFollowUp ?? null,
      status: minutes.status, approvedBy: approvedBy ? formatUser(approvedBy) : null,
      approvedAt: minutes.approvedAt?.toISOString() ?? null,
      createdAt: minutes.createdAt.toISOString(), updatedAt: minutes.updatedAt.toISOString(),
    };
  }

  res.json({
    id: meeting.id, title: meeting.title, date: meeting.date, time: meeting.time,
    status: meeting.status, project: meeting.project ?? null, team: meeting.team ?? null,
    location: meeting.location ?? null, objectives: meeting.objectives ?? null,
    chairperson: chairperson ? formatUser(chairperson) : null,
    attendees: attendees.map(formatUser), agendaItems: meeting.agendaItems ?? [],
    invitationsSentAt: meeting.invitationsSentAt?.toISOString() ?? null,
    minutesSentAt: meeting.minutesSentAt?.toISOString() ?? null,
    minutes: minutesData,
    decisions: decisions.map(d => ({
      id: d.id, meetingId: d.meetingId, agendaItem: d.agendaItem ?? null,
      content: d.content, notes: d.notes ?? null, createdAt: d.createdAt.toISOString(),
    })),
    tasks: tasksWithAssignees, createdAt: meeting.createdAt.toISOString(),
  });
});

router.patch("/meetings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { attendeeIds, agendaItems, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (agendaItems !== undefined) updateData.agendaItems = agendaItems;

  const [meeting] = await db.update(meetingsTable).set(updateData)
    .where(eq(meetingsTable.id, id)).returning();
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  if (attendeeIds !== undefined) {
    await db.delete(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
    if (attendeeIds.length > 0) {
      await db.insert(meetingAttendeesTable).values(
        attendeeIds.map(uid => ({ meetingId: id, userId: uid }))
      );
    }
  }

  const result = await getMeetingWithMeta(id);
  res.json(result);
});

router.post("/meetings/:id/attendees", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.body.userId, 10);
  if (isNaN(id) || isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const existing = await db.select().from(meetingAttendeesTable)
    .where(and(eq(meetingAttendeesTable.meetingId, id), eq(meetingAttendeesTable.userId, userId)));
  if (existing.length === 0) {
    await db.insert(meetingAttendeesTable).values({ meetingId: id, userId });
  }
  const result = await getMeetingWithMeta(id);
  res.json(result);
});

router.delete("/meetings/:id/attendees/:userId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const userId = parseInt(req.params.userId, 10);
  if (isNaN(id) || isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(meetingAttendeesTable)
    .where(and(eq(meetingAttendeesTable.meetingId, id), eq(meetingAttendeesTable.userId, userId)));
  const result = await getMeetingWithMeta(id);
  res.json(result);
});

router.delete("/meetings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const taskRows = await db.select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.meetingId, id));
  const taskIds = taskRows.map(t => t.id);
  if (taskIds.length > 0) {
    await db.delete(taskChangelogTable).where(inArray(taskChangelogTable.taskId, taskIds));
    await db.delete(taskCommentsTable).where(inArray(taskCommentsTable.taskId, taskIds));
  }
  await db.delete(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
  await db.delete(minutesTable).where(eq(minutesTable.meetingId, id));
  await db.delete(decisionsTable).where(eq(decisionsTable.meetingId, id));
  await db.delete(tasksTable).where(eq(tasksTable.meetingId, id));
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));
  res.sendStatus(204);
});

export default router;

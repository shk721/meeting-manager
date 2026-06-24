import { Router, type IRouter } from "express";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import {
  db, meetingsTable, meetingAttendeesTable,
  usersTable, minutesTable, tasksTable, decisionsTable,
} from "@workspace/db";
import {
  GetMeetingsQueryParams, CreateMeetingBody,
  UpdateMeetingBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";
import { requireRole } from "../middleware/auth";

const router: IRouter = Router();

// Fetch a single meeting with all related data (used for single-meeting endpoints)
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
    createdAt: meeting.createdAt.toISOString(),
  };
}

// GET /meetings — optimised: 5 queries total instead of 4×N
router.get("/meetings", async (req, res): Promise<void> => {
  const query = GetMeetingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, search } = query.data;

  const searchFilter = search
    ? or(
        ilike(meetingsTable.title, `%${search}%`),
        ilike(meetingsTable.project, `%${search}%`),
        ilike(meetingsTable.team, `%${search}%`),
      )
    : undefined;

  const meetings = await db
    .select()
    .from(meetingsTable)
    .where(and(
      status ? eq(meetingsTable.status, status) : undefined,
      searchFilter,
    ))
    .orderBy(meetingsTable.date);

  if (meetings.length === 0) {
    res.json([]);
    return;
  }

  const meetingIds = meetings.map(m => m.id);

  // Batch-fetch all related data in 4 queries
  const chairpersonIds = [...new Set(meetings.map(m => m.chairpersonId).filter((id): id is number => id != null))];
  const [chairpersons, allAttendees, allMinutes, allTasks] = await Promise.all([
    chairpersonIds.length > 0
      ? db.select().from(usersTable).where(inArray(usersTable.id, chairpersonIds))
      : Promise.resolve([]),
    db.select({ meetingId: meetingAttendeesTable.meetingId })
      .from(meetingAttendeesTable)
      .where(inArray(meetingAttendeesTable.meetingId, meetingIds)),
    db.select({ meetingId: minutesTable.meetingId, status: minutesTable.status })
      .from(minutesTable)
      .where(inArray(minutesTable.meetingId, meetingIds)),
    db.select({ meetingId: tasksTable.meetingId })
      .from(tasksTable)
      .where(inArray(tasksTable.meetingId, meetingIds)),
  ]);

  // Build lookup maps
  const chairpersonMap = new Map(chairpersons.map(u => [u.id, u]));
  const attendeeCountMap = new Map<number, number>();
  for (const a of allAttendees) {
    attendeeCountMap.set(a.meetingId, (attendeeCountMap.get(a.meetingId) ?? 0) + 1);
  }
  const minutesMap = new Map(allMinutes.map(m => [m.meetingId, m]));
  const taskCountMap = new Map<number, number>();
  for (const t of allTasks) {
    if (t.meetingId != null) {
      taskCountMap.set(t.meetingId, (taskCountMap.get(t.meetingId) ?? 0) + 1);
    }
  }

  res.json(meetings.map(m => ({
    id: m.id,
    title: m.title,
    date: m.date,
    time: m.time,
    status: m.status,
    project: m.project ?? null,
    team: m.team ?? null,
    location: m.location ?? null,
    chairperson: m.chairpersonId ? formatUser(chairpersonMap.get(m.chairpersonId)!) : null,
    attendeeCount: attendeeCountMap.get(m.id) ?? 0,
    taskCount: taskCountMap.get(m.id) ?? 0,
    hasMinutes: minutesMap.has(m.id),
    minutesApproved: minutesMap.get(m.id)?.status === "approved",
    createdAt: m.createdAt.toISOString(),
  })));
});

router.post("/meetings", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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
    minutes: minutesData,
    decisions: decisions.map(d => ({
      id: d.id, meetingId: d.meetingId, agendaItem: d.agendaItem ?? null,
      content: d.content, notes: d.notes ?? null, createdAt: d.createdAt.toISOString(),
    })),
    tasks: tasksWithAssignees, createdAt: meeting.createdAt.toISOString(),
  });
});

router.patch("/meetings/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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

router.delete("/meetings/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
  await db.delete(minutesTable).where(eq(minutesTable.meetingId, id));
  await db.delete(decisionsTable).where(eq(decisionsTable.meetingId, id));
  await db.delete(tasksTable).where(eq(tasksTable.meetingId, id));
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));
  res.sendStatus(204);
});

export default router;

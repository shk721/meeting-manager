import { Router, type IRouter } from "express";
import { and, eq, ilike, inArray, ne, or } from "drizzle-orm";
import {
  db, meetingsTable, meetingAttendeesTable,
  usersTable, minutesTable, tasksTable, decisionsTable,
  committeeMembersTable,
} from "@workspace/db";
import {
  GetMeetingsQueryParams, CreateMeetingBody,
  UpdateMeetingBody, UpdateMeetingAttendanceBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";
import { requireRole } from "../middleware/auth";
import { sendMeetingInvitationEmail } from "../lib/mailer";

const router: IRouter = Router();

// Returns compact meeting summary (used in list & create/update responses)
async function getMeetingWithMeta(meetingId: number) {
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) return null;

  const [chairperson] = meeting.chairpersonId
    ? await db.select().from(usersTable).where(eq(usersTable.id, meeting.chairpersonId))
    : [null];

  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, meetingId));
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
    committeeId: meeting.committeeId ?? null,
    recurringType: meeting.recurringType,
    chairperson: chairperson ? formatUser(chairperson) : null,
    attendeeCount: attendeeRows.length,
    taskCount: tasks.length,
    hasMinutes: !!minutes,
    minutesApproved: minutes?.status === "approved",
    createdAt: meeting.createdAt.toISOString(),
  };
}

// GET /meetings
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
    committeeId: m.committeeId ?? null,
    recurringType: m.recurringType,
    chairperson: m.chairpersonId ? formatUser(chairpersonMap.get(m.chairpersonId)!) : null,
    attendeeCount: attendeeCountMap.get(m.id) ?? 0,
    taskCount: taskCountMap.get(m.id) ?? 0,
    hasMinutes: minutesMap.has(m.id),
    minutesApproved: minutesMap.get(m.id)?.status === "approved",
    createdAt: m.createdAt.toISOString(),
  })));
});

// POST /meetings
router.post("/meetings", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateMeetingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { attendeeIds, guestAttendees, agendaItems, ...rest } = parsed.data;

  const [meeting] = await db.insert(meetingsTable).values({
    ...rest,
    committeeId: rest.committeeId ?? null,
    recurringType: rest.recurringType ?? "none",
    agendaItems: agendaItems ?? [],
  }).returning();

  const attendeeRows: { meetingId: number; userId: number; attendeeType: string; forAgendaItem?: string }[] = [];

  // If linked to a committee, auto-add permanent members
  if (meeting.committeeId) {
    const committeeMembers = await db.select().from(committeeMembersTable)
      .where(eq(committeeMembersTable.committeeId, meeting.committeeId));
    for (const m of committeeMembers) {
      attendeeRows.push({ meetingId: meeting.id, userId: m.userId, attendeeType: "member" });
    }
  }

  // Additional regular attendees
  if (attendeeIds && attendeeIds.length > 0) {
    const existingUserIds = new Set(attendeeRows.map(r => r.userId));
    for (const uid of attendeeIds) {
      if (!existingUserIds.has(uid)) {
        attendeeRows.push({ meetingId: meeting.id, userId: uid, attendeeType: "member" });
      }
    }
  }

  // Guest attendees (optionally tied to an agenda item)
  if (guestAttendees && guestAttendees.length > 0) {
    const existingUserIds = new Set(attendeeRows.map(r => r.userId));
    for (const g of guestAttendees) {
      if (!existingUserIds.has(g.userId)) {
        attendeeRows.push({ meetingId: meeting.id, userId: g.userId, attendeeType: "guest", forAgendaItem: g.forAgendaItem });
      }
    }
  }

  if (attendeeRows.length > 0) {
    await db.insert(meetingAttendeesTable).values(attendeeRows as any);
  }

  const result = await getMeetingWithMeta(meeting.id);
  res.status(201).json(result);
});

// GET /meetings/:id
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
  const attendeeUserIds = attendeeRows.map(a => a.userId);
  const attendeeUsers = attendeeUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeUserIds))
    : [];
  const attendeeUserMap = new Map(attendeeUsers.map(u => [u.id, u]));

  const attendeesWithMeta = attendeeRows.map(row => {
    const user = attendeeUserMap.get(row.userId);
    if (!user) return null;
    return {
      ...formatUser(user),
      attended: row.attended,
      attendeeType: row.attendeeType as "member" | "guest",
      forAgendaItem: row.forAgendaItem ?? null,
    };
  }).filter(Boolean);

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
    committeeId: meeting.committeeId ?? null,
    recurringType: meeting.recurringType,
    chairperson: chairperson ? formatUser(chairperson) : null,
    attendees: attendeesWithMeta,
    agendaItems: meeting.agendaItems ?? [],
    minutes: minutesData,
    decisions: decisions.map(d => ({
      id: d.id, meetingId: d.meetingId, agendaItem: d.agendaItem ?? null,
      content: d.content, notes: d.notes ?? null, createdAt: d.createdAt.toISOString(),
    })),
    tasks: tasksWithAssignees, createdAt: meeting.createdAt.toISOString(),
  });
});

// PATCH /meetings/:id
router.patch("/meetings/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateMeetingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { attendeeIds, agendaItems, guestAttendees, ...rest } = parsed.data as any;
  const updateData: any = { ...rest };
  if (agendaItems !== undefined) updateData.agendaItems = agendaItems;

  const [meeting] = await db.update(meetingsTable).set(updateData)
    .where(eq(meetingsTable.id, id)).returning();
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  if (attendeeIds !== undefined || guestAttendees !== undefined) {
    await db.delete(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, id));
    const rows: any[] = [];
    if (attendeeIds && attendeeIds.length > 0) {
      rows.push(...attendeeIds.map((uid: number) => ({ meetingId: id, userId: uid, attendeeType: "member" })));
    }
    if (guestAttendees && guestAttendees.length > 0) {
      rows.push(...guestAttendees.map((g: any) => ({ meetingId: id, userId: g.userId, attendeeType: "guest", forAgendaItem: g.forAgendaItem })));
    }
    if (rows.length > 0) {
      await db.insert(meetingAttendeesTable).values(rows);
    }
  }

  const result = await getMeetingWithMeta(id);
  res.json(result);
});

// DELETE /meetings/:id
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

// POST /meetings/:id/next — create next session in series
router.post("/meetings/:id/next", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [current] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!current) { res.status(404).json({ error: "Meeting not found" }); return; }

  if (current.recurringType === "none") {
    res.status(400).json({ error: "Meeting is not recurring" });
    return;
  }

  const currentDate = new Date(current.date);
  let nextDate: Date;
  if (current.recurringType === "weekly") {
    nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (current.recurringType === "biweekly") {
    nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 14);
  } else {
    nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
  }

  const nextDateStr = nextDate.toISOString().split("T")[0];

  const [newMeeting] = await db.insert(meetingsTable).values({
    title: current.title,
    date: nextDateStr,
    time: current.time,
    status: "scheduled",
    project: current.project,
    team: current.team,
    location: current.location,
    objectives: current.objectives,
    chairpersonId: current.chairpersonId,
    committeeId: current.committeeId,
    recurringType: current.recurringType,
    agendaItems: current.agendaItems ?? [],
  }).returning();

  // Copy committee members as permanent attendees
  if (newMeeting.committeeId) {
    const committeeMembers = await db.select().from(committeeMembersTable)
      .where(eq(committeeMembersTable.committeeId, newMeeting.committeeId));
    if (committeeMembers.length > 0) {
      await db.insert(meetingAttendeesTable).values(
        committeeMembers.map(m => ({
          meetingId: newMeeting.id,
          userId: m.userId,
          attendeeType: "member",
        }))
      );
    }
  } else {
    // Copy attendees from previous meeting
    const prevAttendees = await db.select().from(meetingAttendeesTable)
      .where(eq(meetingAttendeesTable.meetingId, id));
    if (prevAttendees.length > 0) {
      await db.insert(meetingAttendeesTable).values(
        prevAttendees.map(a => ({
          meetingId: newMeeting.id,
          userId: a.userId,
          attendeeType: a.attendeeType,
          forAgendaItem: a.forAgendaItem,
        }))
      );
    }
  }

  // Copy open tasks (not completed or cancelled)
  const openTasks = await db.select().from(tasksTable)
    .where(and(
      eq(tasksTable.meetingId, id),
      ne(tasksTable.status, "completed"),
      ne(tasksTable.status, "cancelled"),
    ));

  if (openTasks.length > 0) {
    await db.insert(tasksTable).values(
      openTasks.map(t => ({
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        completionPercent: t.completionPercent,
        dueDate: t.dueDate,
        meetingId: newMeeting.id,
        assigneeId: t.assigneeId,
        tags: t.tags,
      }))
    );
  }

  const result = await getMeetingWithMeta(newMeeting.id);
  res.status(201).json(result);
});

// POST /meetings/:id/send-invitations
router.post("/meetings/:id/send-invitations", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, id));
  const attendeeUserIds = attendeeRows.map(a => a.userId);
  const attendees = attendeeUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeUserIds))
    : [];

  const [organizer] = meeting.chairpersonId
    ? await db.select().from(usersTable).where(eq(usersTable.id, meeting.chairpersonId))
    : [null];

  const emails = attendees.map(u => u.email).filter(Boolean);

  await sendMeetingInvitationEmail({
    toEmails: emails,
    meetingTitle: meeting.title,
    date: meeting.date,
    time: meeting.time,
    location: meeting.location,
    agendaItems: meeting.agendaItems ?? [],
    organizerName: organizer?.fullName ?? "النظام",
  });

  res.json({ sent: emails.length });
});

// PATCH /meetings/:id/attendance
router.patch("/meetings/:id/attendance", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateMeetingAttendanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  for (const { userId, attended } of parsed.data.attendances) {
    await db.update(meetingAttendeesTable)
      .set({ attended })
      .where(and(
        eq(meetingAttendeesTable.meetingId, id),
        eq(meetingAttendeesTable.userId, userId),
      ));
  }

  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, id));
  const userIds = attendeeRows.map(a => a.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(attendeeRows.map(row => {
    const user = userMap.get(row.userId);
    return {
      ...formatUser(user!),
      attended: row.attended,
      attendeeType: row.attendeeType,
      forAgendaItem: row.forAgendaItem ?? null,
    };
  }));
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable, tasksTable,
  committeesTable, committeeRepresentativesTable, committeeDecisionsTable,
  dtComponentsTable,
  meetingsTable, meetingAttendeesTable,
} from "@workspace/db";
import { formatUser } from "./users";

const router: IRouter = Router();

router.get("/portal/:username", async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, req.params.username));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.assigneeId, user.id));

  const representations = await db.select().from(committeeRepresentativesTable)
    .where(eq(committeeRepresentativesTable.userId, user.id));
  const committees = await Promise.all(representations.map(async rep => {
    const [committee] = await db.select().from(committeesTable).where(eq(committeesTable.id, rep.committeeId));
    return committee ? { ...committee, myRole: rep.role } : null;
  }));

  const committeeIds = new Set(committees.filter(Boolean).map(c => c!.id));
  const committeeDecisions = committeeIds.size > 0
    ? (await db.select().from(committeeDecisionsTable)).filter(d => committeeIds.has(d.committeeId))
    : [];

  const dtTasks = tasks.filter(t => t.componentId !== null);
  const componentIds = Array.from(new Set(dtTasks.map(t => t.componentId).filter((id): id is number => id !== null)));
  const dtComponents = await Promise.all(componentIds.map(async id => {
    const [comp] = await db.select().from(dtComponentsTable).where(eq(dtComponentsTable.id, id));
    return comp ?? null;
  }));

  // Upcoming meetings the user is attending
  const today = new Date().toISOString().split("T")[0];
  const attendances = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.userId, user.id));
  const upcomingMeetings = attendances.length > 0
    ? (await Promise.all(attendances.map(async a => {
        const [m] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, a.meetingId));
        return m ?? null;
      }))).filter((m): m is NonNullable<typeof m> => m !== null && (m.date ?? "") >= today)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
    : [];

  res.json({
    user: formatUser(user),
    tasks: tasks.map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      completionPercent: t.completionPercent, dueDate: t.dueDate ?? null,
      meetingId: t.meetingId ?? null, decisionId: t.decisionId ?? null,
      componentId: t.componentId ?? null, committeeId: t.committeeId ?? null,
    })),
    committees: committees.filter(Boolean),
    committeeDecisions,
    dtComponents: dtComponents.filter(Boolean),
    upcomingMeetings: upcomingMeetings.map(m => ({
      id: m.id, title: m.title, date: m.date, time: m.time,
      location: m.location ?? null, status: m.status,
    })),
  });
});

export default router;

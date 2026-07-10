import { Router, type IRouter } from "express";
import { eq, and, gte, lte, lt, isNotNull } from "drizzle-orm";
import { db, meetingsTable, tasksTable, meetingAttendeesTable, minutesTable, decisionsTable, usersTable, agendaItemsTable } from "@workspace/db";

const router: IRouter = Router();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function weeksAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0, 10);
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

// GET /analytics/effectiveness
router.get("/analytics/effectiveness", async (_req, res): Promise<void> => {
  const allMeetings = await db.select().from(meetingsTable);
  const allMinutes = await db.select().from(minutesTable);
  const allDecisions = await db.select().from(decisionsTable);
  const allTasks = await db.select().from(tasksTable);
  const allAgendaItems = await db.select({ meetingId: agendaItemsTable.meetingId }).from(agendaItemsTable);

  const meetingsWithAgenda = new Set(allAgendaItems.map(a => a.meetingId));
  const minutesByMeeting = new Map(allMinutes.map(m => [m.meetingId, true]));
  const decisionsByMeeting = new Map<number, number>();
  for (const d of allDecisions) {
    if (d.meetingId) decisionsByMeeting.set(d.meetingId, (decisionsByMeeting.get(d.meetingId) ?? 0) + 1);
  }
  const tasksByMeeting = new Map<number, number>();
  for (const t of allTasks) {
    if (t.meetingId) tasksByMeeting.set(t.meetingId, (tasksByMeeting.get(t.meetingId) ?? 0) + 1);
  }

  const results = allMeetings.map(m => {
    const hasAgenda = meetingsWithAgenda.has(m.id);
    const hasMinutes = minutesByMeeting.has(m.id);
    const hasDecisions = (decisionsByMeeting.get(m.id) ?? 0) > 0;
    const hasTasks = (tasksByMeeting.get(m.id) ?? 0) > 0;
    const score = (hasAgenda ? 25 : 0) + (hasMinutes ? 25 : 0) + (hasDecisions ? 25 : 0) + (hasTasks ? 25 : 0);
    return {
      meetingId: m.id,
      title: m.title,
      date: m.date,
      score,
      breakdown: { hasAgenda, hasMinutes, hasDecisions, hasTasks },
    };
  });

  const avg = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  res.json({ meetings: results, averageScore: avg });
});

// GET /analytics/productivity?user_id=&period=week|month
router.get("/analytics/productivity", async (req, res): Promise<void> => {
  const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : null;
  const period = (req.query.period as string) ?? "week";
  const cutoff = period === "month" ? weeksAgo(4) : weeksAgo(1);

  const allUsers = await db.select().from(usersTable);
  const attendeeRows = await db.select().from(meetingAttendeesTable);
  const meetings = await db.select().from(meetingsTable);
  const tasks = await db.select().from(tasksTable);

  const recentMeetings = meetings.filter(m => m.date >= cutoff && m.date <= today());

  function userMetrics(uid: number) {
    const attended = recentMeetings.filter(m =>
      attendeeRows.some(a => a.meetingId === m.id && a.userId === uid)
    ).length;
    const organized = recentMeetings.filter(m => m.chairpersonId === uid).length;
    const myTasks = tasks.filter(t => t.assigneeId === uid);
    const owned = myTasks.length;
    const completed = myTasks.filter(t => t.status === "completed").length;
    const score = owned > 0
      ? Math.round(((completed / owned) * 50) + Math.min(attended * 5, 30) + Math.min(organized * 10, 20))
      : Math.min(attended * 5, 30) + Math.min(organized * 10, 20);
    return { userId: uid, meetingsAttended: attended, meetingsOrganized: organized, actionItemsOwned: owned, actionItemsCompleted: completed, productivityScore: Math.min(score, 100) };
  }

  if (userId) {
    res.json(userMetrics(userId));
  } else {
    res.json(allUsers.map(u => userMetrics(u.id)));
  }
});

// GET /analytics/trends?metric=duration|frequency|attendance&weeks=4
router.get("/analytics/trends", async (req, res): Promise<void> => {
  const metric = (req.query.metric as string) ?? "frequency";
  const weeks = Math.min(parseInt((req.query.weeks as string) ?? "4", 10), 12);
  if (!["duration", "frequency", "attendance"].includes(metric)) {
    res.status(400).json({ error: "Invalid metric. Use: duration, frequency, attendance" });
    return;
  }

  const cutoff = weeksAgo(weeks);
  const meetings = await db.select().from(meetingsTable);
  const attendeeRows = await db.select().from(meetingAttendeesTable);

  const recentMeetings = meetings.filter(m => m.date >= cutoff && m.date <= today());

  // Group by week start
  const grouped = new Map<string, number[]>();
  for (const m of recentMeetings) {
    const wk = weekStart(m.date);
    if (!grouped.has(wk)) grouped.set(wk, []);
    if (metric === "frequency") {
      grouped.get(wk)!.push(1);
    } else if (metric === "attendance") {
      const count = attendeeRows.filter(a => a.meetingId === m.id).length;
      grouped.get(wk)!.push(count);
    } else {
      // duration — placeholder, we don't store it yet
      grouped.get(wk)!.push(60);
    }
  }

  const result = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, vals]) => ({
      week,
      value: metric === "frequency" ? vals.length : Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));

  res.json({ metric, weeks, data: result });
});

// GET /analytics/team-health
router.get("/analytics/team-health", async (_req, res): Promise<void> => {
  const allTasks = await db.select().from(tasksTable);
  const allMeetings = await db.select().from(meetingsTable);
  const allAttendees = await db.select().from(meetingAttendeesTable);

  const todayStr = today();
  const open = allTasks.filter(t => t.status !== "completed" && t.status !== "cancelled");
  const completed = allTasks.filter(t => t.status === "completed");
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayStr);

  const completionRate = allTasks.length > 0
    ? Math.round((completed.length / allTasks.length) * 100)
    : 0;

  // Engagement: avg attendees per meeting (last 4 weeks)
  const cutoff = weeksAgo(4);
  const recentMeetings = allMeetings.filter(m => m.date >= cutoff && m.date <= todayStr);
  const avgAttendees = recentMeetings.length > 0
    ? Math.round(allAttendees.filter(a => recentMeetings.some(m => m.id === a.meetingId)).length / recentMeetings.length)
    : 0;
  const engagementScore = Math.min(avgAttendees * 15, 100);

  const score = Math.round((completionRate * 0.5) + (engagementScore * 0.5));

  res.json({
    score,
    completionRate,
    engagementScore,
    overdueCount: overdue.length,
    totalTasks: allTasks.length,
    completedTasks: completed.length,
  });
});

// GET /analytics/time-allocation?user_id=
router.get("/analytics/time-allocation", async (req, res): Promise<void> => {
  const userId = req.query.user_id ? parseInt(req.query.user_id as string, 10) : null;
  const cutoff = weeksAgo(4);
  const todayStr = today();

  const meetings = await db.select().from(meetingsTable);
  const attendeeRows = await db.select().from(meetingAttendeesTable);

  const recentMeetings = meetings.filter(m => m.date >= cutoff && m.date <= todayStr);
  const relevantMeetings = userId
    ? recentMeetings.filter(m => attendeeRows.some(a => a.meetingId === m.id && a.userId === userId))
    : recentMeetings;

  // Group by date, assume 60 min per meeting
  const byDate = new Map<string, number>();
  for (const m of relevantMeetings) {
    byDate.set(m.date, (byDate.get(m.date) ?? 0) + 60);
  }

  const data = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutesInMeetings]) => ({ date, minutesInMeetings }));

  const totalMinutes = data.reduce((s, d) => s + d.minutesInMeetings, 0);
  res.json({ userId, totalMinutesInMeetings: totalMinutes, dailyBreakdown: data });
});

// GET /analytics/actionitems/status
router.get("/analytics/actionitems/status", async (_req, res): Promise<void> => {
  const allTasks = await db.select({ id: tasksTable.id, status: tasksTable.status, dueDate: tasksTable.dueDate, assigneeId: tasksTable.assigneeId, priority: tasksTable.priority }).from(tasksTable);
  const todayStr = today();

  const open = allTasks.filter(t => t.status === "open" || t.status === "in_progress");
  const completed = allTasks.filter(t => t.status === "completed");
  const overdue = open.filter(t => t.dueDate && t.dueDate < todayStr);

  // By owner
  const byOwner = new Map<number, { open: number; completed: number; overdue: number }>();
  for (const t of allTasks) {
    if (!t.assigneeId) continue;
    if (!byOwner.has(t.assigneeId)) byOwner.set(t.assigneeId, { open: 0, completed: 0, overdue: 0 });
    const entry = byOwner.get(t.assigneeId)!;
    if (t.status === "completed") entry.completed++;
    else if (t.status === "open" || t.status === "in_progress") {
      entry.open++;
      if (t.dueDate && t.dueDate < todayStr) entry.overdue++;
    }
  }

  res.json({
    open: open.length,
    completed: completed.length,
    overdue: overdue.length,
    total: allTasks.length,
    byOwner: Array.from(byOwner.entries()).map(([userId, stats]) => ({ userId, ...stats })),
  });
});

export default router;

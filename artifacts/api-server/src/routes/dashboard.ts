import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, meetingsTable, tasksTable, minutesTable, usersTable, meetingAttendeesTable } from "@workspace/db";
import { formatUser } from "./users";

const router: IRouter = Router();

const today = () => new Date().toISOString().split("T")[0];

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const allMeetings = await db.select().from(meetingsTable);
  const allTasks = await db.select().from(tasksTable);
  const allMinutes = await db.select().from(minutesTable);

  const todayStr = today();
  const upcomingMeetings = allMeetings.filter(m =>
    (m.status === "scheduled" || m.status === "in_progress") && m.date >= todayStr
  ).length;

  const pendingMinutes = allMinutes.filter(m => m.status === "pending_approval").length;
  const openTasks = allTasks.filter(t => t.status === "open" || t.status === "in_progress").length;
  const overdueTasks = allTasks.filter(t =>
    t.dueDate && t.dueDate < todayStr && t.status !== "completed" && t.status !== "cancelled"
  ).length;
  const completedTasks = allTasks.filter(t => t.status === "completed").length;
  const completionRate = allTasks.length > 0
    ? Math.round((completedTasks / allTasks.length) * 100)
    : 0;

  const tasksByStatus = [
    { label: "مفتوح", value: allTasks.filter(t => t.status === "open").length, color: "#3b82f6" },
    { label: "قيد التنفيذ", value: allTasks.filter(t => t.status === "in_progress").length, color: "#f59e0b" },
    { label: "مكتمل", value: allTasks.filter(t => t.status === "completed").length, color: "#10b981" },
    { label: "معلق", value: allTasks.filter(t => t.status === "on_hold").length, color: "#8b5cf6" },
    { label: "ملغى", value: allTasks.filter(t => t.status === "cancelled").length, color: "#ef4444" },
  ];

  const tasksByPriority = [
    { label: "حرج", value: allTasks.filter(t => t.priority === "critical").length, color: "#ef4444" },
    { label: "عالٍ", value: allTasks.filter(t => t.priority === "high").length, color: "#f97316" },
    { label: "متوسط", value: allTasks.filter(t => t.priority === "medium").length, color: "#3b82f6" },
    { label: "منخفض", value: allTasks.filter(t => t.priority === "low").length, color: "#6b7280" },
  ];

  const meetingsByStatus = [
    { label: "مجدول", value: allMeetings.filter(m => m.status === "scheduled").length, color: "#3b82f6" },
    { label: "جارٍ", value: allMeetings.filter(m => m.status === "in_progress").length, color: "#f59e0b" },
    { label: "مكتمل", value: allMeetings.filter(m => m.status === "completed").length, color: "#10b981" },
    { label: "مؤجل", value: allMeetings.filter(m => m.status === "postponed").length, color: "#8b5cf6" },
    { label: "ملغى", value: allMeetings.filter(m => m.status === "cancelled").length, color: "#ef4444" },
  ];

  res.json({
    totalMeetings: allMeetings.length,
    upcomingMeetings,
    pendingMinutes,
    openTasks,
    overdueTasks,
    completedTasks,
    completionRate,
    tasksByStatus,
    tasksByPriority,
    meetingsByStatus,
  });
});

router.get("/dashboard/upcoming-meetings", async (_req, res): Promise<void> => {
  const todayStr = today();
  const meetings = await db.select().from(meetingsTable);
  const upcoming = meetings
    .filter(m => (m.status === "scheduled" || m.status === "in_progress") && m.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  const results = await Promise.all(upcoming.map(async m => {
    const [chairperson] = m.chairpersonId
      ? await db.select().from(usersTable).where(eq(usersTable.id, m.chairpersonId))
      : [null];
    const attendeeRows = await db.select().from(meetingAttendeesTable)
      .where(eq(meetingAttendeesTable.meetingId, m.id));
    const tasks = await db.select().from(tasksTable).where(eq(tasksTable.meetingId, m.id));
    const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, m.id));
    return {
      id: m.id, title: m.title, date: m.date, time: m.time, status: m.status,
      project: m.project ?? null, team: m.team ?? null, location: m.location ?? null,
      chairperson: chairperson ? formatUser(chairperson) : null,
      attendeeCount: attendeeRows.length, taskCount: tasks.length,
      hasMinutes: !!minutes, minutesApproved: minutes?.status === "approved",
      createdAt: m.createdAt.toISOString(),
    };
  }));
  res.json(results);
});

router.get("/dashboard/pending-minutes", async (_req, res): Promise<void> => {
  const pending = await db.select().from(minutesTable)
    .where(eq(minutesTable.status, "pending_approval"));

  const results = await Promise.all(pending.map(async m => {
    const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, m.meetingId));
    return {
      id: m.id, meetingId: m.meetingId,
      meetingTitle: meeting?.title ?? "اجتماع",
      meetingDate: meeting?.date ?? "",
      status: m.status,
    };
  }));
  res.json(results);
});

router.get("/dashboard/overdue-tasks", async (_req, res): Promise<void> => {
  const todayStr = today();
  const allTasks = await db.select().from(tasksTable);
  const overdue = allTasks.filter(t =>
    t.dueDate && t.dueDate < todayStr && t.status !== "completed" && t.status !== "cancelled"
  ).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")).slice(0, 10);

  const results = await Promise.all(overdue.map(async task => {
    const [assignee] = task.assigneeId
      ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId))
      : [null];
    return {
      id: task.id, title: task.title, description: task.description ?? null,
      status: task.status, priority: task.priority,
      completionPercent: task.completionPercent, dueDate: task.dueDate ?? null,
      meetingId: task.meetingId ?? null, decisionId: task.decisionId ?? null,
      assignee: assignee ? formatUser(assignee) : null, tags: task.tags ?? [],
      createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
    };
  }));
  res.json(results);
});

export default router;

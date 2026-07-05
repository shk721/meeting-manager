import { db, meetingsTable, tasksTable, meetingAttendeesTable, usersTable } from "./index.js";

type Period = "day" | "week" | "month";

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const end = fmt(now);
  if (period === "day") {
    const start = new Date(now); start.setDate(now.getDate() - 6);
    return { start: fmt(start), end };
  }
  if (period === "week") {
    const start = new Date(now); start.setDate(now.getDate() - 27);
    return { start: fmt(start), end };
  }
  // month — last 12 months
  const start = new Date(now); start.setMonth(now.getMonth() - 11);
  start.setDate(1);
  return { start: fmt(start), end };
}

function periodKey(dateStr: string, period: Period): string {
  const d = new Date(dateStr);
  if (period === "day") return dateStr;
  if (period === "week") {
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return start.toISOString().slice(0, 10);
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getMeetingStats(period: Period = "week") {
  const { start, end } = getDateRange(period);
  const meetings = await db.select().from(meetingsTable);
  const filtered = meetings.filter(m => m.date >= start && m.date <= end);

  const grouped: Record<string, { count: number; completed: number; cancelled: number; inProgress: number }> = {};
  for (const m of filtered) {
    const key = periodKey(m.date, period);
    if (!grouped[key]) grouped[key] = { count: 0, completed: 0, cancelled: 0, inProgress: 0 };
    grouped[key].count++;
    if (m.status === "completed")  grouped[key].completed++;
    if (m.status === "cancelled")  grouped[key].cancelled++;
    if (m.status === "in_progress") grouped[key].inProgress++;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

export async function getTaskStats(period: Period = "week") {
  const { start, end } = getDateRange(period);
  const tasks = await db.select().from(tasksTable);
  const todayStr = new Date().toISOString().slice(0, 10);

  const filtered = tasks.filter(t => {
    const ref = t.createdAt.toISOString().slice(0, 10);
    return ref >= start && ref <= end;
  });

  const grouped: Record<string, { count: number; completed: number; pending: number; overdue: number; high: number }> = {};
  for (const t of filtered) {
    const ref = t.createdAt.toISOString().slice(0, 10);
    const key = periodKey(ref, period);
    if (!grouped[key]) grouped[key] = { count: 0, completed: 0, pending: 0, overdue: 0, high: 0 };
    grouped[key].count++;
    if (t.status === "completed") grouped[key].completed++;
    else {
      grouped[key].pending++;
      if (t.dueDate && t.dueDate < todayStr) grouped[key].overdue++;
    }
    if (t.priority === "high" || t.priority === "critical") grouped[key].high++;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));
}

export async function getInsights() {
  const meetings = await db.select().from(meetingsTable);
  const tasks = await db.select().from(tasksTable);
  const attendeeRows = await db.select().from(meetingAttendeesTable);
  const users = await db.select().from(usersTable);

  // Busiest day of week (0=Sun, 6=Sat)
  const dayCount: number[] = new Array(7).fill(0);
  for (const m of meetings) {
    const d = new Date(m.date);
    dayCount[d.getDay()]++;
  }
  const busiestDayIndex = dayCount.indexOf(Math.max(...dayCount));
  const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

  // Completion rate
  const completionRate = tasks.length > 0
    ? Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100)
    : 0;

  // Avg attendees per meeting
  const meetingAttendeeMap: Record<number, number> = {};
  for (const row of attendeeRows) {
    meetingAttendeeMap[row.meetingId] = (meetingAttendeeMap[row.meetingId] ?? 0) + 1;
  }
  const counts = Object.values(meetingAttendeeMap);
  const avgAttendees = counts.length > 0
    ? Math.round(counts.reduce((s, c) => s + c, 0) / counts.length)
    : 0;

  // Most active attendee (most meeting appearances)
  const userAttendCount: Record<number, number> = {};
  for (const row of attendeeRows) {
    userAttendCount[row.userId] = (userAttendCount[row.userId] ?? 0) + 1;
  }
  const topUserId = Object.entries(userAttendCount).sort(([, a], [, b]) => b - a)[0]?.[0];
  const topUser = users.find(u => u.id === parseInt(topUserId ?? "0", 10));

  // Overdue task count
  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCount = tasks.filter(t =>
    t.dueDate && t.dueDate < todayStr && t.status !== "completed" && t.status !== "cancelled"
  ).length;

  return {
    busiestDay: dayNames[busiestDayIndex] ?? "غير محدد",
    completionRate,
    avgAttendeesPerMeeting: avgAttendees,
    mostActiveAttendee: topUser?.fullName ?? null,
    overdueTaskCount: overdueCount,
    totalMeetings: meetings.length,
    totalTasks: tasks.length,
  };
}

export async function getThisWeekData() {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const start = startOfWeek.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const meetings = await db.select().from(meetingsTable);
  const tasks = await db.select().from(tasksTable);

  const weekMeetings = meetings
    .filter(m => m.date >= start)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)
    .map(m => ({ id: m.id, title: m.title, date: m.date, time: m.time, status: m.status }));

  const weekTasks = tasks
    .filter(t => {
      const ref = t.createdAt.toISOString().slice(0, 10);
      return ref >= start;
    })
    .slice(0, 10)
    .map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate }));

  const upcoming = meetings
    .filter(m => m.date >= todayStr && (m.status === "scheduled" || m.status === "in_progress"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map(m => ({ id: m.id, title: m.title, date: m.date, time: m.time }));

  return { meetings: weekMeetings, tasks: weekTasks, upcoming };
}

export async function getPendingData() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const tasks = await db.select().from(tasksTable);
  const meetings = await db.select().from(meetingsTable);

  const overdueTasks = tasks
    .filter(t => t.dueDate && t.dueDate < todayStr && t.status !== "completed" && t.status !== "cancelled")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .slice(0, 8)
    .map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority, status: t.status }));

  const upcomingMeetings = meetings
    .filter(m => m.date >= todayStr && (m.status === "scheduled" || m.status === "in_progress"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)
    .map(m => ({ id: m.id, title: m.title, date: m.date, time: m.time, status: m.status }));

  return { overdueTasks, upcomingMeetings };
}

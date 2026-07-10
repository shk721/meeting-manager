import { eq, inArray } from "drizzle-orm";
import {
  db, meetingsTable, minutesTable, tasksTable, decisionsTable,
  meetingAttendeesTable, usersTable,
} from "@workspace/db";

export async function getMeetingReportData(meetingId: number) {
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) return null;

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.meetingId, meetingId));
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.meetingId, meetingId));

  const attendeeRows = await db.select().from(meetingAttendeesTable).where(eq(meetingAttendeesTable.meetingId, meetingId));
  const attendeeIds = attendeeRows.map(a => a.userId);
  const attendeeUsers = attendeeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, attendeeIds))
    : [];

  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId).filter(Boolean) as number[])];
  const assigneeUsers = assigneeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, assigneeIds))
    : [];
  const assigneeMap = new Map(assigneeUsers.map(u => [u.id, u.fullName]));

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      status: meeting.status,
      location: meeting.location ?? null,
      project: meeting.project ?? null,
      objectives: meeting.objectives ?? null,
    },
    minutes: minutes ? {
      executiveSummary: minutes.executiveSummary ?? null,
      discussionItems: minutes.discussionItems ?? null,
    } : null,
    attendees: attendeeUsers.map(u => ({ fullName: u.fullName, email: u.email ?? null })),
    decisions: decisions.map(d => ({
      title: d.title ?? null,
      content: d.content,
      status: d.status,
    })),
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ?? null,
      assigneeName: t.assigneeId ? assigneeMap.get(t.assigneeId) ?? null : null,
    })),
  };
}

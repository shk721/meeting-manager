import { eq, and, gte, lte, inArray, count, desc } from "drizzle-orm";
import { db, meetingsTable, tasksTable, meetingAttendeesTable } from "./index.js";

export interface MeetingFilterCriteria {
  status?: string;
  startDate?: string;
  endDate?: string;
  chairpersonId?: number;
  attendeeMin?: number;
  attendeeMax?: number;
}

export async function filterMeetings(
  criteria: MeetingFilterCriteria,
  limit = 20,
  offset = 0,
) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (criteria.status)        conditions.push(eq(meetingsTable.status, criteria.status));
  if (criteria.startDate)     conditions.push(gte(meetingsTable.date, criteria.startDate));
  if (criteria.endDate)       conditions.push(lte(meetingsTable.date, criteria.endDate));
  if (criteria.chairpersonId) conditions.push(eq(meetingsTable.chairpersonId, criteria.chairpersonId));

  // Attendee count filter: resolve matching meetingIds first
  if (criteria.attendeeMin !== undefined || criteria.attendeeMax !== undefined) {
    const counts = await db
      .select({ meetingId: meetingAttendeesTable.meetingId, n: count() })
      .from(meetingAttendeesTable)
      .groupBy(meetingAttendeesTable.meetingId);

    const ids = counts
      .filter(r => {
        if (criteria.attendeeMin !== undefined && r.n < criteria.attendeeMin) return false;
        if (criteria.attendeeMax !== undefined && r.n > criteria.attendeeMax) return false;
        return true;
      })
      .map(r => r.meetingId);

    if (ids.length === 0) return { data: [], total: 0 };
    conditions.push(inArray(meetingsTable.id, ids));
  }

  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(meetingsTable).where(where).orderBy(desc(meetingsTable.date)).limit(limit).offset(offset),
    db.select({ total: count() }).from(meetingsTable).where(where),
  ]);

  return { data: rows, total };
}

export interface TaskFilterCriteria {
  status?: string;
  priority?: string;
  assigneeId?: number;
  dueDateMin?: string;
  dueDateMax?: string;
}

export async function filterTasks(
  criteria: TaskFilterCriteria,
  limit = 20,
  offset = 0,
) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (criteria.status)     conditions.push(eq(tasksTable.status, criteria.status));
  if (criteria.priority)   conditions.push(eq(tasksTable.priority, criteria.priority));
  if (criteria.assigneeId) conditions.push(eq(tasksTable.assigneeId, criteria.assigneeId));
  if (criteria.dueDateMin) conditions.push(gte(tasksTable.dueDate, criteria.dueDateMin));
  if (criteria.dueDateMax) conditions.push(lte(tasksTable.dueDate, criteria.dueDateMax));

  const where = conditions.length > 0 ? and(...(conditions as any)) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(tasksTable).where(where).orderBy(desc(tasksTable.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(tasksTable).where(where),
  ]);

  return { data: rows, total };
}

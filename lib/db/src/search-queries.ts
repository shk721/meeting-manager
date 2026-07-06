import { ilike, or, eq, count, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, meetingsTable, tasksTable, usersTable } from "./index.js";

const pattern = (q: string) => `%${q}%`;

export async function searchMeetings(query: string, limit = 20, offset = 0) {
  const p = pattern(query);
  const chair = alias(usersTable, "chair");

  const where = or(
    ilike(meetingsTable.title, p),
    ilike(meetingsTable.objectives, p),
    ilike(meetingsTable.project, p),
    ilike(chair.fullName, p),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ meeting: meetingsTable })
      .from(meetingsTable)
      .leftJoin(chair, eq(meetingsTable.chairpersonId, chair.id))
      .where(where)
      .orderBy(desc(meetingsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(meetingsTable)
      .leftJoin(chair, eq(meetingsTable.chairpersonId, chair.id))
      .where(where),
  ]);

  return { data: rows.map(r => r.meeting), total };
}

export async function searchTasks(query: string, limit = 20, offset = 0) {
  const p = pattern(query);
  const assignee = alias(usersTable, "assignee");

  const where = or(
    ilike(tasksTable.title, p),
    ilike(tasksTable.description, p),
    ilike(assignee.fullName, p),
  );

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ task: tasksTable })
      .from(tasksTable)
      .leftJoin(assignee, eq(tasksTable.assigneeId, assignee.id))
      .where(where)
      .orderBy(desc(tasksTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(tasksTable)
      .leftJoin(assignee, eq(tasksTable.assigneeId, assignee.id))
      .where(where),
  ]);

  return { data: rows.map(r => r.task), total };
}

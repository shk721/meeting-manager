import { eq } from "drizzle-orm";
import {
  db, agendaItemsTable, meetingsTable, decisionsTable, tasksTable,
  deliverablesTable, agendaItemCommentsTable, usersTable,
} from "@workspace/db";

export async function getAgendaItemReportData(agendaItemId: number) {
  const [item] = await db.select().from(agendaItemsTable).where(eq(agendaItemsTable.id, agendaItemId));
  if (!item) return null;

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, item.meetingId));

  const [decisions, tasks, deliverables, comments] = await Promise.all([
    db.select().from(decisionsTable).where(eq(decisionsTable.agendaItemId, agendaItemId)),
    db.select().from(tasksTable).where(eq(tasksTable.agendaItemId, agendaItemId)),
    db.select().from(deliverablesTable).where(eq(deliverablesTable.agendaItemId, agendaItemId)),
    db.select().from(agendaItemCommentsTable)
      .where(eq(agendaItemCommentsTable.agendaItemId, agendaItemId))
      .orderBy(agendaItemCommentsTable.createdAt),
  ]);

  const allUserIds = [...new Set([
    ...tasks.map(t => t.assigneeId).filter(Boolean) as number[],
    ...comments.map(c => c.authorId).filter(Boolean) as number[],
  ])];
  const userMap = new Map<number, string>();
  for (const uid of allUserIds) {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, uid));
    if (u) userMap.set(u.id, u.fullName);
  }

  return {
    item: {
      id: item.id,
      title: item.title,
      durationMin: item.durationMin ?? null,
      status: item.status,
      outcomeStatus: (item as any).outcomeStatus ?? "pending",
      discussionNotes: (item as any).discussionNotes ?? null,
      notes: item.notes ?? null,
      orderIndex: item.orderIndex,
    },
    meeting: meeting ? { id: meeting.id, title: meeting.title, date: meeting.date } : null,
    decisions: decisions.map(d => ({
      title: d.title ?? null,
      content: d.content,
      status: d.status,
      dueDate: d.dueDate ?? null,
    })),
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ?? null,
      assigneeName: t.assigneeId ? userMap.get(t.assigneeId) ?? null : null,
      completionPercent: t.completionPercent ?? 0,
    })),
    deliverables: deliverables.map(d => ({
      title: d.title,
      status: d.status,
      progressPercent: d.progressPercent ?? 0,
      dueDate: d.dueDate ?? null,
    })),
    comments: comments.map(c => ({
      content: c.content,
      authorName: c.authorId ? userMap.get(c.authorId) ?? null : null,
      createdAt: c.createdAt.toISOString(),
    })),
  };
}

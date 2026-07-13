import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  agendaItemsTable, meetingsTable, usersTable,
  decisionsTable, tasksTable, deliverablesTable,
  agendaItemCommentsTable,
} from "@workspace/db/schema";
import { formatUser } from "./users";

const router: IRouter = Router();

// ─── GET /agenda-items ────────────────────────────────────────────────────────

router.get("/agenda-items", async (req, res) => {
  const { meetingId, status } = req.query as Record<string, string | undefined>;

  const conditions = [];
  if (meetingId) {
    const mid = parseInt(meetingId, 10);
    if (!isNaN(mid)) conditions.push(eq(agendaItemsTable.meetingId, mid));
  }
  if (status) conditions.push(eq(agendaItemsTable.status, status));

  const rows = await db.select().from(agendaItemsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(agendaItemsTable.orderIndex);

  res.json(rows);
});

// ─── POST /agenda-items ───────────────────────────────────────────────────────

router.post("/agenda-items", async (req, res) => {
  const parsed = z.object({
    meetingId: z.number().int(),
    title: z.string().min(1),
    orderIndex: z.number().int().optional(),
    durationMin: z.number().int().optional(),
    presenterId: z.number().int().optional(),
    status: z.string().optional(),
    outcomeStatus: z.string().optional(),
    notes: z.string().optional(),
    discussionNotes: z.string().optional(),
    topicId: z.number().int().nullable().optional(),
    carryForward: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [item] = await db.insert(agendaItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

// ─── GET /agenda-items/:id  (full detail with all linked artifacts) ───────────

router.get("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [item] = await db.select().from(agendaItemsTable)
    .where(eq(agendaItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }

  const [decisions, tasks, deliverables, comments] = await Promise.all([
    db.select().from(decisionsTable).where(eq(decisionsTable.agendaItemId, id)),
    db.select().from(tasksTable).where(eq(tasksTable.agendaItemId, id)),
    db.select().from(deliverablesTable).where(eq(deliverablesTable.agendaItemId, id)),
    db.select().from(agendaItemCommentsTable)
      .where(eq(agendaItemCommentsTable.agendaItemId, id))
      .orderBy(agendaItemCommentsTable.createdAt),
  ]);

  // Enrich comments with author info
  const commentsWithAuthors = await Promise.all(comments.map(async c => {
    const [author] = c.authorId
      ? await db.select().from(usersTable).where(eq(usersTable.id, c.authorId))
      : [null];
    return {
      id: c.id, agendaItemId: c.agendaItemId, content: c.content,
      author: author ? formatUser(author) : null,
      createdAt: c.createdAt.toISOString(),
    };
  }));

  // Enrich tasks with assignee
  const tasksWithAssignees = await Promise.all(tasks.map(async t => {
    const [assignee] = t.assigneeId
      ? await db.select().from(usersTable).where(eq(usersTable.id, t.assigneeId))
      : [null];
    return {
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      completionPercent: t.completionPercent, dueDate: t.dueDate ?? null,
      assignee: assignee ? formatUser(assignee) : null,
      createdAt: t.createdAt.toISOString(),
    };
  }));

  res.json({
    ...item,
    decisions: decisions.map(d => ({
      id: d.id, content: d.content, title: d.title ?? null,
      status: d.status, dueDate: d.dueDate ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    tasks: tasksWithAssignees,
    deliverables: deliverables.map(d => ({
      id: d.id, title: d.title, status: d.status,
      progressPercent: d.progressPercent, dueDate: d.dueDate ?? null,
    })),
    comments: commentsWithAuthors,
  });
});

// ─── PATCH /agenda-items/:id ──────────────────────────────────────────────────

router.patch("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({
    title: z.string().optional(),
    orderIndex: z.number().int().optional(),
    durationMin: z.number().int().nullable().optional(),
    presenterId: z.number().int().nullable().optional(),
    status: z.string().optional(),
    outcomeStatus: z.string().optional(),
    notes: z.string().nullable().optional(),
    discussionNotes: z.string().nullable().optional(),
    topicId: z.number().int().nullable().optional(),
    deferredToMeetingId: z.number().int().nullable().optional(),
    carryForward: z.boolean().optional(),
    decidedAt: z.string().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const [updated] = await db.update(agendaItemsTable).set(parsed.data as any)
    .where(eq(agendaItemsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── DELETE /agenda-items/:id ─────────────────────────────────────────────────

router.delete("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // cascade deletes agenda_item_comments; decisions/tasks/deliverables set to null
  await db.delete(agendaItemsTable).where(eq(agendaItemsTable.id, id));
  res.json({ success: true });
});

// ─── POST /agenda-items/:id/comments ─────────────────────────────────────────

router.post("/agenda-items/:id/comments", async (req, res) => {
  const agendaItemId = parseInt(req.params.id, 10);
  if (isNaN(agendaItemId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = z.object({ content: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "content is required" }); return; }

  const authorId = (req.session as any).userId ?? null;
  const [comment] = await db.insert(agendaItemCommentsTable)
    .values({ agendaItemId, content: parsed.data.content, authorId })
    .returning();

  const [author] = comment.authorId
    ? await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId))
    : [null];

  res.status(201).json({
    id: comment.id, agendaItemId: comment.agendaItemId, content: comment.content,
    author: author ? formatUser(author) : null,
    createdAt: comment.createdAt.toISOString(),
  });
});

// ─── DELETE /agenda-items/:id/comments/:commentId ────────────────────────────

router.delete("/agenda-items/:id/comments/:commentId", async (req, res) => {
  const commentId = parseInt(req.params.commentId, 10);
  if (isNaN(commentId)) { res.status(400).json({ error: "Invalid commentId" }); return; }
  await db.delete(agendaItemCommentsTable)
    .where(eq(agendaItemCommentsTable.id, commentId));
  res.sendStatus(204);
});

// ─── Migration: meetings.agendaItems text[] → agenda_items rows ───────────────

router.post("/agenda-items/migrate/from-meetings", async (_req, res) => {
  const meetings = await db.select().from(meetingsTable) as any[];
  let created = 0, skipped = 0;
  for (const meeting of meetings) {
    const legacyItems: string[] = meeting.agendaItems ?? [];
    if (!legacyItems.length) continue;
    const existing = await db.select().from(agendaItemsTable)
      .where(eq(agendaItemsTable.meetingId, meeting.id));
    if (existing.length > 0) { skipped++; continue; }
    for (let i = 0; i < legacyItems.length; i++) {
      await db.insert(agendaItemsTable).values({ meetingId: meeting.id, title: legacyItems[i], orderIndex: i });
    }
    created++;
  }
  res.json({ meetingsMigrated: created, meetingsSkipped: skipped });
});

export default router;

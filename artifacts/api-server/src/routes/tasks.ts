import { Router, type IRouter } from "express";
import { eq, and, or, ilike, lte, gte } from "drizzle-orm";
import { db, tasksTable, usersTable, taskCommentsTable, taskChangelogTable } from "@workspace/db";
import {
  GetTasksQueryParams, CreateTaskBody,
  GetTaskParams, UpdateTaskParams, UpdateTaskBody,
  AddTaskCommentParams, AddTaskCommentBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";
import { createNotification } from "@workspace/db/notifications-queries";
import { auditLog } from "../lib/audit-log";

const router: IRouter = Router();

async function formatTask(task: typeof tasksTable.$inferSelect) {
  const [assignee] = task.assigneeId
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId))
    : [null];
  return {
    id: task.id, title: task.title, description: task.description ?? null,
    status: task.status, priority: task.priority,
    completionPercent: task.completionPercent, dueDate: task.dueDate ?? null,
    agendaItem: task.agendaItem ?? null,
    meetingId: task.meetingId ?? null, decisionId: task.decisionId ?? null,
    componentId: task.componentId ?? null, committeeId: task.committeeId ?? null,
    assignee: assignee ? formatUser(assignee) : null,
    tags: task.tags ?? [],
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const query = GetTasksQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions = [];
  if (query.data.status) conditions.push(eq(tasksTable.status, query.data.status));
  if (query.data.priority) conditions.push(eq(tasksTable.priority, query.data.priority));
  if (query.data.assigneeId) conditions.push(eq(tasksTable.assigneeId, query.data.assigneeId));
  if (query.data.meetingId) conditions.push(eq(tasksTable.meetingId, query.data.meetingId));
  const componentId = Number((query.data as any).componentId);
  if (!isNaN(componentId) && componentId > 0) conditions.push(eq(tasksTable.componentId, componentId));
  const committeeId = Number((query.data as any).committeeId);
  if (!isNaN(committeeId) && committeeId > 0) conditions.push(eq(tasksTable.committeeId, committeeId));
  if (query.data.search) {
    const s = `%${query.data.search}%`;
    conditions.push(or(ilike(tasksTable.title, s), ilike(tasksTable.description, s))!);
  }
  if (query.data.dueBefore) conditions.push(lte(tasksTable.dueDate, query.data.dueBefore));
  if (query.data.dueAfter) conditions.push(gte(tasksTable.dueDate, query.data.dueAfter));

  const tasks = await db.select().from(tasksTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(tasksTable.createdAt);

  const results = await Promise.all(tasks.map(formatTask));
  res.json(results);
});

const VALID_TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled', 'on_hold'] as const;
const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (!parsed.data.title.trim()) {
    res.status(400).json({ error: "Title cannot be empty" }); return;
  }
  if (!VALID_TASK_STATUSES.includes(parsed.data.status as any)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_TASK_STATUSES.join(', ')}` }); return;
  }
  if (!VALID_TASK_PRIORITIES.includes(parsed.data.priority as any)) {
    res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_TASK_PRIORITIES.join(', ')}` }); return;
  }

  const sessionUserId = (req.session as any).userId;
  const { tags, ...rest } = parsed.data;
  const [task] = await db.insert(tasksTable).values({ ...rest, tags: tags ?? [] }).returning();

  auditLog({ entityType: "task", entityId: task.id, action: "create", actorId: sessionUserId });

  if (task.assigneeId && task.assigneeId !== sessionUserId) {
    await createNotification({
      userId: task.assigneeId,
      type: "task_assigned",
      title: "تم تعيين مهمة لك",
      message: `تم تعيينك على المهمة «${task.title}»`,
      relatedId: task.id,
      relatedType: "task",
      metadata: { taskId: task.id },
    });
  }

  res.status(201).json(await formatTask(task));
});

router.get("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  const [assignee] = task.assigneeId
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId))
    : [null];

  const comments = await db.select().from(taskCommentsTable)
    .where(eq(taskCommentsTable.taskId, id))
    .orderBy(taskCommentsTable.createdAt);

  const commentsWithAuthors = await Promise.all(comments.map(async c => {
    const [author] = c.authorId
      ? await db.select().from(usersTable).where(eq(usersTable.id, c.authorId))
      : [null];
    return { id: c.id, taskId: c.taskId, content: c.content,
      author: author ? formatUser(author) : null, createdAt: c.createdAt.toISOString() };
  }));

  const changelog = await db.select().from(taskChangelogTable)
    .where(eq(taskChangelogTable.taskId, id))
    .orderBy(taskChangelogTable.createdAt);

  const changelogWithUsers = await Promise.all(changelog.map(async entry => {
    const [changedBy] = entry.changedById
      ? await db.select().from(usersTable).where(eq(usersTable.id, entry.changedById))
      : [null];
    return { id: entry.id, taskId: entry.taskId, field: entry.field,
      oldValue: entry.oldValue ?? null, newValue: entry.newValue ?? null,
      changedBy: changedBy ? formatUser(changedBy) : null,
      createdAt: entry.createdAt.toISOString() };
  }));

  res.json({
    id: task.id, title: task.title, description: task.description ?? null,
    status: task.status, priority: task.priority,
    completionPercent: task.completionPercent, dueDate: task.dueDate ?? null,
    agendaItem: task.agendaItem ?? null,
    meetingId: task.meetingId ?? null, decisionId: task.decisionId ?? null,
    componentId: task.componentId ?? null, committeeId: task.committeeId ?? null,
    assignee: assignee ? formatUser(assignee) : null, tags: task.tags ?? [],
    comments: commentsWithAuthors, changelog: changelogWithUsers,
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const sessionUserId = (req.session as any).userId;

  // Record changelog for changed fields
  const trackFields = ["status", "priority", "completionPercent", "assigneeId", "dueDate"] as const;
  const changeEntries: any[] = [];
  for (const field of trackFields) {
    if (parsed.data[field] !== undefined && parsed.data[field] !== (existing as any)[field]) {
      changeEntries.push({
        taskId: id, field,
        oldValue: String((existing as any)[field] ?? ""),
        newValue: String(parsed.data[field] ?? ""),
        changedById: sessionUserId ?? null,
      });
    }
  }
  if (changeEntries.length > 0) {
    await db.insert(taskChangelogTable).values(changeEntries);
  }

  const { tags, ...rest } = parsed.data;
  const updateData: any = { ...rest };
  if (tags !== undefined) updateData.tags = tags;

  const [task] = await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, id)).returning();

  if (changeEntries.length > 0) {
    const changes: Record<string, [unknown, unknown]> = {};
    for (const e of changeEntries) changes[e.field] = [e.oldValue, e.newValue];
    auditLog({ entityType: "task", entityId: id, action: "update", actorId: sessionUserId, changes });
  }

  // Notify new assignee if assigneeId changed
  const newAssigneeId = parsed.data.assigneeId;
  if (newAssigneeId && newAssigneeId !== existing.assigneeId && newAssigneeId !== sessionUserId) {
    await createNotification({
      userId: newAssigneeId,
      type: "task_assigned",
      title: "تم تعيين مهمة لك",
      message: `تم تعيينك على المهمة «${task.title}»`,
      relatedId: task.id,
      relatedType: "task",
      metadata: { taskId: task.id },
    });
  }

  res.json(await formatTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionUserId = (req.session as any).userId;
  await db.delete(taskCommentsTable).where(eq(taskCommentsTable.taskId, id));
  await db.delete(taskChangelogTable).where(eq(taskChangelogTable.taskId, id));
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
  auditLog({ entityType: "task", entityId: id, action: "delete", actorId: sessionUserId });
  res.sendStatus(204);
});

router.post("/tasks/:id/comments", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const taskId = parseInt(raw, 10);
  const sessionUserId = (req.session as any).userId;

  const parsed = AddTaskCommentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [comment] = await db.insert(taskCommentsTable)
    .values({ taskId, content: parsed.data.content, authorId: sessionUserId ?? null })
    .returning();

  const [author] = comment.authorId
    ? await db.select().from(usersTable).where(eq(usersTable.id, comment.authorId))
    : [null];

  res.status(201).json({
    id: comment.id, taskId: comment.taskId, content: comment.content,
    author: author ? formatUser(author) : null,
    createdAt: comment.createdAt.toISOString(),
  });
});

export default router;

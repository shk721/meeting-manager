import { Router, type IRouter } from "express";
import { eq, and, lte, gte } from "drizzle-orm";
import { db, tasksTable, usersTable, taskCommentsTable, taskChangelogTable } from "@workspace/db";
import {
  GetTasksQueryParams, CreateTaskBody,
  GetTaskParams, UpdateTaskParams, UpdateTaskBody,
  AddTaskCommentParams, AddTaskCommentBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";

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
    componentId: task.componentId ?? null,
    assignee: assignee ? formatUser(assignee) : null,
    tags: task.tags ?? [],
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const query = GetTasksQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  let tasks = await db.select().from(tasksTable).orderBy(tasksTable.createdAt);

  if (query.data.status) tasks = tasks.filter(t => t.status === query.data.status);
  if (query.data.priority) tasks = tasks.filter(t => t.priority === query.data.priority);
  if (query.data.assigneeId) tasks = tasks.filter(t => t.assigneeId === query.data.assigneeId);
  if (query.data.meetingId) tasks = tasks.filter(t => t.meetingId === query.data.meetingId);
  if ((query.data as any).componentId) tasks = tasks.filter(t => t.componentId === Number((query.data as any).componentId));
  if (query.data.search) {
    const s = query.data.search.toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || (t.description ?? "").toLowerCase().includes(s));
  }
  if (query.data.dueBefore) tasks = tasks.filter(t => t.dueDate && t.dueDate <= query.data.dueBefore!);
  if (query.data.dueAfter) tasks = tasks.filter(t => t.dueDate && t.dueDate >= query.data.dueAfter!);

  const results = await Promise.all(tasks.map(formatTask));
  res.json(results);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { tags, ...rest } = parsed.data;
  const [task] = await db.insert(tasksTable).values({ ...rest, tags: tags ?? [] }).returning();
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
  res.json(await formatTask(task));
});

router.delete("/tasks/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(taskCommentsTable).where(eq(taskCommentsTable.taskId, id));
  await db.delete(taskChangelogTable).where(eq(taskChangelogTable.taskId, id));
  await db.delete(tasksTable).where(eq(tasksTable.id, id));
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

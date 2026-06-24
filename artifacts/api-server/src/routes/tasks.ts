import { Router, type IRouter } from "express";
import { and, eq, ilike, lte, gte, or } from "drizzle-orm";
import { db, tasksTable, usersTable, taskCommentsTable, taskChangelogTable } from "@workspace/db";
import {
  GetTasksQueryParams, CreateTaskBody,
  UpdateTaskBody,
  AddTaskCommentBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";
import { requireRole } from "../middleware/auth";
import { sendTaskAssignedEmail } from "../lib/mailer";

const router: IRouter = Router();

async function formatTask(task: typeof tasksTable.$inferSelect) {
  const [assignee] = task.assigneeId
    ? await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId))
    : [null];
  return {
    id: task.id, title: task.title, description: task.description ?? null,
    status: task.status, priority: task.priority,
    completionPercent: task.completionPercent, dueDate: task.dueDate ?? null,
    meetingId: task.meetingId ?? null, decisionId: task.decisionId ?? null,
    assignee: assignee ? formatUser(assignee) : null,
    tags: task.tags ?? [],
    createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/tasks", async (req, res): Promise<void> => {
  const query = GetTasksQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const { status, priority, assigneeId, meetingId, search, dueBefore, dueAfter } = query.data;

  const searchFilter = search
    ? or(
        ilike(tasksTable.title, `%${search}%`),
        ilike(tasksTable.description, `%${search}%`),
      )
    : undefined;

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(
      status ? eq(tasksTable.status, status) : undefined,
      priority ? eq(tasksTable.priority, priority) : undefined,
      assigneeId ? eq(tasksTable.assigneeId, assigneeId) : undefined,
      meetingId ? eq(tasksTable.meetingId, meetingId) : undefined,
      dueBefore ? lte(tasksTable.dueDate, dueBefore) : undefined,
      dueAfter ? gte(tasksTable.dueDate, dueAfter) : undefined,
      searchFilter,
    ))
    .orderBy(tasksTable.createdAt);

  const results = await Promise.all(tasks.map(formatTask));
  res.json(results);
});

router.post("/tasks", async (req, res): Promise<void> => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { tags, ...rest } = parsed.data;
  const [task] = await db.insert(tasksTable).values({ ...rest, tags: tags ?? [] }).returning();

  // Notify new assignee
  if (task.assigneeId) {
    const [assignee] = await db.select().from(usersTable).where(eq(usersTable.id, task.assigneeId));
    if (assignee?.email) {
      sendTaskAssignedEmail({
        toEmail: assignee.email,
        toName: assignee.fullName,
        taskTitle: task.title,
        assignerName: "النظام",
      }).catch(() => {});
    }
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

  // Notify new assignee if assigneeId changed
  if (
    parsed.data.assigneeId !== undefined &&
    parsed.data.assigneeId !== existing.assigneeId &&
    parsed.data.assigneeId != null
  ) {
    const [[assignee], [changer]] = await Promise.all([
      db.select().from(usersTable).where(eq(usersTable.id, parsed.data.assigneeId)),
      sessionUserId
        ? db.select().from(usersTable).where(eq(usersTable.id, sessionUserId))
        : Promise.resolve([null]),
    ]);
    if (assignee?.email) {
      sendTaskAssignedEmail({
        toEmail: assignee.email,
        toName: assignee.fullName,
        taskTitle: task.title,
        assignerName: changer?.fullName ?? "مستخدم",
      }).catch(() => {});
    }
  }

  res.json(await formatTask(task));
});

router.delete("/tasks/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
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

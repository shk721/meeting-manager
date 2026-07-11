import { and, eq, gte, isNotNull } from "drizzle-orm";
import { db, tasksTable, notificationsTable } from "@workspace/db";
import { createNotification } from "@workspace/db/notifications-queries";
import { logger } from "./logger";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function runDeadlineCheck() {
  const today = todayStr();
  const tomorrow = tomorrowStr();

  const dueTasks = await db
    .select()
    .from(tasksTable)
    .where(and(isNotNull(tasksTable.assigneeId), isNotNull(tasksTable.dueDate)));

  const relevant = dueTasks.filter(
    t => (t.dueDate === today || t.dueDate === tomorrow) &&
      t.status !== "completed" && t.status !== "done",
  );

  if (relevant.length === 0) return;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const alreadySent = await db
    .select({ relatedId: notificationsTable.relatedId })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.relatedType, "task"),
        eq(notificationsTable.type, "task_due_soon"),
        gte(notificationsTable.createdAt, startOfDay),
      ),
    );

  const sentIds = new Set(alreadySent.map(r => r.relatedId));

  let sent = 0;
  for (const task of relevant) {
    if (sentIds.has(task.id)) continue;
    const isDueToday = task.dueDate === today;
    await createNotification({
      userId: task.assigneeId!,
      type: "task_due_soon",
      title: isDueToday ? "مهمة تستحق اليوم" : "مهمة تستحق غداً",
      message: isDueToday
        ? `المهمة «${task.title}» مستحقة اليوم`
        : `المهمة «${task.title}» مستحقة غداً`,
      relatedId: task.id,
      relatedType: "task",
      metadata: { dueDate: task.dueDate, taskId: task.id },
    });
    sent++;
  }

  if (sent > 0) logger.info({ sent }, "Deadline notifications sent");
}

export function startDeadlineNotifier() {
  runDeadlineCheck().catch(err => logger.error({ err }, "Deadline check failed"));
  setInterval(() => {
    runDeadlineCheck().catch(err => logger.error({ err }, "Deadline check failed"));
  }, 6 * 60 * 60 * 1000);
}

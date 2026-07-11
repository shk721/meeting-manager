import { eq, inArray } from "drizzle-orm";
import {
  db, plansTable, planPhasesTable, tasksTable, decisionsTable, usersTable,
} from "@workspace/db";

export async function getPlanReportData(planId: number) {
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
  if (!plan) return null;

  const phases = await db.select().from(planPhasesTable)
    .where(eq(planPhasesTable.planId, planId))
    .orderBy(planPhasesTable.orderIndex);

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.planId, planId));
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.planId, planId));

  const assigneeIds = [...new Set(tasks.map(t => t.assigneeId).filter(Boolean) as number[])];
  const assigneeUsers = assigneeIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, assigneeIds))
    : [];
  const assigneeMap = new Map(assigneeUsers.map(u => [u.id, u.fullName]));

  const phaseMap = new Map(phases.map(ph => [ph.id, ph.title]));

  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const phasesWithCounts = phases.map(ph => {
    const phaseTasks = tasks.filter(t => t.phaseId === ph.id);
    return {
      id: ph.id,
      title: ph.title,
      status: ph.status,
      startDate: ph.startDate ?? null,
      endDate: ph.endDate ?? null,
      taskCount: phaseTasks.length,
      completedTaskCount: phaseTasks.filter(t => t.status === "completed").length,
    };
  });

  return {
    plan: {
      id: plan.id,
      title: plan.title,
      description: plan.description ?? null,
      type: plan.type,
      status: plan.status,
      startDate: plan.startDate ?? null,
      endDate: plan.endDate ?? null,
      notes: plan.notes ?? null,
    },
    progress,
    phases: phasesWithCounts,
    tasks: tasks.map(t => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ?? null,
      assigneeName: t.assigneeId ? assigneeMap.get(t.assigneeId) ?? null : null,
      phaseName: t.phaseId ? phaseMap.get(t.phaseId) ?? null : null,
    })),
    decisions: decisions.map(d => ({
      title: d.title ?? null,
      content: d.content,
      status: d.status,
    })),
  };
}

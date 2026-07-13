import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, decisionsTable, meetingsTable, usersTable, tasksTable, governanceContextsTable, plansTable } from "@workspace/db";
import { GetDecisionsQueryParams, CreateDecisionBody, UpdateDecisionParams, UpdateDecisionBody } from "@workspace/api-zod";
import { formatUser } from "./users";
import { auditLog } from "../lib/audit-log";

const router: IRouter = Router();

function fmt(d: typeof decisionsTable.$inferSelect) {
  return {
    id: d.id,
    meetingId: d.meetingId ?? null,
    governanceContextId: d.governanceContextId ?? null,
    agendaItemId: d.agendaItemId ?? null,
    title: d.title ?? null,
    agendaItem: d.agendaItem ?? null,
    content: d.content,
    notes: d.notes ?? null,
    status: d.status ?? "approved",
    approvedBy: d.approvedBy ?? null,
    dueDate: d.dueDate ?? null,
    assignedTo: d.assignedTo ?? null,
    decisionType: d.decisionType ?? null,
    rationale: d.rationale ?? null,
    organizationId: d.organizationId ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/decisions", async (req, res): Promise<void> => {
  const query = GetDecisionsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const conditions = [];
  if (query.data.meetingId) conditions.push(eq(decisionsTable.meetingId, query.data.meetingId));
  const decisions = await db.select().from(decisionsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(decisionsTable.createdAt);
  res.json(decisions.map(fmt));
});

router.get("/decisions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [decision] = await db.select().from(decisionsTable).where(eq(decisionsTable.id, id));
  if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }

  const [meeting, assignee, approver, govContext, plan, relatedTasks] = await Promise.all([
    decision.meetingId
      ? db.select().from(meetingsTable).where(eq(meetingsTable.id, decision.meetingId)).then(r => r[0] ?? null)
      : Promise.resolve(null),
    decision.assignedTo
      ? db.select().from(usersTable).where(eq(usersTable.id, decision.assignedTo)).then(r => r[0] ?? null)
      : Promise.resolve(null),
    decision.approvedBy
      ? db.select().from(usersTable).where(eq(usersTable.id, decision.approvedBy)).then(r => r[0] ?? null)
      : Promise.resolve(null),
    decision.governanceContextId
      ? db.select().from(governanceContextsTable).where(eq(governanceContextsTable.id, decision.governanceContextId)).then(r => r[0] ?? null)
      : Promise.resolve(null),
    (decision as any).planId
      ? db.select().from(plansTable).where(eq(plansTable.id, (decision as any).planId)).then(r => r[0] ?? null)
      : Promise.resolve(null),
    db.select().from(tasksTable).where(eq(tasksTable.decisionId, id)),
  ]);

  res.json({
    ...fmt(decision),
    meeting: meeting ? { id: meeting.id, title: meeting.title, date: meeting.date } : null,
    assignee: assignee ? formatUser(assignee) : null,
    approver: approver ? formatUser(approver) : null,
    governanceContext: govContext ? { id: govContext.id, name: govContext.name, type: govContext.type } : null,
    plan: plan ? { id: (plan as any).id, title: (plan as any).title } : null,
    tasks: relatedTasks.map(t => ({
      id: t.id, title: t.title, status: t.status, priority: t.priority,
      dueDate: t.dueDate ?? null, completionPercent: t.completionPercent,
    })),
  });
});

router.post("/decisions", async (req, res): Promise<void> => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [d] = await db.insert(decisionsTable).values(parsed.data).returning();
  const sessionUserId = (req.session as any).userId;
  auditLog({ entityType: "decision", entityId: d.id, action: "create", actorId: sessionUserId });
  res.status(201).json(fmt(d));
});

router.patch("/decisions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateDecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [d] = await db.update(decisionsTable).set(parsed.data).where(eq(decisionsTable.id, id)).returning();
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  const sessionUserId = (req.session as any).userId;
  auditLog({ entityType: "decision", entityId: id, action: "update", actorId: sessionUserId });
  res.json(fmt(d));
});

router.delete("/decisions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(decisionsTable).where(eq(decisionsTable.id, id));
  const sessionUserId = (req.session as any).userId;
  auditLog({ entityType: "decision", entityId: id, action: "delete", actorId: sessionUserId });
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { deliverablesTable, tasksTable } from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Deliverables ─────────────────────────────────────────────────────────────

router.get("/deliverables", async (req, res) => {
  const { planId, phaseId, workstreamId, status, ownerId } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(deliverablesTable)
    .orderBy(deliverablesTable.orderIndex);

  if (planId) rows = rows.filter(r => r.planId === parseInt(planId, 10));
  if (phaseId) rows = rows.filter(r => r.phaseId === parseInt(phaseId, 10));
  if (workstreamId) rows = rows.filter(r => r.workstreamId === parseInt(workstreamId, 10));
  if (status) rows = rows.filter(r => r.status === status);
  if (ownerId) rows = rows.filter(r => r.ownerId === parseInt(ownerId, 10));

  res.json(rows);
});

router.post("/deliverables", async (req, res) => {
  const parsed = z.object({
    planId: z.number().int(),
    phaseId: z.number().int().optional(),
    workstreamId: z.number().int().optional(),
    title: z.string().min(1),
    acceptanceCriteria: z.string().optional(),
    status: z.string().optional(),
    ownerId: z.number().int().optional(),
    reviewerId: z.number().int().optional(),
    dueDate: z.string().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    orderIndex: z.number().int().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [deliverable] = await db.insert(deliverablesTable).values(parsed.data).returning();
  res.status(201).json(deliverable);
});

router.get("/deliverables/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [deliverable] = await db.select().from(deliverablesTable)
    .where(eq(deliverablesTable.id, id));
  if (!deliverable) { res.status(404).json({ error: "Not found" }); return; }

  const linkedTasks = await db.select().from(tasksTable)
    .where(eq(tasksTable.deliverableId, id));

  res.json({ ...deliverable, tasks: linkedTasks });
});

router.patch("/deliverables/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = z.object({
    title: z.string().optional(),
    acceptanceCriteria: z.string().nullable().optional(),
    status: z.string().optional(),
    ownerId: z.number().int().nullable().optional(),
    reviewerId: z.number().int().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    progressPercent: z.number().int().min(0).max(100).optional(),
    orderIndex: z.number().int().optional(),
    phaseId: z.number().int().nullable().optional(),
    workstreamId: z.number().int().nullable().optional(),
    submittedAt: z.string().nullable().optional(),
    acceptedAt: z.string().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [updated] = await db.update(deliverablesTable).set(parsed.data as any)
    .where(eq(deliverablesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/deliverables/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(deliverablesTable).where(eq(deliverablesTable.id, id));
  res.json({ success: true });
});

export default router;

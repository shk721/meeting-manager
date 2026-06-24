import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, decisionsTable } from "@workspace/db";
import { GetDecisionsQueryParams, CreateDecisionBody, UpdateDecisionBody } from "@workspace/api-zod";
import { requireRole } from "../middleware/auth";

const router: IRouter = Router();

function fmt(d: typeof decisionsTable.$inferSelect) {
  return {
    id: d.id, meetingId: d.meetingId, agendaItem: d.agendaItem ?? null,
    content: d.content, notes: d.notes ?? null, createdAt: d.createdAt.toISOString(),
  };
}

router.get("/decisions", async (req, res): Promise<void> => {
  const query = GetDecisionsQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  let decisions = await db.select().from(decisionsTable).orderBy(decisionsTable.createdAt);
  if (query.data.meetingId) {
    decisions = decisions.filter(d => d.meetingId === query.data.meetingId);
  }
  res.json(decisions.map(fmt));
});

router.post("/decisions", async (req, res): Promise<void> => {
  const parsed = CreateDecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [d] = await db.insert(decisionsTable).values(parsed.data).returning();
  res.status(201).json(fmt(d));
});

router.patch("/decisions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateDecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [d] = await db.update(decisionsTable).set(parsed.data).where(eq(decisionsTable.id, id)).returning();
  if (!d) { res.status(404).json({ error: "Not found" }); return; }
  res.json(fmt(d));
});

router.delete("/decisions/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(decisionsTable).where(eq(decisionsTable.id, parseInt(raw, 10)));
  res.sendStatus(204);
});

export default router;

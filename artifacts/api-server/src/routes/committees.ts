import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  committeesTable, committeeRepresentativesTable, committeeSessionsTable,
  committeeDecisionsTable, committeeOutgoingTable,
  usersTable, tasksTable,
} from "@workspace/db";
import { formatUser } from "./users";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function formatRepresentative(rep: typeof committeeRepresentativesTable.$inferSelect) {
  const [user] = rep.userId
    ? await db.select().from(usersTable).where(eq(usersTable.id, rep.userId))
    : [null];
  return {
    id: rep.id, committeeId: rep.committeeId, role: rep.role,
    userId: rep.userId ?? null,
    user: user ? formatUser(user) : null,
    externalName: rep.externalName ?? null,
    externalEmail: rep.externalEmail ?? null,
    createdAt: rep.createdAt.toISOString(),
  };
}

async function getCommitteeFull(committeeId: number) {
  const [committee] = await db.select().from(committeesTable).where(eq(committeesTable.id, committeeId));
  if (!committee) return null;

  const representatives = await db.select().from(committeeRepresentativesTable)
    .where(eq(committeeRepresentativesTable.committeeId, committeeId));
  const sessions = await db.select().from(committeeSessionsTable)
    .where(eq(committeeSessionsTable.committeeId, committeeId))
    .orderBy(committeeSessionsTable.date);
  const decisions = await db.select().from(committeeDecisionsTable)
    .where(eq(committeeDecisionsTable.committeeId, committeeId))
    .orderBy(committeeDecisionsTable.createdAt);
  const outgoing = await db.select().from(committeeOutgoingTable)
    .where(eq(committeeOutgoingTable.committeeId, committeeId))
    .orderBy(committeeOutgoingTable.createdAt);
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.committeeId, committeeId));

  return {
    ...committee,
    representatives: await Promise.all(representatives.map(formatRepresentative)),
    sessions,
    decisions,
    outgoing,
    tasks,
  };
}

async function deleteCommitteeCascade(committeeId: number) {
  const decisionTasks = await db.select().from(tasksTable).where(eq(tasksTable.committeeId, committeeId));
  if (decisionTasks.length > 0) {
    await db.delete(tasksTable).where(eq(tasksTable.committeeId, committeeId));
  }
  await db.delete(committeeRepresentativesTable).where(eq(committeeRepresentativesTable.committeeId, committeeId));
  await db.delete(committeeSessionsTable).where(eq(committeeSessionsTable.committeeId, committeeId));
  await db.delete(committeeDecisionsTable).where(eq(committeeDecisionsTable.committeeId, committeeId));
  await db.delete(committeeOutgoingTable).where(eq(committeeOutgoingTable.committeeId, committeeId));
  await db.delete(committeesTable).where(eq(committeesTable.id, committeeId));
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateCommitteeBody = z.object({
  name: z.string().min(1),
  type: z.enum(["external", "internal"]).optional(),
  organization: z.string().optional(),
  description: z.string().optional(),
  frequency: z.string().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

const UpdateCommitteeBody = CreateCommitteeBody.partial();

const RepresentativeBody = z.object({
  userId: z.number().int().optional(),
  externalName: z.string().optional(),
  externalEmail: z.string().email().optional(),
  role: z.enum(["head", "member", "alternate"]).optional(),
}).refine(d => d.userId !== undefined || (d.externalName && d.externalName.length > 0), {
  message: "Either userId or externalName is required",
});

const UpdateRepresentativeBody = z.object({
  userId: z.number().int().nullable().optional(),
  externalName: z.string().optional(),
  externalEmail: z.string().email().optional(),
  role: z.enum(["head", "member", "alternate"]).optional(),
});

const SessionBody = z.object({
  title: z.string().min(1),
  date: z.string().min(1),
  location: z.string().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

const UpdateSessionBody = SessionBody.partial();

const DecisionBody = z.object({
  sessionId: z.number().int().optional(),
  content: z.string().min(1),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
  assigneeId: z.number().int().optional(),
});

const UpdateDecisionBody = z.object({
  sessionId: z.number().int().optional(),
  content: z.string().min(1).optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

const OutgoingBody = z.object({
  sessionId: z.number().int().optional(),
  subject: z.string().min(1),
  content: z.string().optional(),
  sentDate: z.string().optional(),
});

// ─── Committees ───────────────────────────────────────────────────────────────

router.get("/committees", async (_req, res): Promise<void> => {
  const committees = await db.select().from(committeesTable).orderBy(committeesTable.name);
  res.json(committees);
});

router.post("/committees", async (req, res): Promise<void> => {
  const parsed = CreateCommitteeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [committee] = await db.insert(committeesTable).values(parsed.data).returning();
  res.status(201).json(committee);
});

router.get("/committees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const committee = await getCommitteeFull(id);
  if (!committee) { res.status(404).json({ error: "Committee not found" }); return; }
  res.json(committee);
});

router.patch("/committees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateCommitteeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [committee] = await db.update(committeesTable).set(parsed.data).where(eq(committeesTable.id, id)).returning();
  if (!committee) { res.status(404).json({ error: "Committee not found" }); return; }
  res.json(committee);
});

router.delete("/committees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await deleteCommitteeCascade(id);
  res.sendStatus(204);
});

// ─── Representatives ─────────────────────────────────────────────────────────

router.post("/committees/:id/representatives", async (req, res): Promise<void> => {
  const committeeId = parseInt(req.params.id, 10);
  if (isNaN(committeeId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = RepresentativeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rep] = await db.insert(committeeRepresentativesTable)
    .values({ ...parsed.data, committeeId }).returning();
  res.status(201).json(await formatRepresentative(rep));
});

router.patch("/committee-representatives/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateRepresentativeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [rep] = await db.update(committeeRepresentativesTable).set(parsed.data)
    .where(eq(committeeRepresentativesTable.id, id)).returning();
  if (!rep) { res.status(404).json({ error: "Representative not found" }); return; }
  res.json(await formatRepresentative(rep));
});

router.delete("/committee-representatives/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(committeeRepresentativesTable).where(eq(committeeRepresentativesTable.id, id));
  res.sendStatus(204);
});

// ─── Sessions ─────────────────────────────────────────────────────────────────

router.post("/committees/:id/sessions", async (req, res): Promise<void> => {
  const committeeId = parseInt(req.params.id, 10);
  if (isNaN(committeeId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = SessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [session] = await db.insert(committeeSessionsTable)
    .values({ ...parsed.data, committeeId }).returning();
  res.status(201).json(session);
});

router.patch("/committee-sessions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [session] = await db.update(committeeSessionsTable).set(parsed.data)
    .where(eq(committeeSessionsTable.id, id)).returning();
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.delete("/committee-sessions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(committeeSessionsTable).where(eq(committeeSessionsTable.id, id));
  res.sendStatus(204);
});

// ─── Decisions (incoming) — also create a linked task ────────────────────────

router.post("/committees/:id/decisions", async (req, res): Promise<void> => {
  const committeeId = parseInt(req.params.id, 10);
  if (isNaN(committeeId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = DecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { assigneeId, ...decisionData } = parsed.data;
  const [decision] = await db.insert(committeeDecisionsTable)
    .values({ ...decisionData, committeeId }).returning();

  const [committee] = await db.select().from(committeesTable).where(eq(committeesTable.id, committeeId));
  const [task] = await db.insert(tasksTable).values({
    title: decision.content,
    description: committee ? `تكليف من لجنة: ${committee.name}` : null,
    dueDate: decision.dueDate ?? undefined,
    committeeId,
    assigneeId: assigneeId ?? undefined,
  }).returning();

  res.status(201).json({ ...decision, task });
});

router.patch("/committee-decisions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateDecisionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [decision] = await db.update(committeeDecisionsTable).set(parsed.data)
    .where(eq(committeeDecisionsTable.id, id)).returning();
  if (!decision) { res.status(404).json({ error: "Decision not found" }); return; }
  res.json(decision);
});

router.delete("/committee-decisions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(committeeDecisionsTable).where(eq(committeeDecisionsTable.id, id));
  res.sendStatus(204);
});

// ─── Outgoing information ─────────────────────────────────────────────────────

router.post("/committees/:id/outgoing", async (req, res): Promise<void> => {
  const committeeId = parseInt(req.params.id, 10);
  if (isNaN(committeeId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = OutgoingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const sessionUserId = (req.session as any).userId;
  const [outgoing] = await db.insert(committeeOutgoingTable)
    .values({ ...parsed.data, committeeId, sentById: sessionUserId ?? null }).returning();
  res.status(201).json(outgoing);
});

router.delete("/committee-outgoing/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(committeeOutgoingTable).where(eq(committeeOutgoingTable.id, id));
  res.sendStatus(204);
});

export default router;

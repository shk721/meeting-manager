import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  governanceContextsTable, governanceMembersTable, committeesTable,
  committeeRepresentativesTable,
} from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Governance Contexts ──────────────────────────────────────────────────────

router.get("/governance-contexts", async (req, res) => {
  const { organizationId, departmentId, type, status } = req.query as Record<string, string | undefined>;
  let rows = await db.select().from(governanceContextsTable).orderBy(governanceContextsTable.name);

  if (organizationId) rows = rows.filter(r => r.organizationId === parseInt(organizationId, 10));
  if (departmentId) rows = rows.filter(r => r.departmentId === parseInt(departmentId, 10));
  if (type) rows = rows.filter(r => r.type === type);
  if (status) rows = rows.filter(r => r.status === status);

  res.json(rows);
});

router.post("/governance-contexts", async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    organizationId: z.number().int().optional(),
    departmentId: z.number().int().optional(),
    scope: z.string().optional(),
    classification: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    mandate: z.string().optional(),
    meetingFrequency: z.string().optional(),
    quorumPercent: z.number().int().min(0).max(100).optional(),
    establishedAt: z.string().optional(),
    dissolvedAt: z.string().optional(),
  }).parse(req.body);
  const [ctx] = await db.insert(governanceContextsTable).values(body).returning();
  res.status(201).json(ctx);
});

router.get("/governance-contexts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [ctx] = await db.select().from(governanceContextsTable)
    .where(eq(governanceContextsTable.id, id));
  if (!ctx) { res.status(404).json({ error: "Not found" }); return; }

  const members = await db.select().from(governanceMembersTable)
    .where(eq(governanceMembersTable.governanceContextId, id));

  res.json({ ...ctx, members });
});

router.patch("/governance-contexts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    organizationId: z.number().int().nullable().optional(),
    departmentId: z.number().int().nullable().optional(),
    scope: z.string().optional(),
    classification: z.string().optional(),
    status: z.string().optional(),
    description: z.string().optional(),
    mandate: z.string().optional(),
    meetingFrequency: z.string().optional(),
    quorumPercent: z.number().int().min(0).max(100).optional(),
    establishedAt: z.string().nullable().optional(),
    dissolvedAt: z.string().nullable().optional(),
  }).parse(req.body);
  const [updated] = await db.update(governanceContextsTable).set(body)
    .where(eq(governanceContextsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/governance-contexts/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(governanceMembersTable)
    .where(eq(governanceMembersTable.governanceContextId, id));
  await db.delete(governanceContextsTable)
    .where(eq(governanceContextsTable.id, id));
  res.json({ success: true });
});

// ─── Governance Members ───────────────────────────────────────────────────────

router.get("/governance-members", async (req, res) => {
  const { governanceContextId } = req.query as Record<string, string | undefined>;
  const rows = governanceContextId
    ? await db.select().from(governanceMembersTable)
        .where(eq(governanceMembersTable.governanceContextId, parseInt(governanceContextId, 10)))
    : await db.select().from(governanceMembersTable);
  res.json(rows);
});

router.post("/governance-members", async (req, res) => {
  const body = z.object({
    governanceContextId: z.number().int(),
    userId: z.number().int().optional(),
    externalName: z.string().optional(),
    externalEmail: z.string().email().optional(),
    role: z.string().optional(),
    isVoting: z.boolean().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).parse(req.body);
  const [member] = await db.insert(governanceMembersTable).values(body).returning();
  res.status(201).json(member);
});

router.patch("/governance-members/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = z.object({
    role: z.string().optional(),
    isVoting: z.boolean().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).parse(req.body);
  const [updated] = await db.update(governanceMembersTable).set(body)
    .where(eq(governanceMembersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/governance-members/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(governanceMembersTable).where(eq(governanceMembersTable.id, id));
  res.json({ success: true });
});

// ─── Migration: committees → governance_contexts ──────────────────────────────
// Read-only copy — committees table is left intact.
// POST /governance-contexts/migrate/from-committees

router.post("/governance-contexts/migrate/from-committees", async (_req, res) => {
  const existing = await db.select().from(governanceContextsTable);
  const committees = await db.select().from(committeesTable);
  const representatives = await db.select().from(committeeRepresentativesTable);

  const existingSourceIds = new Set(
    existing
      .filter(g => g.description?.startsWith("[migrated:committee:"))
      .map(g => {
        const m = g.description?.match(/\[migrated:committee:(\d+)\]/);
        return m ? parseInt(m[1], 10) : null;
      })
      .filter((id): id is number => id !== null)
  );

  let created = 0;
  let skipped = 0;

  for (const c of committees) {
    if (existingSourceIds.has(c.id)) { skipped++; continue; }

    const [ctx] = await db.insert(governanceContextsTable).values({
      name: c.name,
      type: c.type === "internal" ? "team" : "committee",
      scope: c.type === "internal" ? "internal" : "external",
      status: c.status === "active" ? "active" : "inactive",
      description: `[migrated:committee:${c.id}] ${c.description ?? ""}`.trim(),
      meetingFrequency: c.frequency ?? null,
    }).returning();

    const reps = representatives.filter(r => r.committeeId === c.id);
    for (const rep of reps) {
      await db.insert(governanceMembersTable).values({
        governanceContextId: ctx.id,
        userId: rep.userId ?? null,
        externalName: rep.externalName ?? null,
        externalEmail: rep.externalEmail ?? null,
        role: rep.role,
        isVoting: true,
      });
    }
    created++;
  }

  res.json({ created, skipped, total: committees.length });
});

export default router;

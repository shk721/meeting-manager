import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  governanceContextsTable, governanceMembersTable, committeesTable,
  committeeRepresentativesTable, meetingAttendeesTable, usersTable,
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
  const parsed = z.object({
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
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [ctx] = await db.insert(governanceContextsTable).values(parsed.data).returning();
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
  const parsed = z.object({
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
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [updated] = await db.update(governanceContextsTable).set(parsed.data)
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
  const parsed = z.object({
    governanceContextId: z.number().int(),
    userId: z.number().int().optional(),
    externalName: z.string().optional(),
    externalEmail: z.string().email().optional(),
    role: z.string().optional(),
    isVoting: z.boolean().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [member] = await db.insert(governanceMembersTable).values(parsed.data).returning();
  res.status(201).json(member);
});

router.patch("/governance-members/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = z.object({
    role: z.string().optional(),
    isVoting: z.boolean().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [updated] = await db.update(governanceMembersTable).set(parsed.data)
    .where(eq(governanceMembersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/governance-members/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(governanceMembersTable).where(eq(governanceMembersTable.id, id));
  res.json({ success: true });
});

// ─── Quorum Tracking ──────────────────────────────────────────────────────────
// GET /governance-contexts/:id/quorum?meetingId=:meetingId
// Computes quorum status for a meeting against the governance context's voting members.

router.get("/governance-contexts/:id/quorum", async (req, res) => {
  const contextId = parseInt(req.params.id, 10);
  const meetingId = req.query.meetingId ? parseInt(req.query.meetingId as string, 10) : null;
  if (!meetingId || isNaN(meetingId)) {
    res.status(400).json({ error: "meetingId query parameter is required" });
    return;
  }

  const [ctx] = await db.select().from(governanceContextsTable)
    .where(eq(governanceContextsTable.id, contextId));
  if (!ctx) { res.status(404).json({ error: "Governance context not found" }); return; }

  // Get all voting members
  const votingMembers = await db.select().from(governanceMembersTable)
    .where(and(
      eq(governanceMembersTable.governanceContextId, contextId),
      eq(governanceMembersTable.isVoting, true)
    ));

  // Get meeting attendees
  const attendeeRows = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, meetingId));
  const attendeeUserIds = new Set(attendeeRows.map(a => a.userId));

  // Voting members who are present
  const presentVotingMembers = votingMembers.filter(
    m => m.userId !== null && attendeeUserIds.has(m.userId!)
  );

  const totalVotingMembers = votingMembers.length;
  const presentCount = presentVotingMembers.length;
  const quorumPercent = ctx.quorumPercent ?? 50;
  const quorumMet = totalVotingMembers > 0
    ? (presentCount / totalVotingMembers) * 100 >= quorumPercent
    : false;

  // Absent voting members (internal users only — external have no userId)
  const absentMembers = votingMembers.filter(
    m => m.userId === null || !attendeeUserIds.has(m.userId)
  );

  // Enrich absent members with user names where available
  const absentUserIds = absentMembers.map(m => m.userId).filter((id): id is number => id !== null);
  const absentUsers = absentUserIds.length > 0
    ? await db.select({ id: usersTable.id, fullName: usersTable.fullName })
        .from(usersTable)
        .where(inArray(usersTable.id, absentUserIds))
    : [];

  const userMap = new Map(absentUsers.map(u => [u.id, u.fullName]));

  res.json({
    contextId,
    meetingId,
    quorumPercent,
    totalVotingMembers,
    presentVotingMemberCount: presentCount,
    quorumMet,
    presentPercent: totalVotingMembers > 0 ? Math.round((presentCount / totalVotingMembers) * 100) : 0,
    absentMembers: absentMembers.map(m => ({
      id: m.id,
      userId: m.userId ?? null,
      name: m.userId ? (userMap.get(m.userId) ?? null) : m.externalName ?? null,
      role: m.role,
    })),
  });
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

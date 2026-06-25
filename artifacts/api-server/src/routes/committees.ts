import { Router, type IRouter } from "express";
import { and, eq, count, inArray } from "drizzle-orm";
import {
  db, committeesTable, committeeMembersTable, meetingsTable, usersTable,
} from "@workspace/db";
import {
  CreateCommitteeBody, UpdateCommitteeBody, AddCommitteeMemberBody,
} from "@workspace/api-zod";
import { formatUser } from "./users";
import { requireRole } from "../middleware/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

async function getCommitteeWithMeta(committeeId: number) {
  const [committee] = await db.select().from(committeesTable).where(eq(committeesTable.id, committeeId));
  if (!committee) return null;

  const [memberCountRow] = await db.select({ count: count() }).from(committeeMembersTable)
    .where(eq(committeeMembersTable.committeeId, committeeId));
  const [meetingCountRow] = await db.select({ count: count() }).from(meetingsTable)
    .where(eq(meetingsTable.committeeId, committeeId));

  const [chairperson] = committee.chairpersonId
    ? await db.select().from(usersTable).where(eq(usersTable.id, committee.chairpersonId))
    : [null];
  const [secretary] = committee.secretaryId
    ? await db.select().from(usersTable).where(eq(usersTable.id, committee.secretaryId))
    : [null];

  return {
    id: committee.id,
    name: committee.name,
    description: committee.description ?? null,
    type: committee.type,
    chairperson: chairperson ? formatUser(chairperson) : undefined,
    secretary: secretary ? formatUser(secretary) : undefined,
    memberCount: memberCountRow?.count ?? 0,
    meetingCount: meetingCountRow?.count ?? 0,
    createdAt: committee.createdAt.toISOString(),
  };
}

router.get("/committees", async (_req, res): Promise<void> => {
  const committees = await db.select().from(committeesTable).orderBy(committeesTable.name);
  if (committees.length === 0) { res.json([]); return; }

  const committeeIds = committees.map(c => c.id);
  const [memberCounts, meetingCounts, chairpersonRows, secretaryRows] = await Promise.all([
    db.select({ committeeId: committeeMembersTable.committeeId, count: count() })
      .from(committeeMembersTable)
      .where(inArray(committeeMembersTable.committeeId, committeeIds))
      .groupBy(committeeMembersTable.committeeId),
    db.select({ committeeId: meetingsTable.committeeId, count: count() })
      .from(meetingsTable)
      .where(inArray(meetingsTable.committeeId as any, committeeIds))
      .groupBy(meetingsTable.committeeId),
    (async () => {
      const ids = [...new Set(committees.map(c => c.chairpersonId).filter((id): id is number => id != null))];
      return ids.length > 0 ? db.select().from(usersTable).where(inArray(usersTable.id, ids)) : [];
    })(),
    (async () => {
      const ids = [...new Set(committees.map(c => c.secretaryId).filter((id): id is number => id != null))];
      return ids.length > 0 ? db.select().from(usersTable).where(inArray(usersTable.id, ids)) : [];
    })(),
  ]);

  const memberCountMap = new Map(memberCounts.map(r => [r.committeeId, r.count]));
  const meetingCountMap = new Map(meetingCounts.map(r => [r.committeeId, r.count]));
  const chairpersonMap = new Map(chairpersonRows.map(u => [u.id, u]));
  const secretaryMap = new Map(secretaryRows.map(u => [u.id, u]));

  res.json(committees.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description ?? null,
    type: c.type,
    chairperson: c.chairpersonId ? formatUser(chairpersonMap.get(c.chairpersonId)!) : undefined,
    secretary: c.secretaryId ? formatUser(secretaryMap.get(c.secretaryId)!) : undefined,
    memberCount: memberCountMap.get(c.id) ?? 0,
    meetingCount: meetingCountMap.get(c.id) ?? 0,
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/committees", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateCommitteeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [committee] = await db.insert(committeesTable).values(parsed.data as any).returning();
  const result = await getCommitteeWithMeta(committee.id);
  res.status(201).json(result);
});

router.get("/committees/:id", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [committee] = await db.select().from(committeesTable).where(eq(committeesTable.id, id));
  if (!committee) { res.status(404).json({ error: "Committee not found" }); return; }

  const [memberRows, recentMeetingRows] = await Promise.all([
    db.select().from(committeeMembersTable).where(eq(committeeMembersTable.committeeId, id)),
    db.select().from(meetingsTable).where(eq(meetingsTable.committeeId, id))
      .orderBy(meetingsTable.date).limit(10),
  ]);

  const memberUserIds = memberRows.map(m => m.userId);
  const meetingChairpersonIds = [...new Set(recentMeetingRows.map(m => m.chairpersonId).filter((x): x is number => x != null))];
  const allUserIds = [...new Set([
    ...memberUserIds,
    ...(committee.chairpersonId ? [committee.chairpersonId] : []),
    ...(committee.secretaryId ? [committee.secretaryId] : []),
    ...meetingChairpersonIds,
  ])];

  const users = allUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, allUserIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const [memberCountRow] = await db.select({ count: count() }).from(committeeMembersTable)
    .where(eq(committeeMembersTable.committeeId, id));
  const [meetingCountRow] = await db.select({ count: count() }).from(meetingsTable)
    .where(eq(meetingsTable.committeeId, id));

  res.json({
    id: committee.id,
    name: committee.name,
    description: committee.description ?? null,
    type: committee.type,
    chairperson: committee.chairpersonId ? formatUser(userMap.get(committee.chairpersonId)!) : undefined,
    secretary: committee.secretaryId ? formatUser(userMap.get(committee.secretaryId)!) : undefined,
    memberCount: memberCountRow?.count ?? 0,
    meetingCount: meetingCountRow?.count ?? 0,
    members: memberRows.map(m => ({
      id: m.id,
      committeeId: m.committeeId,
      user: m.userId ? formatUser(userMap.get(m.userId)!) : undefined,
      role: m.role as "chair" | "secretary" | "member",
      joinedAt: m.joinedAt ?? null,
    })),
    recentMeetings: recentMeetingRows.map(m => ({
      id: m.id,
      title: m.title,
      date: m.date,
      time: m.time,
      status: m.status,
      project: m.project ?? null,
      team: m.team ?? null,
      location: m.location ?? null,
      chairperson: m.chairpersonId ? formatUser(userMap.get(m.chairpersonId)!) : undefined,
      committeeId: m.committeeId ?? null,
      recurringType: m.recurringType as any,
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: committee.createdAt.toISOString(),
  });
});

router.patch("/committees/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateCommitteeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [committee] = await db.update(committeesTable).set(parsed.data as any)
    .where(eq(committeesTable.id, id)).returning();
  if (!committee) { res.status(404).json({ error: "Committee not found" }); return; }

  const result = await getCommitteeWithMeta(id);
  res.json(result);
});

router.delete("/committees/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(committeeMembersTable).where(eq(committeeMembersTable.committeeId, id));
  await db.delete(committeesTable).where(eq(committeesTable.id, id));
  res.sendStatus(204);
});

router.get("/committees/:id/members", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const members = await db.select().from(committeeMembersTable)
    .where(eq(committeeMembersTable.committeeId, id));

  const userIds = members.map(m => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(members.map(m => ({
    id: m.id,
    committeeId: m.committeeId,
    user: formatUser(userMap.get(m.userId)!),
    role: m.role,
    joinedAt: m.joinedAt ?? null,
  })));
});

router.post("/committees/:id/members", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = AddCommitteeMemberBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [member] = await db.insert(committeeMembersTable).values({
    committeeId: id,
    userId: parsed.data.userId,
    role: parsed.data.role ?? "member",
  }).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, member.userId));

  res.status(201).json({
    id: member.id,
    committeeId: member.committeeId,
    user: user ? formatUser(user) : undefined,
    role: member.role,
    joinedAt: member.joinedAt ?? null,
  });
});

router.delete("/committees/:id/members/:userId", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const userId = parseId(req.params.userId);
  if (isNaN(id) || isNaN(userId)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(committeeMembersTable)
    .where(
      and(
        eq(committeeMembersTable.committeeId, id),
        eq(committeeMembersTable.userId, userId),
      ),
    );

  res.sendStatus(204);
});

export default router;

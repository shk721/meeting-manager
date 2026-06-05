import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, minutesTable, usersTable } from "@workspace/db";
import { CreateMeetingMinutesBody } from "@workspace/api-zod";
import { formatUser } from "./users";

const router: IRouter = Router();

function formatMinutes(minutes: typeof minutesTable.$inferSelect, approvedBy: typeof usersTable.$inferSelect | null) {
  return {
    id: minutes.id, meetingId: minutes.meetingId,
    executiveSummary: minutes.executiveSummary ?? null,
    discussionItems: minutes.discussionItems ?? null,
    risks: minutes.risks ?? null,
    previousFollowUp: minutes.previousFollowUp ?? null,
    status: minutes.status,
    approvedBy: approvedBy ? formatUser(approvedBy) : null,
    approvedAt: minutes.approvedAt?.toISOString() ?? null,
    createdAt: minutes.createdAt.toISOString(),
    updatedAt: minutes.updatedAt.toISOString(),
  };
}

router.get("/meetings/:id/minutes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const meetingId = parseInt(raw, 10);

  const [minutes] = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));
  if (!minutes) { res.status(404).json({ error: "Minutes not found" }); return; }

  const [approvedBy] = minutes.approvedById
    ? await db.select().from(usersTable).where(eq(usersTable.id, minutes.approvedById))
    : [null];

  res.json(formatMinutes(minutes, approvedBy ?? null));
});

router.post("/meetings/:id/minutes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const meetingId = parseInt(raw, 10);

  const parsed = CreateMeetingMinutesBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const existing = await db.select().from(minutesTable).where(eq(minutesTable.meetingId, meetingId));

  let minutes: typeof minutesTable.$inferSelect;
  if (existing.length > 0) {
    const [updated] = await db.update(minutesTable)
      .set(parsed.data).where(eq(minutesTable.meetingId, meetingId)).returning();
    minutes = updated;
  } else {
    const [created] = await db.insert(minutesTable)
      .values({ meetingId, ...parsed.data }).returning();
    minutes = created;
  }

  res.status(201).json(formatMinutes(minutes, null));
});

router.post("/minutes/:id/approve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const minutesId = parseInt(raw, 10);
  const sessionUserId = (req.session as any).userId;

  const [updated] = await db.update(minutesTable)
    .set({ status: "approved", approvedById: sessionUserId ?? null, approvedAt: new Date() })
    .where(eq(minutesTable.id, minutesId)).returning();

  if (!updated) { res.status(404).json({ error: "Minutes not found" }); return; }

  const [approvedBy] = updated.approvedById
    ? await db.select().from(usersTable).where(eq(usersTable.id, updated.approvedById))
    : [null];

  res.json(formatMinutes(updated, approvedBy ?? null));
});

export default router;

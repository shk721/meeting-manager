import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import { agendaItemsTable, meetingsTable } from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Agenda Items ─────────────────────────────────────────────────────────────

router.get("/agenda-items", async (req, res) => {
  const { meetingId, status } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(agendaItemsTable)
    .orderBy(agendaItemsTable.orderIndex);

  if (meetingId) {
    const mid = parseInt(meetingId, 10);
    rows = rows.filter(r => r.meetingId === mid);
  }
  if (status) {
    rows = rows.filter(r => r.status === status);
  }

  res.json(rows);
});

router.post("/agenda-items", async (req, res) => {
  const parsed = z.object({
    meetingId: z.number().int(),
    title: z.string().min(1),
    orderIndex: z.number().int().optional(),
    durationMin: z.number().int().optional(),
    presenterId: z.number().int().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    carryForward: z.boolean().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [item] = await db.insert(agendaItemsTable).values(parsed.data).returning();
  res.status(201).json(item);
});

router.get("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [item] = await db.select().from(agendaItemsTable)
    .where(eq(agendaItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.patch("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const parsed = z.object({
    title: z.string().optional(),
    orderIndex: z.number().int().optional(),
    durationMin: z.number().int().nullable().optional(),
    presenterId: z.number().int().nullable().optional(),
    status: z.string().optional(),
    notes: z.string().nullable().optional(),
    carryForward: z.boolean().optional(),
    decidedAt: z.string().nullable().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }
  const [updated] = await db.update(agendaItemsTable).set(parsed.data as any)
    .where(eq(agendaItemsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/agenda-items/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(agendaItemsTable).where(eq(agendaItemsTable.id, id));
  res.json({ success: true });
});

// ─── Migration: meetings.agendaItems text[] → agenda_items rows ───────────────
// Reads meetings that still have the legacy agendaItems text[] column and
// creates a proper agenda_item row for each entry that doesn't yet exist.
// Safe to re-run (idempotent per meetingId).
// POST /agenda-items/migrate/from-meetings

router.post("/agenda-items/migrate/from-meetings", async (_req, res) => {
  const meetings = await db.select().from(meetingsTable) as any[];

  let created = 0;
  let skipped = 0;

  for (const meeting of meetings) {
    const legacyItems: string[] = meeting.agendaItems ?? [];
    if (!legacyItems.length) continue;

    const existing = await db.select().from(agendaItemsTable)
      .where(eq(agendaItemsTable.meetingId, meeting.id));

    if (existing.length > 0) { skipped++; continue; }

    for (let i = 0; i < legacyItems.length; i++) {
      await db.insert(agendaItemsTable).values({
        meetingId: meeting.id,
        title: legacyItems[i],
        orderIndex: i,
      });
    }
    created++;
  }

  res.json({ meetingsMigrated: created, meetingsSkipped: skipped });
});

export default router;

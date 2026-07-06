import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, remindersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/meetings/:id/reminders", async (req, res): Promise<void> => {
  const meetingId = parseInt(req.params.id, 10);
  if (isNaN(meetingId)) { res.status(400).json({ error: "Invalid meeting id" }); return; }

  const userId = (req.session as any).userId as number;
  const minutesBefore = parseInt(req.body.minutesBefore, 10);

  if (!minutesBefore || ![15, 30, 60, 1440].includes(minutesBefore)) {
    res.status(400).json({ error: "minutesBefore must be 15, 30, 60, or 1440" });
    return;
  }

  const [reminder] = await db.insert(remindersTable).values({
    meetingId,
    userId,
    minutesBefore,
  }).returning();

  res.status(201).json(reminder);
});

router.get("/meetings/:id/reminders", async (req, res): Promise<void> => {
  const meetingId = parseInt(req.params.id, 10);
  if (isNaN(meetingId)) { res.status(400).json({ error: "Invalid meeting id" }); return; }

  const userId = (req.session as any).userId as number;
  const reminders = await db.select().from(remindersTable)
    .where(and(eq(remindersTable.meetingId, meetingId), eq(remindersTable.userId, userId)));

  res.json(reminders);
});

router.delete("/reminders/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const userId = (req.session as any).userId as number;
  await db.delete(remindersTable)
    .where(and(eq(remindersTable.id, id), eq(remindersTable.userId, userId)));

  res.json({ deleted: true });
});

export default router;

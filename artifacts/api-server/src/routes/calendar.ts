import { Router, type IRouter } from "express";
import { gte, lte, and, eq } from "drizzle-orm";
import { db, meetingsTable, meetingAttendeesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/calendar/events", async (req, res): Promise<void> => {
  const { start, end } = req.query as Record<string, string>;
  if (!start || !end) {
    res.status(400).json({ error: "start and end query params required" });
    return;
  }

  const meetings = await db.select().from(meetingsTable)
    .where(and(gte(meetingsTable.date, start), lte(meetingsTable.date, end)));

  const results = await Promise.all(meetings.map(async (m) => {
    const attendeeRows = await db.select().from(meetingAttendeesTable)
      .where(eq(meetingAttendeesTable.meetingId, m.id));
    const startDt = new Date(`${m.date}T${m.time}:00`);
    const endDt = new Date(startDt.getTime() + 60 * 60 * 1000); // default 1-hour duration
    return {
      id: m.id,
      title: m.title,
      start: startDt.toISOString(),
      end: endDt.toISOString(),
      status: m.status,
      attendeeCount: attendeeRows.length,
      isRecurring: m.isRecurring,
      parentMeetingId: m.parentMeetingId ?? null,
    };
  }));

  res.json(results);
});

router.get("/calendar/day/:date", async (req, res): Promise<void> => {
  const { date } = req.params;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
    return;
  }

  const meetings = await db.select().from(meetingsTable)
    .where(eq(meetingsTable.date, date));

  const results = await Promise.all(meetings.map(async (m) => {
    const attendeeRows = await db.select().from(meetingAttendeesTable)
      .where(eq(meetingAttendeesTable.meetingId, m.id));
    return {
      id: m.id,
      title: m.title,
      time: m.time,
      status: m.status,
      location: m.location ?? null,
      attendeeCount: attendeeRows.length,
    };
  }));

  results.sort((a, b) => a.time.localeCompare(b.time));
  res.json(results);
});

export default router;

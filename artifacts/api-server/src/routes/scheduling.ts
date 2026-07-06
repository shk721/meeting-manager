import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, meetingsTable, meetingAttendeesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/scheduling/availability", async (req, res): Promise<void> => {
  const { attendees, date } = req.query as { attendees?: string; date?: string };

  if (!attendees || !date) {
    res.status(400).json({ error: "attendees and date query params required" });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const attendeeIds = attendees.split(",").map(Number).filter(n => !isNaN(n) && n > 0);
  if (attendeeIds.length === 0) {
    res.json({ busy: [] });
    return;
  }

  const rows = await db.select().from(meetingAttendeesTable)
    .where(inArray(meetingAttendeesTable.userId, attendeeIds));

  const meetingIds = [...new Set(rows.map(r => r.meetingId))];
  if (meetingIds.length === 0) {
    res.json({ busy: [] });
    return;
  }

  const meetings = await db.select().from(meetingsTable)
    .where(inArray(meetingsTable.id, meetingIds));

  const dayMeetings = meetings.filter(m => m.date === date && m.status !== "cancelled");

  const busy = dayMeetings.map(m => ({
    meetingId: m.id,
    title: m.title,
    time: m.time,
    conflictingAttendees: rows
      .filter(r => r.meetingId === m.id && attendeeIds.includes(r.userId))
      .map(r => r.userId),
  }));

  res.json({ busy });
});

export default router;

import { Router, type IRouter } from "express";
import { eq, or } from "drizzle-orm";
import { db, meetingsTable } from "@workspace/db";

const router: IRouter = Router();

type RecurrencePattern = {
  freq: "daily" | "weekly" | "monthly";
  days?: string[];
  interval: number;
  endDate?: string;
};

const WEEKDAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function generateInstances(baseDate: string, pattern: RecurrencePattern, limit = 12): string[] {
  const dates: string[] = [];
  const { freq, days, interval, endDate } = pattern;

  if (freq === "daily") {
    let current = addDays(baseDate, interval);
    while (dates.length < limit) {
      if (endDate && current > endDate) break;
      dates.push(current);
      current = addDays(current, interval);
    }
  } else if (freq === "weekly") {
    const targetDays = (days ?? []).map(d => WEEKDAY_MAP[d] ?? -1).filter(d => d >= 0);
    if (targetDays.length === 0) targetDays.push(new Date(baseDate).getUTCDay());

    let weekStart = baseDate;
    let safetyBreak = 0;
    while (dates.length < limit && safetyBreak < 500) {
      safetyBreak++;
      weekStart = addDays(weekStart, 1);
      const dow = new Date(weekStart).getUTCDay();
      if (targetDays.includes(dow)) {
        if (endDate && weekStart > endDate) break;
        if (weekStart > baseDate) dates.push(weekStart);
      }
      if (dow === 6) {
        weekStart = addDays(weekStart, (interval - 1) * 7);
      }
    }
  } else if (freq === "monthly") {
    let current = addMonths(baseDate, interval);
    while (dates.length < limit) {
      if (endDate && current > endDate) break;
      dates.push(current);
      current = addMonths(current, interval);
    }
  }

  return dates;
}

router.post("/meetings/:id/make-recurring", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { freq, days, interval = 1, endDate } = req.body as RecurrencePattern & { endDate?: string };
  if (!freq || !["daily", "weekly", "monthly"].includes(freq)) {
    res.status(400).json({ error: "freq must be daily, weekly, or monthly" });
    return;
  }

  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }

  const pattern: RecurrencePattern = { freq, interval, ...(days ? { days } : {}), ...(endDate ? { endDate } : {}) };

  await db.update(meetingsTable).set({
    isRecurring: true,
    recurrencePattern: JSON.stringify(pattern),
  }).where(eq(meetingsTable.id, id));

  const instanceDates = generateInstances(meeting.date, pattern);

  const instances = await Promise.all(instanceDates.map(date =>
    db.insert(meetingsTable).values({
      title: meeting.title,
      date,
      time: meeting.time,
      status: "scheduled",
      project: meeting.project,
      team: meeting.team,
      location: meeting.location,
      objectives: meeting.objectives,
      chairpersonId: meeting.chairpersonId,
      agendaItems: meeting.agendaItems,
      isRecurring: false,
      parentMeetingId: id,
    }).returning()
  ));

  res.json({
    parentMeeting: { id, isRecurring: true, recurrencePattern: pattern },
    instances: instances.map(([i]) => ({ id: i.id, date: i.date })),
  });
});

router.get("/recurring/:id/instances", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const instances = await db.select().from(meetingsTable)
    .where(eq(meetingsTable.parentMeetingId, id));

  res.json(instances.map(m => ({
    id: m.id,
    title: m.title,
    date: m.date,
    time: m.time,
    status: m.status,
    parentMeetingId: m.parentMeetingId,
  })));
});

router.delete("/recurring/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [parent] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, id));
  if (!parent || !parent.isRecurring) {
    res.status(404).json({ error: "Recurring meeting not found" });
    return;
  }

  await db.delete(meetingsTable).where(eq(meetingsTable.parentMeetingId, id));
  await db.delete(meetingsTable).where(eq(meetingsTable.id, id));

  res.json({ deleted: true });
});

export default router;

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const SettingsBody = z.object({
  notifUpcomingMeetings: z.boolean().optional(),
  notifDueTasks: z.boolean().optional(),
  notifPendingDecisions: z.boolean().optional(),
  notifPlanUpdates: z.boolean().optional(),
  notifWeeklyDigest: z.boolean().optional(),
  orgName: z.string().optional(),
  timezone: z.string().optional(),
  calendarSystem: z.string().optional(),
  language: z.string().optional(),
  minutesCycle: z.string().optional(),
  themeMode: z.string().optional(),
  displayDensity: z.string().optional(),
  planningAutoProgress: z.boolean().optional(),
  planningMilestonesLayer: z.boolean().optional(),
  planningMandatoryImpact: z.boolean().optional(),
});

const DEFAULTS = {
  notifUpcomingMeetings: true,
  notifDueTasks: true,
  notifPendingDecisions: true,
  notifPlanUpdates: true,
  notifWeeklyDigest: false,
  orgName: null,
  timezone: "Asia/Riyadh",
  calendarSystem: "gregorian",
  language: "ar",
  minutesCycle: "single",
  themeMode: "light",
  displayDensity: "standard",
  planningAutoProgress: true,
  planningMilestonesLayer: false,
  planningMandatoryImpact: false,
};

router.get("/app-settings", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;

  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.userId, userId));
  if (!row) {
    res.json({ ...DEFAULTS, userId });
    return;
  }
  res.json(row);
});

router.put("/app-settings", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;

  const parsed = SettingsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.userId, userId));
  if (!existing) {
    const [created] = await db.insert(appSettingsTable).values({ ...parsed.data, userId }).returning();
    res.json(created);
    return;
  }
  const [updated] = await db.update(appSettingsTable).set(parsed.data).where(eq(appSettingsTable.userId, userId)).returning();
  res.json(updated);
});

export default router;

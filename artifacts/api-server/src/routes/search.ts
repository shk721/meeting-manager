import { Router, type IRouter } from "express";
import { searchMeetings, searchTasks, searchPlans, searchMinutes } from "@workspace/db/search-queries";
import { z } from "zod";

const router: IRouter = Router();

const SearchParams = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get("/search/meetings", async (req, res): Promise<void> => {
  const parsed = SearchParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit, offset } = parsed.data;
  const { data, total } = await searchMeetings(q, limit, offset);
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total } });
});

router.get("/search/tasks", async (req, res): Promise<void> => {
  const parsed = SearchParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit, offset } = parsed.data;
  const { data, total } = await searchTasks(q, limit, offset);
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total } });
});

router.get("/search", async (req, res): Promise<void> => {
  const parsed = SearchParams.omit({ offset: true }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit } = parsed.data;
  const [meetings, tasks, plans, minutes] = await Promise.all([
    searchMeetings(q, limit, 0),
    searchTasks(q, limit, 0),
    searchPlans(q, limit, 0),
    searchMinutes(q, limit, 0),
  ]);
  const combined = [
    ...meetings.data.map(m => ({ type: "meeting" as const, ...m })),
    ...tasks.data.map(t => ({ type: "task" as const, ...t })),
    ...plans.data.map(p => ({ type: "plan" as const, ...p })),
    ...minutes.data.map(m => ({ type: "minute" as const, ...m })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  res.json({ meetings: meetings.data, tasks: tasks.data, plans: plans.data, minutes: minutes.data, combined });
});

export default router;

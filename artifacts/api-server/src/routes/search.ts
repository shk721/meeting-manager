import { Router, type IRouter } from "express";
import { searchMeetings, searchTasks } from "@workspace/db/search-queries";
import { z } from "zod";

const router: IRouter = Router();

const SearchParams = z.object({
  q: z.string().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

function authGuard(req: any, res: any): number | null {
  const userId = req.session?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

router.get("/search/meetings", async (req, res): Promise<void> => {
  if (!authGuard(req, res)) return;
  const parsed = SearchParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit, offset } = parsed.data;
  const { data, total } = await searchMeetings(q, limit, offset);
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total } });
});

router.get("/search/tasks", async (req, res): Promise<void> => {
  if (!authGuard(req, res)) return;
  const parsed = SearchParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit, offset } = parsed.data;
  const { data, total } = await searchTasks(q, limit, offset);
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total } });
});

router.get("/search", async (req, res): Promise<void> => {
  if (!authGuard(req, res)) return;
  const parsed = SearchParams.omit({ offset: true }).safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit } = parsed.data;
  const [meetings, tasks] = await Promise.all([
    searchMeetings(q, limit, 0),
    searchTasks(q, limit, 0),
  ]);
  const combined = [
    ...meetings.data.map(m => ({ type: "meeting" as const, ...m })),
    ...tasks.data.map(t => ({ type: "task" as const, ...t })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  res.json({ meetings: meetings.data, tasks: tasks.data, combined });
});

export default router;

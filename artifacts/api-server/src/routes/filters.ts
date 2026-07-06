import { Router, type IRouter } from "express";
import { filterMeetings, filterTasks } from "@workspace/db/filter-queries";
import { z } from "zod";

const router: IRouter = Router();

const MeetingFilterParams = z.object({
  status:       z.string().optional(),
  startDate:    z.string().optional(),
  endDate:      z.string().optional(),
  chairpersonId:z.coerce.number().int().optional(),
  attendeeMin:  z.coerce.number().int().min(0).optional(),
  attendeeMax:  z.coerce.number().int().min(0).optional(),
  limit:        z.coerce.number().int().min(1).max(100).default(20),
  offset:       z.coerce.number().int().min(0).default(0),
});

const TaskFilterParams = z.object({
  status:     z.string().optional(),
  priority:   z.string().optional(),
  assigneeId: z.coerce.number().int().optional(),
  dueDateMin: z.string().optional(),
  dueDateMax: z.string().optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
  offset:     z.coerce.number().int().min(0).default(0),
});

function authGuard(req: any, res: any): number | null {
  const userId = req.session?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

router.get("/filters/meetings", async (req, res): Promise<void> => {
  if (!authGuard(req, res)) return;
  const parsed = MeetingFilterParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit, offset, ...criteria } = parsed.data;
  const { data, total } = await filterMeetings(criteria, limit, offset);
  const appliedFilters = Object.fromEntries(Object.entries(criteria).filter(([, v]) => v !== undefined));
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total }, appliedFilters });
});

router.get("/filters/tasks", async (req, res): Promise<void> => {
  if (!authGuard(req, res)) return;
  const parsed = TaskFilterParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit, offset, ...criteria } = parsed.data;
  const { data, total } = await filterTasks(criteria, limit, offset);
  const appliedFilters = Object.fromEntries(Object.entries(criteria).filter(([, v]) => v !== undefined));
  res.json({ data, pagination: { total, limit, offset, hasMore: offset + limit < total }, appliedFilters });
});

export default router;

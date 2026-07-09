import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, savedViewsTable } from "@workspace/db";
import { filterMeetings, filterTasks } from "@workspace/db/filter-queries";
import { z } from "zod";

const router: IRouter = Router();

const CreateViewBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["meetings", "tasks"]),
  filters: z.record(z.unknown()).default({}),
});

function parseView(row: typeof savedViewsTable.$inferSelect) {
  return { ...row, filters: JSON.parse(row.filters) };
}

router.post("/views", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const parsed = CreateViewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, type, filters } = parsed.data;
  const [view] = await db.insert(savedViewsTable).values({
    userId, name, type, filters: JSON.stringify(filters),
  }).returning();
  res.status(201).json(parseView(view));
});

router.get("/views", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const views = await db.select().from(savedViewsTable)
    .where(eq(savedViewsTable.userId, userId));
  res.json(views.map(parseView));
});

router.get("/views/:id", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [view] = await db.select().from(savedViewsTable)
    .where(and(eq(savedViewsTable.id, id), eq(savedViewsTable.userId, userId)));
  if (!view) { res.status(404).json({ error: "View not found" }); return; }
  const filters = JSON.parse(view.filters);
  const results = view.type === "meetings"
    ? await filterMeetings(filters)
    : await filterTasks(filters);
  res.json({ view: parseView(view), results });
});

router.delete("/views/:id", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(savedViewsTable)
    .where(and(eq(savedViewsTable.id, id), eq(savedViewsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;

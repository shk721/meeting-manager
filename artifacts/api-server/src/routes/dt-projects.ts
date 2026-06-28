import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  dtProjectsTable, dtSubplansTable, dtResourcesTable,
  dtComponentsTable, dtTasksTable, dtTaskUpdatesTable, dtSnapshotsTable,
} from "@workspace/db";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getSubplanFull(subplanId: number) {
  const [sp] = await db.select().from(dtSubplansTable).where(eq(dtSubplansTable.id, subplanId));
  if (!sp) return null;

  const resources = await db.select().from(dtResourcesTable).where(eq(dtResourcesTable.subplanId, subplanId));
  const components = await db.select().from(dtComponentsTable).where(eq(dtComponentsTable.subplanId, subplanId));

  const componentsWithTasks = await Promise.all(components.map(async comp => {
    const tasks = await db.select().from(dtTasksTable).where(eq(dtTasksTable.componentId, comp.id));
    const tasksWithUpdates = await Promise.all(tasks.map(async task => {
      const updates = await db.select().from(dtTaskUpdatesTable)
        .where(eq(dtTaskUpdatesTable.taskId, task.id))
        .orderBy(dtTaskUpdatesTable.createdAt);
      return { ...task, updates };
    }));
    return { ...comp, tasks: tasksWithUpdates };
  }));

  return { ...sp, resources, components: componentsWithTasks };
}

async function getProjectFull(projectId: number) {
  const [project] = await db.select().from(dtProjectsTable).where(eq(dtProjectsTable.id, projectId));
  if (!project) return null;
  const subplans = await db.select().from(dtSubplansTable).where(eq(dtSubplansTable.projectId, projectId));
  const subplansFull = await Promise.all(subplans.map(sp => getSubplanFull(sp.id)));
  return { ...project, subplans: subplansFull.filter(Boolean) };
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateProjectBody = z.object({
  title: z.string().min(1),
  deadline: z.string().min(1),
});

const UpdateProjectBody = z.object({
  title: z.string().min(1).optional(),
  deadline: z.string().min(1).optional(),
});

const CreateSubplanBody = z.object({
  title: z.string().min(1),
  status: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().min(1),
});

const UpdateSubplanBody = z.object({
  title: z.string().min(1).optional(),
  status: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().min(1).optional(),
});

const ResourceBody = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  allocation: z.number().int().min(0).max(100).optional(),
});

const CreateComponentBody = z.object({
  driver: z.string().min(1),
  title: z.string().min(1),
  desc: z.string().optional(),
  priority: z.string().optional(),
  refYear: z.number().int().optional(),
});

const UpdateComponentBody = z.object({
  driver: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  desc: z.string().optional(),
  priority: z.string().optional(),
  refYear: z.number().int().optional(),
});

const CreateTaskBody = z.object({
  title: z.string().min(1),
  status: z.string().optional(),
  assignee: z.string().optional(),
});

const UpdateTaskBody = z.object({
  title: z.string().min(1).optional(),
  status: z.string().optional(),
  assignee: z.string().optional(),
});

const CreateTaskUpdateBody = z.object({
  note: z.string().min(1),
  auto: z.string().optional(),
  by: z.string().optional(),
});

const CreateSnapshotBody = z.object({
  label: z.string().min(1),
  period: z.enum(["manual", "monthly", "quarterly"]).optional(),
  metrics: z.record(z.unknown()),
});

// ─── Projects ─────────────────────────────────────────────────────────────────

router.get("/dt-projects", async (_req, res): Promise<void> => {
  const projects = await db.select().from(dtProjectsTable).orderBy(dtProjectsTable.createdAt);
  res.json(projects);
});

router.post("/dt-projects", async (req, res): Promise<void> => {
  const parsed = CreateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [project] = await db.insert(dtProjectsTable).values(parsed.data).returning();
  res.status(201).json(project);
});

router.get("/dt-projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const project = await getProjectFull(id);
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

router.patch("/dt-projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateProjectBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [project] = await db.update(dtProjectsTable).set(parsed.data).where(eq(dtProjectsTable.id, id)).returning();
  if (!project) { res.status(404).json({ error: "Project not found" }); return; }
  res.json(project);
});

router.delete("/dt-projects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  // cascade: subplans → resources, components → tasks → updates
  const subplans = await db.select().from(dtSubplansTable).where(eq(dtSubplansTable.projectId, id));
  for (const sp of subplans) {
    await deleteSubplanCascade(sp.id);
  }
  await db.delete(dtSnapshotsTable).where(eq(dtSnapshotsTable.projectId, id));
  await db.delete(dtProjectsTable).where(eq(dtProjectsTable.id, id));
  res.sendStatus(204);
});

// ─── Sub-plans ────────────────────────────────────────────────────────────────

async function deleteSubplanCascade(subplanId: number) {
  const components = await db.select().from(dtComponentsTable).where(eq(dtComponentsTable.subplanId, subplanId));
  for (const comp of components) {
    const tasks = await db.select().from(dtTasksTable).where(eq(dtTasksTable.componentId, comp.id));
    for (const task of tasks) {
      await db.delete(dtTaskUpdatesTable).where(eq(dtTaskUpdatesTable.taskId, task.id));
    }
    await db.delete(dtTasksTable).where(eq(dtTasksTable.componentId, comp.id));
  }
  await db.delete(dtComponentsTable).where(eq(dtComponentsTable.subplanId, subplanId));
  await db.delete(dtResourcesTable).where(eq(dtResourcesTable.subplanId, subplanId));
  await db.delete(dtSubplansTable).where(eq(dtSubplansTable.id, subplanId));
}

router.get("/dt-projects/:projectId/subplans", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const subplans = await db.select().from(dtSubplansTable).where(eq(dtSubplansTable.projectId, projectId));
  const full = await Promise.all(subplans.map(sp => getSubplanFull(sp.id)));
  res.json(full.filter(Boolean));
});

router.post("/dt-projects/:projectId/subplans", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateSubplanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [sp] = await db.insert(dtSubplansTable).values({ ...parsed.data, projectId }).returning();
  res.status(201).json(await getSubplanFull(sp.id));
});

router.get("/dt-subplans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const sp = await getSubplanFull(id);
  if (!sp) { res.status(404).json({ error: "Subplan not found" }); return; }
  res.json(sp);
});

router.patch("/dt-subplans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateSubplanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [sp] = await db.update(dtSubplansTable).set(parsed.data).where(eq(dtSubplansTable.id, id)).returning();
  if (!sp) { res.status(404).json({ error: "Subplan not found" }); return; }
  res.json(await getSubplanFull(sp.id));
});

router.delete("/dt-subplans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await deleteSubplanCascade(id);
  res.sendStatus(204);
});

// ─── Resources ────────────────────────────────────────────────────────────────

router.post("/dt-subplans/:subplanId/resources", async (req, res): Promise<void> => {
  const subplanId = parseInt(req.params.subplanId, 10);
  if (isNaN(subplanId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ResourceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.insert(dtResourcesTable).values({ ...parsed.data, subplanId }).returning();
  res.status(201).json(r);
});

router.patch("/dt-resources/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = ResourceBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.update(dtResourcesTable).set(parsed.data).where(eq(dtResourcesTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Resource not found" }); return; }
  res.json(r);
});

router.delete("/dt-resources/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dtResourcesTable).where(eq(dtResourcesTable.id, id));
  res.sendStatus(204);
});

// ─── Components ───────────────────────────────────────────────────────────────

router.post("/dt-subplans/:subplanId/components", async (req, res): Promise<void> => {
  const subplanId = parseInt(req.params.subplanId, 10);
  if (isNaN(subplanId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateComponentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [comp] = await db.insert(dtComponentsTable).values({ ...parsed.data, subplanId }).returning();
  res.status(201).json({ ...comp, tasks: [] });
});

router.patch("/dt-components/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateComponentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [comp] = await db.update(dtComponentsTable).set(parsed.data).where(eq(dtComponentsTable.id, id)).returning();
  if (!comp) { res.status(404).json({ error: "Component not found" }); return; }
  const tasks = await db.select().from(dtTasksTable).where(eq(dtTasksTable.componentId, id));
  const tasksWithUpdates = await Promise.all(tasks.map(async t => {
    const updates = await db.select().from(dtTaskUpdatesTable).where(eq(dtTaskUpdatesTable.taskId, t.id));
    return { ...t, updates };
  }));
  res.json({ ...comp, tasks: tasksWithUpdates });
});

router.delete("/dt-components/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tasks = await db.select().from(dtTasksTable).where(eq(dtTasksTable.componentId, id));
  for (const task of tasks) {
    await db.delete(dtTaskUpdatesTable).where(eq(dtTaskUpdatesTable.taskId, task.id));
  }
  await db.delete(dtTasksTable).where(eq(dtTasksTable.componentId, id));
  await db.delete(dtComponentsTable).where(eq(dtComponentsTable.id, id));
  res.sendStatus(204);
});

// ─── DT Tasks ─────────────────────────────────────────────────────────────────

router.post("/dt-components/:componentId/tasks", async (req, res): Promise<void> => {
  const componentId = parseInt(req.params.componentId, 10);
  if (isNaN(componentId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.insert(dtTasksTable).values({ ...parsed.data, componentId }).returning();
  res.status(201).json({ ...task, updates: [] });
});

router.patch("/dt-tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [task] = await db.update(dtTasksTable).set(parsed.data).where(eq(dtTasksTable.id, id)).returning();
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }
  const updates = await db.select().from(dtTaskUpdatesTable).where(eq(dtTaskUpdatesTable.taskId, id)).orderBy(dtTaskUpdatesTable.createdAt);
  res.json({ ...task, updates });
});

router.delete("/dt-tasks/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dtTaskUpdatesTable).where(eq(dtTaskUpdatesTable.taskId, id));
  await db.delete(dtTasksTable).where(eq(dtTasksTable.id, id));
  res.sendStatus(204);
});

router.post("/dt-tasks/:taskId/updates", async (req, res): Promise<void> => {
  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateTaskUpdateBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [upd] = await db.insert(dtTaskUpdatesTable).values({ ...parsed.data, taskId }).returning();
  res.status(201).json(upd);
});

// ─── Snapshots ────────────────────────────────────────────────────────────────

router.get("/dt-projects/:projectId/snapshots", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const snaps = await db.select().from(dtSnapshotsTable)
    .where(eq(dtSnapshotsTable.projectId, projectId))
    .orderBy(dtSnapshotsTable.createdAt);
  res.json(snaps);
});

router.post("/dt-projects/:projectId/snapshots", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.projectId, 10);
  if (isNaN(projectId)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = CreateSnapshotBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [snap] = await db.insert(dtSnapshotsTable).values({ ...parsed.data, projectId }).returning();
  res.status(201).json(snap);
});

router.delete("/dt-snapshots/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(dtSnapshotsTable).where(eq(dtSnapshotsTable.id, id));
  res.sendStatus(204);
});

export default router;

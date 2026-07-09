import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  organizationsTable, departmentsTable, userDepartmentsTable, usersTable,
} from "@workspace/db/schema";

const router: IRouter = Router();

// ─── Organizations ────────────────────────────────────────────────────────────

router.get("/organizations", async (_req, res) => {
  const rows = await db.select().from(organizationsTable)
    .orderBy(organizationsTable.name);
  res.json(rows);
});

router.post("/organizations", async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    nameEn: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    countryCode: z.string().optional(),
  }).parse(req.body);
  const [org] = await db.insert(organizationsTable).values(body).returning();
  res.status(201).json(org);
});

router.get("/organizations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, id));
  if (!org) { res.status(404).json({ error: "Not found" }); return; }

  const depts = await db.select().from(departmentsTable)
    .where(eq(departmentsTable.organizationId, id))
    .orderBy(departmentsTable.level, departmentsTable.orderIndex);

  res.json({ ...org, departments: depts });
});

router.patch("/organizations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = z.object({
    name: z.string().optional(),
    nameEn: z.string().optional(),
    type: z.string().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
  }).parse(req.body);
  const [updated] = await db.update(organizationsTable).set(body)
    .where(eq(organizationsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── Departments ──────────────────────────────────────────────────────────────

router.get("/departments", async (req, res) => {
  const { organizationId, parentId } = req.query as Record<string, string | undefined>;
  let query = db.select().from(departmentsTable).$dynamic();

  if (organizationId) {
    const oid = parseInt(organizationId, 10);
    query = query.where(eq(departmentsTable.organizationId, oid));
  }

  const rows = await query.orderBy(departmentsTable.level, departmentsTable.orderIndex);

  if (parentId !== undefined) {
    const pid = parentId === "null" ? null : parseInt(parentId, 10);
    const filtered = rows.filter((r) =>
      pid === null ? r.parentId === null : r.parentId === pid
    );
    res.json(filtered);
    return;
  }

  res.json(rows);
});

router.post("/departments", async (req, res) => {
  const body = z.object({
    organizationId: z.number().int(),
    parentId: z.number().int().optional(),
    name: z.string().min(1),
    nameEn: z.string().optional(),
    code: z.string().optional(),
    level: z.number().int().optional(),
    description: z.string().optional(),
    managerId: z.number().int().optional(),
    orderIndex: z.number().int().optional(),
  }).parse(req.body);
  const [dept] = await db.insert(departmentsTable).values(body).returning();
  res.status(201).json(dept);
});

router.get("/departments/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [dept] = await db.select().from(departmentsTable).where(eq(departmentsTable.id, id));
  if (!dept) { res.status(404).json({ error: "Not found" }); return; }

  const children = await db.select().from(departmentsTable)
    .where(eq(departmentsTable.parentId, id))
    .orderBy(departmentsTable.orderIndex);

  const members = await db.select().from(userDepartmentsTable)
    .where(eq(userDepartmentsTable.departmentId, id));

  res.json({ ...dept, children, members });
});

router.patch("/departments/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const body = z.object({
    name: z.string().optional(),
    nameEn: z.string().optional(),
    code: z.string().optional(),
    level: z.number().int().optional(),
    description: z.string().optional(),
    managerId: z.number().int().nullable().optional(),
    status: z.string().optional(),
    orderIndex: z.number().int().optional(),
    parentId: z.number().int().nullable().optional(),
  }).parse(req.body);
  const [updated] = await db.update(departmentsTable).set(body)
    .where(eq(departmentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/departments/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(userDepartmentsTable).where(eq(userDepartmentsTable.departmentId, id));
  await db.delete(departmentsTable).where(eq(departmentsTable.id, id));
  res.json({ success: true });
});

// ─── User-Department assignments ──────────────────────────────────────────────

router.get("/user-departments", async (req, res) => {
  const { userId, departmentId } = req.query as Record<string, string | undefined>;
  const conditions = [];
  if (userId) conditions.push(eq(userDepartmentsTable.userId, parseInt(userId, 10)));
  if (departmentId) conditions.push(eq(userDepartmentsTable.departmentId, parseInt(departmentId, 10)));

  const rows = conditions.length > 0
    ? await db.select().from(userDepartmentsTable).where(and(...conditions as [any, ...any[]]))
    : await db.select().from(userDepartmentsTable);

  res.json(rows);
});

router.post("/user-departments", async (req, res) => {
  const body = z.object({
    userId: z.number().int(),
    departmentId: z.number().int(),
    isPrimary: z.boolean().optional(),
    role: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).parse(req.body);

  // If isPrimary = true, clear existing primary for this user
  if (body.isPrimary !== false) {
    await db.update(userDepartmentsTable)
      .set({ isPrimary: false })
      .where(and(
        eq(userDepartmentsTable.userId, body.userId),
        eq(userDepartmentsTable.isPrimary, true)
      ));
  }

  const [row] = await db.insert(userDepartmentsTable).values(body).returning();
  res.status(201).json(row);
});

router.delete("/user-departments/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(userDepartmentsTable).where(eq(userDepartmentsTable.id, id));
  res.json({ success: true });
});

export default router;

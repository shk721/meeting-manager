import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { z } from "zod";

const router: IRouter = Router();

export function formatUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    department: user.department ?? null,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt?.toISOString(),
  };
}

function requireAdmin(req: any, res: any, next: any) {
  if (req.session?.userId === undefined) { res.status(401).json({ error: "Unauthorized" }); return; }
  db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).then(([u]) => {
    if (!u || u.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    next();
  }).catch(next);
}

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.fullName);
  res.json(users.map(formatUser));
});

const CreateUserBody = z.object({
  username: z.string().min(2),
  password: z.string().min(4),
  fullName: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "manager", "member", "viewer"]),
  department: z.string().optional(),
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const existing = await db.select().from(usersTable).where(eq(usersTable.username, parsed.data.username));
  if (existing.length > 0) { res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" }); return; }
  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(formatUser(user));
});

const UpdateUserBody = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(["admin", "manager", "member", "viewer"]).optional(),
  department: z.string().optional(),
  password: z.string().min(4).optional(),
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [user] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionUserId = (req.session as any)?.userId;
  if (id === sessionUserId) { res.status(400).json({ error: "لا يمكن حذف حسابك الخاص" }); return; }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).end();
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

const VALID_ROLES = ["admin", "manager", "member", "viewer"] as const;

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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.fullName);
  res.json(users.map(formatUser));
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const { username, password, fullName, email, role, department } = req.body ?? {};
  if (!username || username.length < 2) { res.status(400).json({ error: "اسم المستخدم قصير جداً" }); return; }
  if (!password || password.length < 4) { res.status(400).json({ error: "كلمة المرور قصيرة جداً" }); return; }
  if (!fullName || fullName.length < 2) { res.status(400).json({ error: "الاسم الكامل مطلوب" }); return; }
  if (!email || !isValidEmail(email)) { res.status(400).json({ error: "البريد الإلكتروني غير صحيح" }); return; }
  if (!role || !VALID_ROLES.includes(role)) { res.status(400).json({ error: "الدور غير صحيح" }); return; }

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) { res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" }); return; }

  const [user] = await db.insert(usersTable).values({ username, password, fullName, email, role, department: department || null }).returning();
  res.status(201).json(formatUser(user));
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { fullName, email, role, department, password } = req.body ?? {};
  const update: any = {};
  if (fullName) update.fullName = fullName;
  if (email) {
    if (!isValidEmail(email)) { res.status(400).json({ error: "البريد الإلكتروني غير صحيح" }); return; }
    update.email = email;
  }
  if (role) {
    if (!VALID_ROLES.includes(role)) { res.status(400).json({ error: "الدور غير صحيح" }); return; }
    update.role = role;
  }
  if (department !== undefined) update.department = department || null;
  if (password) {
    if (password.length < 4) { res.status(400).json({ error: "كلمة المرور قصيرة جداً" }); return; }
    update.password = password;
  }

  const [user] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
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

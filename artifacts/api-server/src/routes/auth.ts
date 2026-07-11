import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { LoginBody } from "@workspace/api-zod";
import { formatUser } from "./users";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Support plain-text passwords from before bcrypt migration: compare directly
  // and re-hash on successful login so the account is upgraded automatically.
  let valid = await bcrypt.compare(password, user.password);
  if (!valid && !user.password.startsWith("$2")) {
    valid = password === user.password;
    if (valid) {
      const hashed = await bcrypt.hash(password, 10);
      await db.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, user.id));
    }
  }

  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  (req.session as any).userId = user.id;

  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session save failed" });
      return;
    }
    res.json({
      user: formatUser(user),
      token: `session-${user.id}`,
    });
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(formatUser(user));
});

export default router;

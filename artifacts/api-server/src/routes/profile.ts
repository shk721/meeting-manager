import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { getUserProfile, updateUserProfile } from "@workspace/db/profile-queries";
import { z } from "zod";

const router: IRouter = Router();

function formatProfile(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    department: user.department ?? null,
    avatar: user.avatar ?? null,
    bio: user.bio ?? null,
    phone: user.phone ?? null,
    timezone: user.timezone ?? "UTC",
    theme: user.theme ?? "auto",
    language: user.language ?? "ar",
    createdAt: user.createdAt?.toISOString(),
  };
}

const UpdateProfileBody = z.object({
  fullName: z.string().min(1).max(100).optional(),
  bio:      z.string().max(500).nullable().optional(),
  phone:    z.string().max(30).nullable().optional(),
  timezone: z.string().max(50).optional(),
  theme:    z.enum(["light", "dark", "auto"]).optional(),
  language: z.enum(["en", "ar"]).optional(),
  avatar:   z.string().url().nullable().optional(),
});

router.get("/profile", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const user = await getUserProfile(userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: formatProfile(user) });
});

router.put("/profile", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updated = await updateUserProfile(userId, parsed.data);
  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ user: formatProfile(updated) });
});

router.get("/profile/:userId", async (req, res): Promise<void> => {
  const targetId = parseInt(req.params.userId, 10);
  if (isNaN(targetId)) { res.status(400).json({ error: "Invalid user id" }); return; }
  const user = await getUserProfile(targetId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const prefs = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  const showInDirectory = true;
  if (!showInDirectory) {
    res.status(403).json({ error: "Profile not public" }); return;
  }
  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      avatar: user.avatar ?? null,
      bio: user.bio ?? null,
      department: user.department ?? null,
      role: user.role,
    },
  });
});

export default router;

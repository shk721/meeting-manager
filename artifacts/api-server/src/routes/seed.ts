import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/seed", async (req, res): Promise<void> => {
  const expectedKey = process.env.SEED_KEY;
  if (!expectedKey || req.headers["x-seed-key"] !== expectedKey) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [adminHash, managerHash, memberHash, viewerHash] = await Promise.all([
    bcrypt.hash("admin123",   10),
    bcrypt.hash("manager123", 10),
    bcrypt.hash("member123",  10),
    bcrypt.hash("viewer123",  10),
  ]);

  const users = [
    {
      username: "admin",
      password: adminHash,
      fullName: "أحمد المنصوري",
      email: "admin@meeting-manager.com",
      role: "admin" as const,
      department: "الإدارة",
    },
    {
      username: "manager",
      password: managerHash,
      fullName: "سارة القحطاني",
      email: "manager@meeting-manager.com",
      role: "manager" as const,
      department: "تقنية المعلومات",
    },
    {
      username: "member1",
      password: memberHash,
      fullName: "محمد العتيبي",
      email: "member1@meeting-manager.com",
      role: "member" as const,
      department: "الموارد البشرية",
    },
    {
      username: "viewer",
      password: viewerHash,
      fullName: "نورة الشمري",
      email: "viewer@meeting-manager.com",
      role: "viewer" as const,
      department: "المالية",
    },
  ];

  // Upsert: create new users or update password hash for existing ones
  for (const user of users) {
    await db.insert(usersTable).values(user)
      .onConflictDoUpdate({ target: usersTable.username, set: { password: user.password } });
  }

  res.json({ success: true, message: "Database seeded successfully" });
});

export default router;

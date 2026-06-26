import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/seed", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV !== "development" && req.headers["x-seed-key"] !== process.env.SESSION_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.insert(usersTable).values([
    {
      username: "admin",
      password: "admin123",
      fullName: "مدير النظام",
      email: "admin@meeting-manager.com",
      role: "admin",
      department: "الإدارة",
    },
    {
      username: "manager1",
      password: "manager123",
      fullName: "أحمد المدير",
      email: "manager1@meeting-manager.com",
      role: "manager",
      department: "تقنية المعلومات",
    },
    {
      username: "member1",
      password: "member123",
      fullName: "سارة العضو",
      email: "member1@meeting-manager.com",
      role: "member",
      department: "الموارد البشرية",
    },
  ]).onConflictDoNothing();

  res.json({ success: true, message: "Database seeded successfully" });
});

export default router;

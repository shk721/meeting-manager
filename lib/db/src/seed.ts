import bcrypt from "bcryptjs";
import { db, usersTable } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  const [h_admin, h_manager, h_member, h_viewer] = await Promise.all([
    bcrypt.hash("admin123",   10),
    bcrypt.hash("manager123", 10),
    bcrypt.hash("member123",  10),
    bcrypt.hash("viewer123",  10),
  ]);

  await db.insert(usersTable).values([
    {
      username: "admin",
      password: h_admin,
      fullName: "أحمد المنصوري",
      email: "admin@meeting-manager.com",
      role: "admin",
      department: "الإدارة",
    },
    {
      username: "manager",
      password: h_manager,
      fullName: "سارة القحطاني",
      email: "manager@meeting-manager.com",
      role: "manager",
      department: "تقنية المعلومات",
    },
    {
      username: "member1",
      password: h_member,
      fullName: "محمد العتيبي",
      email: "member1@meeting-manager.com",
      role: "member",
      department: "الموارد البشرية",
    },
    {
      username: "viewer",
      password: h_viewer,
      fullName: "نورة الشمري",
      email: "viewer@meeting-manager.com",
      role: "viewer",
      department: "المالية",
    },
  ]).onConflictDoNothing();

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

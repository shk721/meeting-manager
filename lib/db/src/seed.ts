import { db, usersTable } from "./index.js";

async function seed() {
  console.log("Seeding database...");

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

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

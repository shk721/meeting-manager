import { db, usersTable } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  await db.insert(usersTable).values([
    {
      username: "admin",
      password: "admin123",
      fullName: "أحمد المنصوري",
      email: "admin@meeting-manager.com",
      role: "admin",
      department: "الإدارة",
    },
    {
      username: "manager",
      password: "manager123",
      fullName: "سارة القحطاني",
      email: "manager@meeting-manager.com",
      role: "manager",
      department: "تقنية المعلومات",
    },
    {
      username: "member1",
      password: "member123",
      fullName: "محمد العتيبي",
      email: "member1@meeting-manager.com",
      role: "member",
      department: "الموارد البشرية",
    },
    {
      username: "viewer",
      password: "viewer123",
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

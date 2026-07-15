import { eq, inArray } from "drizzle-orm";
import { db, plansTable, planStaffTable, usersTable } from "@workspace/db";

export interface ParticipantFilters {
  location?: string;
  department?: string;
  status?: string;
}

export interface ParticipantListData {
  plan: { id: number; title: string; status: string };
  participants: Array<{
    rowNum: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    specialty: string | null;
    employmentStatus: string;
    employmentStatusLabel: string;
    workLocation: string | null;
    department: string | null;
    startDate: string | null;
    endDate: string | null;
    notes: string | null;
    isExternal: boolean;
  }>;
  filters: ParticipantFilters;
  totalCount: number;
  generatedAt: string;
}

const EMP_LABELS: Record<string, string> = {
  secondment:    "انتداب",
  assignment:    "تكليف",
  regular_hours: "خلال الدوام الرسمي",
};

export async function getParticipantListData(
  planId: number,
  filters: ParticipantFilters = {}
): Promise<ParticipantListData | null> {
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
  if (!plan) return null;

  const rows = await db.select().from(planStaffTable)
    .where(eq(planStaffTable.planId, planId))
    .orderBy(planStaffTable.createdAt);

  const userIds = rows.map(r => r.userId).filter(Boolean) as number[];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  let participants = rows.map(row => {
    const user = row.userId ? userMap.get(row.userId) : null;
    return {
      name:                 user?.fullName    ?? row.externalName    ?? "—",
      email:                user?.email       ?? row.externalEmail   ?? null,
      phone:                row.externalPhone ?? null,
      role:                 row.role,
      specialty:            row.specialty     ?? null,
      employmentStatus:     row.employmentStatus,
      employmentStatusLabel: EMP_LABELS[row.employmentStatus] ?? row.employmentStatus,
      workLocation:         row.workLocation  ?? null,
      department:           row.department    ?? null,
      startDate:            row.startDate     ?? null,
      endDate:              row.endDate       ?? null,
      notes:                row.notes         ?? null,
      isExternal:           !row.userId,
    };
  });

  if (filters.status)     participants = participants.filter(p => p.employmentStatus === filters.status);
  if (filters.location)   participants = participants.filter(p => p.workLocation?.includes(filters.location!) ?? false);
  if (filters.department) participants = participants.filter(p => p.department?.includes(filters.department!) ?? false);

  return {
    plan: { id: plan.id, title: plan.title, status: plan.status },
    participants: participants.map((p, i) => ({ rowNum: i + 1, ...p })),
    filters,
    totalCount: participants.length,
    generatedAt: new Date().toISOString(),
  };
}

import { eq, inArray } from "drizzle-orm";
import { db, governanceContextsTable, governanceMembersTable, usersTable } from "@workspace/db";

const ROLE_LABELS: Record<string, string> = {
  head:       "رئيس",
  vice_chair: "نائب الرئيس",
  secretary:  "أمين سر",
  member:     "عضو",
  observer:   "مراقب",
  alternate:  "بديل",
};

const TYPE_LABELS: Record<string, string> = {
  committee:     "لجنة",
  board:         "مجلس",
  team:          "فريق",
  working_group: "فريق عمل",
  task_force:    "فرقة مهام",
  joint:         "مشترك",
};

export interface GovernanceParticipantListData {
  context: { id: number; name: string; type: string; typeLabel: string; quorumPercent: number; status: string };
  members: Array<{
    rowNum: number;
    name: string;
    email: string | null;
    role: string;
    roleLabel: string;
    isVoting: boolean;
    isExternal: boolean;
  }>;
  totalCount: number;
  votingCount: number;
  quorumCount: number;
  generatedAt: string;
}

export async function getGovernanceParticipantListData(
  contextId: number
): Promise<GovernanceParticipantListData | null> {
  const [context] = await db.select().from(governanceContextsTable)
    .where(eq(governanceContextsTable.id, contextId));
  if (!context) return null;

  const rows = await db.select().from(governanceMembersTable)
    .where(eq(governanceMembersTable.governanceContextId, contextId))
    .orderBy(governanceMembersTable.createdAt);

  const userIds = rows.map(r => r.userId).filter(Boolean) as number[];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const members = rows.map((row, i) => {
    const user = row.userId ? userMap.get(row.userId) : null;
    return {
      rowNum: i + 1,
      name: user?.fullName ?? row.externalName ?? "—",
      email: user?.email ?? row.externalEmail ?? null,
      role: row.role,
      roleLabel: ROLE_LABELS[row.role] ?? row.role,
      isVoting: row.isVoting,
      isExternal: !row.userId,
    };
  });

  const votingCount = members.filter(m => m.isVoting).length;

  return {
    context: {
      id: context.id,
      name: context.name,
      type: context.type,
      typeLabel: TYPE_LABELS[context.type] ?? context.type,
      quorumPercent: context.quorumPercent,
      status: context.status,
    },
    members,
    totalCount: members.length,
    votingCount,
    quorumCount: Math.ceil(votingCount * context.quorumPercent / 100),
    generatedAt: new Date().toISOString(),
  };
}

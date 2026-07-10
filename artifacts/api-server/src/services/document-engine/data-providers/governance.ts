import { eq, inArray } from "drizzle-orm";
import {
  db, governanceContextsTable, governanceMembersTable, decisionsTable,
  meetingsTable, usersTable,
} from "@workspace/db";

export async function getGovernanceReportData(contextId: number) {
  const [context] = await db.select().from(governanceContextsTable).where(eq(governanceContextsTable.id, contextId));
  if (!context) return null;

  const memberRows = await db.select().from(governanceMembersTable)
    .where(eq(governanceMembersTable.governanceContextId, contextId));

  const internalUserIds = [...new Set(memberRows.map(m => m.userId).filter(Boolean) as number[])];
  const internalUsers = internalUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, internalUserIds))
    : [];
  const userMap = new Map(internalUsers.map(u => [u.id, u]));

  const members = memberRows.map(m => {
    const user = m.userId ? userMap.get(m.userId) : null;
    return {
      fullName: user ? user.fullName : (m.externalName ?? "—"),
      email: user ? (user.email ?? null) : (m.externalEmail ?? null),
      role: m.role,
      isVoting: m.isVoting,
      startDate: m.startDate ?? null,
      endDate: m.endDate ?? null,
    };
  });

  const decisions = await db.select().from(decisionsTable)
    .where(eq(decisionsTable.governanceContextId, contextId));

  const decisionMeetingIds = [...new Set(decisions.map(d => d.meetingId).filter(Boolean) as number[])];
  const decisionMeetings = decisionMeetingIds.length > 0
    ? await db.select().from(meetingsTable).where(inArray(meetingsTable.id, decisionMeetingIds))
    : [];
  const meetingTitleMap = new Map(decisionMeetings.map(m => [m.id, m.title]));

  const linkedMeetings = await db.select().from(meetingsTable)
    .where(eq(meetingsTable.governanceContextId, contextId));

  return {
    context: {
      id: context.id,
      name: context.name,
      type: context.type,
      scope: context.scope,
      status: context.status,
      description: context.description ?? null,
      mandate: context.mandate ?? null,
      meetingFrequency: context.meetingFrequency ?? null,
      quorumPercent: context.quorumPercent,
      establishedAt: context.establishedAt ?? null,
    },
    members,
    decisions: decisions.map(d => ({
      title: d.title ?? null,
      content: d.content,
      status: d.status,
      meetingTitle: d.meetingId ? meetingTitleMap.get(d.meetingId) ?? null : null,
    })),
    linkedMeetings: linkedMeetings.map(m => ({
      title: m.title,
      date: m.date,
      status: m.status,
    })),
  };
}

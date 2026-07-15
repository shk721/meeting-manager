import { eq, inArray } from "drizzle-orm";
import { db, meetingsTable, meetingAttendeesTable, usersTable } from "@workspace/db";

export interface MeetingParticipantListData {
  meeting: { id: number; title: string; date: string; time: string; location: string | null };
  participants: Array<{
    rowNum: number;
    name: string;
    email: string | null;
  }>;
  totalCount: number;
  generatedAt: string;
}

export async function getMeetingParticipantListData(
  meetingId: number
): Promise<MeetingParticipantListData | null> {
  const [meeting] = await db.select().from(meetingsTable).where(eq(meetingsTable.id, meetingId));
  if (!meeting) return null;

  const attendees = await db.select().from(meetingAttendeesTable)
    .where(eq(meetingAttendeesTable.meetingId, meetingId))
    .orderBy(meetingAttendeesTable.id);

  const userIds = attendees.map(a => a.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const participants = attendees.map((a, i) => {
    const user = userMap.get(a.userId);
    return {
      rowNum: i + 1,
      name: user?.fullName ?? `مستخدم #${a.userId}`,
      email: user?.email ?? null,
    };
  });

  return {
    meeting: {
      id: meeting.id,
      title: meeting.title,
      date: meeting.date,
      time: meeting.time,
      location: meeting.location ?? null,
    },
    participants,
    totalCount: participants.length,
    generatedAt: new Date().toISOString(),
  };
}

import { eq } from "drizzle-orm";
import { db, usersTable } from "./index.js";

type ProfileUpdate = {
  bio?: string | null;
  phone?: string | null;
  timezone?: string;
  theme?: string;
  language?: string;
  avatar?: string | null;
  fullName?: string;
};

export async function getUserProfile(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  return user ?? null;
}

export async function updateUserProfile(userId: number, data: ProfileUpdate) {
  const updates: Record<string, unknown> = {};
  if (data.bio !== undefined)       updates.bio = data.bio;
  if (data.phone !== undefined)     updates.phone = data.phone;
  if (data.timezone !== undefined)  updates.timezone = data.timezone;
  if (data.theme !== undefined)     updates.theme = data.theme;
  if (data.language !== undefined)  updates.language = data.language;
  if (data.avatar !== undefined)    updates.avatar = data.avatar;
  if (data.fullName !== undefined)  updates.fullName = data.fullName;

  if (Object.keys(updates).length === 0) {
    return getUserProfile(userId);
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates as any)
    .where(eq(usersTable.id, userId))
    .returning();
  return updated ?? null;
}

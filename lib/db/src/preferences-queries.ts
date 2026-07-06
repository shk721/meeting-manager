import { eq } from "drizzle-orm";
import { db, preferencesTable } from "./index.js";

type PrefsUpdate = {
  notificationsEmail?: boolean;
  notificationsPush?: boolean;
  notificationsSms?: boolean;
  emailDigest?: string;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string | null;
  twoFactorPendingCode?: string | null;
  showInDirectory?: boolean;
};

async function ensurePrefs(userId: number) {
  const existing = await db.select().from(preferencesTable).where(eq(preferencesTable.userId, userId));
  if (existing.length > 0) return existing[0];
  const [created] = await db.insert(preferencesTable).values({ userId }).returning();
  return created;
}

export async function getUserPreferences(userId: number) {
  return ensurePrefs(userId);
}

export async function updateUserPreferences(userId: number, data: PrefsUpdate) {
  await ensurePrefs(userId);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.notificationsEmail !== undefined) updates.notificationsEmail = data.notificationsEmail;
  if (data.notificationsPush  !== undefined) updates.notificationsPush  = data.notificationsPush;
  if (data.notificationsSms   !== undefined) updates.notificationsSms   = data.notificationsSms;
  if (data.emailDigest        !== undefined) updates.emailDigest        = data.emailDigest;
  if (data.twoFactorEnabled   !== undefined) updates.twoFactorEnabled   = data.twoFactorEnabled;
  if (data.twoFactorMethod    !== undefined) updates.twoFactorMethod    = data.twoFactorMethod;
  if (data.twoFactorPendingCode !== undefined) updates.twoFactorPendingCode = data.twoFactorPendingCode;
  if (data.showInDirectory    !== undefined) updates.showInDirectory    = data.showInDirectory;

  const [updated] = await db
    .update(preferencesTable)
    .set(updates as any)
    .where(eq(preferencesTable.userId, userId))
    .returning();
  return updated;
}

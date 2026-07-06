import { eq, and, desc, count } from "drizzle-orm";
import { db, notificationsTable } from "./index.js";

export async function createNotification(data: {
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedId?: number;
  relatedType?: string;
  metadata?: object;
  expiresAt?: Date;
}) {
  const [row] = await db.insert(notificationsTable).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedId: data.relatedId,
    relatedType: data.relatedType,
    metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
    expiresAt: data.expiresAt,
  }).returning();
  return row;
}

export async function getUnreadCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  return row?.value ?? 0;
}

export async function getUserNotifications(userId: number, limit = 20, offset = 0) {
  return db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function markAsRead(id: number, userId: number) {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
}

export async function markAllAsRead(userId: number) {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(eq(notificationsTable.userId, userId));
}

export async function deleteNotification(id: number, userId: number) {
  await db
    .delete(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId)));
}

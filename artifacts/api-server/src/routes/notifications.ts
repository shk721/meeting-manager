import { Router, type IRouter } from "express";
import {
  createNotification, getUnreadCount, getUserNotifications,
  markAsRead, markAllAsRead, deleteNotification,
} from "@workspace/db/notifications-queries";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const limit = Math.min(parseInt((req.query.limit as string) ?? "20", 10), 100);
  const offset = parseInt((req.query.offset as string) ?? "0", 10);
  const rows = await getUserNotifications(userId, limit, offset);
  res.json(rows.map(r => ({
    ...r,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString() ?? null,
  })));
});

router.get("/notifications/unread-count", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const count = await getUnreadCount(userId);
  res.json({ count });
});

router.post("/notifications/:id/read", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await markAsRead(id, userId);
  res.sendStatus(204);
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  await markAllAsRead(userId);
  res.sendStatus(204);
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const userId = (req.session as any).userId as number;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await deleteNotification(id, userId);
  res.sendStatus(204);
});

export default router;
export { createNotification };

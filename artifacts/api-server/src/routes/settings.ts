import { Router, type IRouter } from "express";
import { getUserPreferences, updateUserPreferences } from "@workspace/db/preferences-queries";
import { z } from "zod";

const router: IRouter = Router();

function authGuard(req: any, res: any): number | null {
  const userId = req.session?.userId as number | undefined;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return userId;
}

function formatPrefs(p: any) {
  return {
    id: p.id,
    userId: p.userId,
    notificationsEmail: p.notificationsEmail,
    notificationsPush:  p.notificationsPush,
    notificationsSms:   p.notificationsSms,
    emailDigest:        p.emailDigest,
    twoFactorEnabled:   p.twoFactorEnabled,
    twoFactorMethod:    p.twoFactorMethod ?? null,
    showInDirectory:    p.showInDirectory,
    createdAt:          p.createdAt?.toISOString(),
    updatedAt:          p.updatedAt?.toISOString(),
  };
}

const UpdatePrefsBody = z.object({
  notificationsEmail: z.boolean().optional(),
  notificationsPush:  z.boolean().optional(),
  notificationsSms:   z.boolean().optional(),
  emailDigest:        z.enum(["daily", "weekly", "none"]).optional(),
  showInDirectory:    z.boolean().optional(),
});

router.get("/settings/preferences", async (req, res): Promise<void> => {
  const userId = authGuard(req, res);
  if (!userId) return;
  const prefs = await getUserPreferences(userId);
  res.json({ preferences: formatPrefs(prefs) });
});

router.put("/settings/preferences", async (req, res): Promise<void> => {
  const userId = authGuard(req, res);
  if (!userId) return;
  const parsed = UpdatePrefsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updated = await updateUserPreferences(userId, parsed.data);
  res.json({ preferences: formatPrefs(updated) });
});

router.post("/settings/two-factor/enable", async (req, res): Promise<void> => {
  const userId = authGuard(req, res);
  if (!userId) return;
  const parsed = z.object({ method: z.enum(["email", "sms"]) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "method must be email or sms" }); return; }
  const { method } = parsed.data;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await updateUserPreferences(userId, { twoFactorMethod: method, twoFactorPendingCode: code });
  res.json({
    secret_key: code,
    qrCode: `otpauth://totp/MeetingManager?secret=${code}&method=${method}`,
    method,
  });
});

router.post("/settings/two-factor/verify", async (req, res): Promise<void> => {
  const userId = authGuard(req, res);
  if (!userId) return;
  const parsed = z.object({ code: z.string().length(6) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "code must be 6 digits" }); return; }
  const prefs = await getUserPreferences(userId);
  if (!prefs.twoFactorPendingCode || prefs.twoFactorPendingCode !== parsed.data.code) {
    res.status(400).json({ error: "Invalid code" }); return;
  }
  await updateUserPreferences(userId, { twoFactorEnabled: true, twoFactorPendingCode: null });
  res.json({ enabled: true });
});

router.post("/settings/two-factor/disable", async (req, res): Promise<void> => {
  const userId = authGuard(req, res);
  if (!userId) return;
  await updateUserPreferences(userId, { twoFactorEnabled: false, twoFactorMethod: null, twoFactorPendingCode: null });
  res.json({ disabled: true });
});

export default router;

import { Router, type IRouter } from "express";
import multer from "multer";
import { eq } from "drizzle-orm";
import { db, meetingAttachmentsTable } from "@workspace/db";
import { requireRole } from "../middleware/auth";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

router.get("/meetings/:id/attachments", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const attachments = await db.select({
    id: meetingAttachmentsTable.id,
    meetingId: meetingAttachmentsTable.meetingId,
    originalName: meetingAttachmentsTable.originalName,
    mimeType: meetingAttachmentsTable.mimeType,
    sizeBytes: meetingAttachmentsTable.sizeBytes,
    uploadedById: meetingAttachmentsTable.uploadedById,
    createdAt: meetingAttachmentsTable.createdAt,
  }).from(meetingAttachmentsTable).where(eq(meetingAttachmentsTable.meetingId, id));

  res.json(attachments.map(a => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/meetings/:id/attachments", upload.single("file"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }

  const session = req.session as any;
  const [attachment] = await db.insert(meetingAttachmentsTable).values({
    meetingId: id,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    data: req.file.buffer.toString("base64"),
    uploadedById: session.userId ?? null,
  }).returning();

  res.status(201).json({
    id: attachment.id,
    meetingId: attachment.meetingId,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    uploadedById: attachment.uploadedById ?? null,
    createdAt: attachment.createdAt.toISOString(),
  });
});

router.get("/attachments/:id/download", async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [attachment] = await db.select().from(meetingAttachmentsTable)
    .where(eq(meetingAttachmentsTable.id, id));
  if (!attachment) { res.status(404).json({ error: "Attachment not found" }); return; }

  const buffer = Buffer.from(attachment.data, "base64");
  res.setHeader("Content-Type", attachment.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.originalName)}"`);
  res.setHeader("Content-Length", buffer.length);
  res.send(buffer);
});

router.delete("/attachments/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(meetingAttachmentsTable).where(eq(meetingAttachmentsTable.id, id));
  res.sendStatus(204);
});

export default router;

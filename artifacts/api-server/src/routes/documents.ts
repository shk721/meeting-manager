import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, generatedDocumentsTable } from "@workspace/db";
import { getMeetingReportData } from "../services/document-engine/data-providers/meeting";
import { getPlanReportData } from "../services/document-engine/data-providers/plan";
import { getGovernanceReportData } from "../services/document-engine/data-providers/governance";
import { generateMeetingReportHtml } from "../services/document-engine/html-templates/meeting-report";
import { generatePlanReportHtml } from "../services/document-engine/html-templates/plan-report";
import { generateGovernanceReportHtml } from "../services/document-engine/html-templates/governance-report";
import { renderHtmlToPdf } from "../services/document-engine/pdf-renderer";
import fs from "fs/promises";

const router: IRouter = Router();

// POST /api/documents/generate
router.post("/documents/generate", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const { entityType, entityId } = req.body as { entityType: string; entityId: number };

  if (!entityType || !entityId || isNaN(Number(entityId))) {
    res.status(400).json({ error: "entityType and entityId are required" });
    return;
  }

  const id = Number(entityId);

  try {
    let html: string;
    let title: string;

    if (entityType === "meeting") {
      const data = await getMeetingReportData(id);
      if (!data) { res.status(404).json({ error: "Meeting not found" }); return; }
      html = generateMeetingReportHtml(data);
      title = `محضر اجتماع — ${data.meeting.title}`;
    } else if (entityType === "plan") {
      const data = await getPlanReportData(id);
      if (!data) { res.status(404).json({ error: "Plan not found" }); return; }
      html = generatePlanReportHtml(data);
      title = `تقرير خطة — ${data.plan.title}`;
    } else if (entityType === "governance") {
      const data = await getGovernanceReportData(id);
      if (!data) { res.status(404).json({ error: "Governance context not found" }); return; }
      html = generateGovernanceReportHtml(data);
      title = `تقرير هيئة — ${data.context.name}`;
    } else {
      res.status(400).json({ error: "entityType must be meeting | plan | governance" });
      return;
    }

    const filename = `${entityType}-${id}-${Date.now()}.pdf`;
    const { filePath } = await renderHtmlToPdf(html, filename);

    const [doc] = await db.insert(generatedDocumentsTable).values({
      entityType,
      entityId: id,
      format: "pdf",
      title,
      status: "generated",
      fileUrl: filePath,
      createdById: userId ?? null,
    }).returning();

    res.json({ id: doc.id, downloadUrl: `/api/documents/${doc.id}/download` });
  } catch (err) {
    console.error("Document generation failed:", err);
    res.status(500).json({ error: "Document generation failed" });
  }
});

// GET /api/documents
router.get("/documents", async (req, res): Promise<void> => {
  const userId = req.session.userId;
  const docs = await db.select().from(generatedDocumentsTable)
    .where(eq(generatedDocumentsTable.createdById, userId!))
    .orderBy(generatedDocumentsTable.createdAt);
  res.json(docs.reverse());
});

// GET /api/documents/:id/download
router.get("/documents/:id/download", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [doc] = await db.select().from(generatedDocumentsTable)
    .where(eq(generatedDocumentsTable.id, id));
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (!doc.fileUrl) { res.status(404).json({ error: "File not available" }); return; }

  try {
    const buffer = await fs.readFile(doc.fileUrl);
    const safeName = doc.title.replace(/[^\w؀-ۿ\s-]/g, "").trim().replace(/\s+/g, "-") || "report";
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Content-Length": buffer.length,
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ error: "File not found on disk" });
  }
});

export default router;

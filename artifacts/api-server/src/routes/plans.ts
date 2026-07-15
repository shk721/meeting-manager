import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  plansTable, planPhasesTable, planWorksstreamsTable,
  tasksTable, decisionsTable, deliverablesTable, meetingsTable,
  planStaffTable, usersTable,
} from "@workspace/db/schema";
import { eq, sql, desc, inArray, and } from "drizzle-orm";
import { z } from "zod";
import { auditLog } from "../lib/audit-log";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

async function computePlanProgress(planId: number): Promise<number> {
  // Deliverable-based: if deliverables exist, they are the authoritative source
  const deliverables = await db.select({
    progressPercent: deliverablesTable.progressPercent,
    status: deliverablesTable.status,
  }).from(deliverablesTable).where(eq(deliverablesTable.planId, planId));

  if (deliverables.length > 0) {
    const total = deliverables.reduce((sum, d) => {
      // accepted = 100% regardless of progressPercent
      const pct = d.status === "accepted" ? 100 : (d.progressPercent ?? 0);
      return sum + pct;
    }, 0);
    return Math.round(total / deliverables.length);
  }

  // Fall back to task-based progress
  const tasks = await db.select({
    status: tasksTable.status,
    completionPercent: tasksTable.completionPercent,
    weight: tasksTable.progressWeight,
  }).from(tasksTable).where(eq(tasksTable.planId, planId));

  if (tasks.length === 0) return 0;
  const totalWeight = tasks.reduce((s, t) => s + (t.weight ?? 1), 0);
  const weightedDone = tasks.reduce((s, t) => {
    const pct = t.status === "completed" || t.status === "done" ? 100
      : (t.completionPercent ?? 0);
    return s + pct * (t.weight ?? 1);
  }, 0);
  return Math.round(weightedDone / (totalWeight * 100) * 100);
}

async function enrichPlan(p: typeof plansTable.$inferSelect) {
  const phases = await db.select().from(planPhasesTable)
    .where(eq(planPhasesTable.planId, p.id))
    .orderBy(planPhasesTable.orderIndex);

  const taskCount = await db.select({ c: sql<number>`count(*)` })
    .from(tasksTable).where(eq(tasksTable.planId, p.id));

  const progress = await computePlanProgress(p.id);

  return { ...p, phases, taskCount: Number(taskCount[0]?.c ?? 0), progress };
}

// ─── Plan Templates (seeded) ────────────────────────────────────────────────

const SEED_TEMPLATES = [
  {
    id: 1,
    name: "خطة الجاهزية الموسمية",
    type: "readiness",
    description: "قالب لخطط الجاهزية المتكررة كالحج والمناسبات الوطنية",
    phaseCount: 4,
    usageCount: 12,
    phases: ["مرحلة التخطيط المسبق", "مرحلة التجهيز", "مرحلة التشغيل", "مرحلة ما بعد الحدث"],
  },
  {
    id: 2,
    name: "خطة التمكين الرقمي",
    type: "operational",
    description: "قالب لتنفيذ مبادرات التمكين الرقمي وتبني التقنيات الحديثة",
    phaseCount: 5,
    usageCount: 8,
    phases: ["دراسة الوضع الراهن", "تصميم الحل", "تطوير الأنظمة", "الاختبار والتحقق", "الإطلاق والتشغيل"],
  },
  {
    id: 3,
    name: "خطة البنية التحتية",
    type: "operational",
    description: "قالب لمشاريع تطوير وصيانة البنية التحتية",
    phaseCount: 3,
    usageCount: 5,
    phases: ["الدراسة والتصميم", "التنفيذ والبناء", "الاختبار والاستلام"],
  },
  {
    id: 4,
    name: "تقييم ما بعد الحدث",
    type: "readiness",
    description: "قالب لتقييم الأداء واستخلاص الدروس المستفادة بعد الأحداث الكبرى",
    phaseCount: 3,
    usageCount: 6,
    phases: ["جمع البيانات والتقارير", "تحليل الأداء", "رفع التوصيات والتحسينات"],
  },
  {
    id: 5,
    name: "خطة سلسلة الإمداد واللوجستيات",
    type: "operational",
    description: "قالب لإدارة سلاسل الإمداد والعمليات اللوجستية",
    phaseCount: 4,
    usageCount: 3,
    phases: ["تخطيط الموارد والمخزون", "التعاقد مع الموردين", "العمليات والتوزيع", "المراجعة والتقييم"],
  },
  {
    id: 6,
    name: "خطة الاستجابة للطوارئ",
    type: "readiness",
    description: "قالب لخطط إدارة الأزمات والاستجابة للطوارئ",
    phaseCount: 3,
    usageCount: 4,
    phases: ["الاستعداد والتأهب", "الاستجابة الفورية", "التعافي وإعادة التشغيل"],
  },
];

router.get("/plan-templates", (_req, res): void => {
  res.json(SEED_TEMPLATES);
});

router.get("/plan-templates/:id", (req, res): void => {
  const id = parseInt(req.params.id, 10);
  const tpl = SEED_TEMPLATES.find(t => t.id === id);
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(tpl);
});

// ─── Plans CRUD ─────────────────────────────────────────────────────────────

const PlanBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["readiness", "operational"]).optional(),
  status: z.enum(["draft", "active", "in_progress", "on_hold", "overdue", "completed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
  templateId: z.number().optional(),
});

router.get("/plans", async (req, res): Promise<void> => {
  const rows = await db.select().from(plansTable).orderBy(desc(plansTable.createdAt));
  const enriched = await Promise.all(rows.map(enrichPlan));
  res.json(enriched);
});

router.post("/plans", async (req, res): Promise<void> => {
  const parsed = PlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const userId = (req.session as any)?.userId as number | undefined;
  const [plan] = await db.insert(plansTable).values({
    ...parsed.data,
    createdById: userId,
  }).returning();

  // If templateId provided, seed phases from template
  if (parsed.data.templateId) {
    const tpl = SEED_TEMPLATES.find(t => t.id === parsed.data.templateId);
    if (tpl) {
      await Promise.all(tpl.phases.map((title, i) =>
        db.insert(planPhasesTable).values({ planId: plan.id, title, orderIndex: i })
      ));
    }
  }

  auditLog({ entityType: "plan", entityId: plan.id, action: "create", actorId: userId });
  const enriched = await enrichPlan(plan);
  res.status(201).json(enriched);
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const phases = await db.select().from(planPhasesTable)
    .where(eq(planPhasesTable.planId, id)).orderBy(planPhasesTable.orderIndex);

  // Fetch all workstreams by planId — includes phase-linked and cross-phase (phaseId IS NULL)
  const workstreams = await db.select().from(planWorksstreamsTable)
    .where(eq(planWorksstreamsTable.planId, id))
    .orderBy(planWorksstreamsTable.orderIndex);

  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.planId, id));
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.planId, id));

  const progress = await computePlanProgress(id);

  res.json({ ...plan, phases, workstreams, tasks, decisions, progress });
});

router.patch("/plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = PlanBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(plansTable).set(parsed.data).where(eq(plansTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Plan not found" }); return; }
  const sessionUserId = (req.session as any).userId;
  auditLog({ entityType: "plan", entityId: id, action: "update", actorId: sessionUserId });
  const enriched = await enrichPlan(updated);
  res.json(enriched);
});

router.delete("/plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  // cascade: delete phases and workstreams
  const phases = await db.select({ id: planPhasesTable.id })
    .from(planPhasesTable).where(eq(planPhasesTable.planId, id));
  if (phases.length > 0) {
    await db.delete(planWorksstreamsTable)
      .where(inArray(planWorksstreamsTable.phaseId, phases.map(p => p.id)));
  }
  await db.delete(planPhasesTable).where(eq(planPhasesTable.planId, id));
  await db.delete(plansTable).where(eq(plansTable.id, id));
  const sessionUserId = (req.session as any).userId;
  auditLog({ entityType: "plan", entityId: id, action: "delete", actorId: sessionUserId });
  res.json({ deleted: true });
});

// ─── Plan Tasks / Decisions / Meetings ────────────────────────────────────

router.get("/plans/:id/tasks", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const tasks = await db.select().from(tasksTable).where(eq(tasksTable.planId, id));
  res.json(tasks);
});

router.get("/plans/:id/decisions", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const decisions = await db.select().from(decisionsTable).where(eq(decisionsTable.planId, id));
  res.json(decisions);
});

router.get("/plans/:id/meetings", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const meetings = await db.select().from(meetingsTable).where(eq(meetingsTable.planId, id));
  res.json(meetings);
});

router.post("/plans/:id/meetings/:meetingId", async (req, res): Promise<void> => {
  const planId = parseInt(req.params.id, 10);
  const meetingId = parseInt(req.params.meetingId, 10);
  const [meeting] = await db.update(meetingsTable)
    .set({ planId })
    .where(eq(meetingsTable.id, meetingId))
    .returning();
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }
  res.json(meeting);
});

router.delete("/plans/:id/meetings/:meetingId", async (req, res): Promise<void> => {
  const meetingId = parseInt(req.params.meetingId, 10);
  const [meeting] = await db.update(meetingsTable)
    .set({ planId: null })
    .where(eq(meetingsTable.id, meetingId))
    .returning();
  if (!meeting) { res.status(404).json({ error: "Meeting not found" }); return; }
  res.json({ unlinked: true });
});

// ─── Phases CRUD ────────────────────────────────────────────────────────────

const PhaseBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
});

router.get("/plans/:id/phases", async (req, res): Promise<void> => {
  const planId = parseInt(req.params.id, 10);
  const phases = await db.select().from(planPhasesTable)
    .where(eq(planPhasesTable.planId, planId)).orderBy(planPhasesTable.orderIndex);
  res.json(phases);
});

router.post("/plans/:id/phases", async (req, res): Promise<void> => {
  const planId = parseInt(req.params.id, 10);
  const parsed = PhaseBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [phase] = await db.insert(planPhasesTable).values({ ...parsed.data, planId }).returning();
  res.status(201).json(phase);
});

router.patch("/plan-phases/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = PhaseBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(planPhasesTable).set(parsed.data).where(eq(planPhasesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Phase not found" }); return; }
  res.json(updated);
});

router.delete("/plan-phases/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(planWorksstreamsTable).where(eq(planWorksstreamsTable.phaseId, id));
  await db.delete(planPhasesTable).where(eq(planPhasesTable.id, id));
  res.json({ deleted: true });
});

// ─── Workstreams CRUD ───────────────────────────────────────────────────────

const WorkstreamBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  orderIndex: z.number().optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
  // phaseId: null = cross-phase workstream spanning full plan
  phaseId: z.number().int().nullable().optional(),
});

// Direct plan-level workstream creation (cross-phase, phaseId optional)
router.post("/plans/:id/workstreams", async (req, res): Promise<void> => {
  const planId = parseInt(req.params.id, 10);
  const parsed = WorkstreamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, planId));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  const { phaseId, ...rest } = parsed.data;
  const [ws] = await db.insert(planWorksstreamsTable)
    .values({ ...rest, planId, phaseId: phaseId ?? null }).returning();
  res.status(201).json(ws);
});

router.get("/plan-phases/:id/workstreams", async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.id, 10);
  const ws = await db.select().from(planWorksstreamsTable)
    .where(eq(planWorksstreamsTable.phaseId, phaseId)).orderBy(planWorksstreamsTable.orderIndex);
  res.json(ws);
});

router.post("/plan-phases/:id/workstreams", async (req, res): Promise<void> => {
  const phaseId = parseInt(req.params.id, 10);
  const parsed = WorkstreamBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // look up planId from phase
  const [phase] = await db.select().from(planPhasesTable).where(eq(planPhasesTable.id, phaseId));
  if (!phase) { res.status(404).json({ error: "Phase not found" }); return; }
  const [ws] = await db.insert(planWorksstreamsTable)
    .values({ ...parsed.data, phaseId, planId: phase.planId }).returning();
  res.status(201).json(ws);
});

router.patch("/plan-workstreams/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const parsed = WorkstreamBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(planWorksstreamsTable).set(parsed.data).where(eq(planWorksstreamsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Workstream not found" }); return; }
  res.json(updated);
});

router.delete("/plan-workstreams/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(planWorksstreamsTable).where(eq(planWorksstreamsTable.id, id));
  res.json({ deleted: true });
});

// ─── Plan Staff (الكوادر البشرية) ──────────────────────────────────────────

const staffSchema = z.object({
  userId:           z.number().int().nullable().optional(),
  externalName:     z.string().max(200).nullable().optional(),
  externalEmail:    z.string().email().nullable().optional(),
  externalPhone:    z.string().max(30).nullable().optional(),
  role:             z.string().max(100).default("عضو"),
  specialty:        z.string().max(200).nullable().optional(),
  employmentStatus: z.enum(["secondment", "assignment", "regular_hours"]).default("regular_hours"),
  workLocation:     z.string().max(200).nullable().optional(),
  department:       z.string().max(200).nullable().optional(),
  startDate:        z.string().nullable().optional(),
  endDate:          z.string().nullable().optional(),
  notes:            z.string().nullable().optional(),
});

async function enrichStaffRow(row: typeof planStaffTable.$inferSelect) {
  let userName: string | null = null;
  let userEmail: string | null = null;
  let userPhone: string | null = null;
  if (row.userId) {
    const [u] = await db.select({ fullName: usersTable.fullName, email: usersTable.email, phone: usersTable.phone })
      .from(usersTable).where(eq(usersTable.id, row.userId));
    if (u) { userName = u.fullName; userEmail = u.email; userPhone = u.phone ?? null; }
  }
  const name  = row.externalName  ?? userName  ?? "—";
  const email = row.externalEmail ?? userEmail ?? null;
  const phone = row.externalPhone ?? userPhone ?? null;
  return { ...row, name, email, phone };
}

router.get("/plans/:id/staff", async (req, res): Promise<void> => {
  const planId = Number(req.params.id);
  const rows = await db.select().from(planStaffTable).where(eq(planStaffTable.planId, planId));
  const enriched = await Promise.all(rows.map(enrichStaffRow));
  res.json(enriched);
});

router.post("/plans/:id/staff", async (req, res): Promise<void> => {
  const planId = Number(req.params.id);
  const body = staffSchema.parse(req.body);
  const [row] = await db.insert(planStaffTable).values({ ...body, planId }).returning();
  res.status(201).json(await enrichStaffRow(row));
});

router.patch("/plans/:id/staff/:staffId", async (req, res): Promise<void> => {
  const planId   = Number(req.params.id);
  const staffId  = Number(req.params.staffId);
  const body = staffSchema.partial().parse(req.body);
  const [row] = await db.update(planStaffTable)
    .set(body)
    .where(and(eq(planStaffTable.id, staffId), eq(planStaffTable.planId, planId)))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(await enrichStaffRow(row));
});

router.delete("/plans/:id/staff/:staffId", async (req, res): Promise<void> => {
  const planId  = Number(req.params.id);
  const staffId = Number(req.params.staffId);
  await db.delete(planStaffTable)
    .where(and(eq(planStaffTable.id, staffId), eq(planStaffTable.planId, planId)));
  res.status(204).end();
});

// ─── Staff Export (Excel) ────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  secondment:    "انتداب",
  assignment:    "تكليف",
  regular_hours: "خلال الدوام الرسمي",
};

router.get("/plans/:id/staff/export", async (req, res): Promise<void> => {
  const planId = Number(req.params.id);
  const { location, department, status } = req.query as Record<string, string | undefined>;

  const [plan] = await db.select({ title: plansTable.title }).from(plansTable).where(eq(plansTable.id, planId));

  let rows = await db.select().from(planStaffTable).where(eq(planStaffTable.planId, planId));
  if (location)   rows = rows.filter(r => r.workLocation?.includes(location));
  if (department) rows = rows.filter(r => r.department?.includes(department));
  if (status)     rows = rows.filter(r => r.employmentStatus === status);

  const enriched = await Promise.all(rows.map(enrichStaffRow));

  // ── Build formatted RTL workbook with ExcelJS ──────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = "منصة إدارة الاجتماعات";
  wb.created = new Date();

  const ws = wb.addWorksheet("الكوادر البشرية", {
    views: [{ rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  const COLS = [
    { header: "الاسم",             key: "name",     width: 24 },
    { header: "الدور",             key: "role",     width: 18 },
    { header: "التخصص",           key: "spec",     width: 20 },
    { header: "الحالة الوظيفية",  key: "empSt",    width: 24 },
    { header: "موقع العمل",       key: "loc",      width: 22 },
    { header: "القسم / الإدارة",  key: "dept",     width: 22 },
    { header: "البريد الإلكتروني",key: "email",    width: 28 },
    { header: "رقم الجوال",       key: "phone",    width: 18 },
    { header: "المدة",            key: "dur",      width: 26 },
    { header: "ملاحظات",          key: "notes",    width: 22 },
  ];

  ws.columns = COLS.map(c => ({ key: c.key, width: c.width }));

  // Title row (row 1) — merged across all columns, dark-green bg, white bold
  ws.mergeCells(1, 1, 1, COLS.length);
  const titleCell = ws.getCell("A1");
  titleCell.value = `كوادر الخطة: ${plan?.title ?? ""}`;
  titleCell.font   = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F7A4D" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(1).height = 36;

  // Subtitle row (row 2) — generated-at + count, light-green bg
  ws.mergeCells(2, 1, 2, COLS.length);
  const subCell = ws.getCell("A2");
  subCell.value = `إجمالي الكوادر: ${enriched.length}  |  تاريخ التصدير: ${new Date().toLocaleDateString("ar-SA")}`;
  subCell.font      = { name: "Arial", size: 10, color: { argb: "FF1F7A4D" } };
  subCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2EA" } };
  subCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(2).height = 22;

  // Empty spacer row 3
  ws.getRow(3).height = 6;

  // Header row (row 4) — medium-green bg, bold white, borders
  const headerRow = ws.getRow(4);
  COLS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value     = col.header;
    cell.font      = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D9C62" } };
    cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl", wrapText: false };
    cell.border    = {
      top:    { style: "thin", color: { argb: "FF1F7A4D" } },
      bottom: { style: "thin", color: { argb: "FF1F7A4D" } },
      left:   { style: "thin", color: { argb: "FF1F7A4D" } },
      right:  { style: "thin", color: { argb: "FF1F7A4D" } },
    };
  });
  headerRow.height = 28;

  // Data rows starting at row 5
  enriched.forEach((s, idx) => {
    const duration = [s.startDate, s.endDate].filter(Boolean).join(" — ") || "—";
    const isEven   = idx % 2 === 1;
    const rowBg    = isEven ? "FFF7F9F6" : "FFFFFFFF";
    const values   = [
      s.name,
      s.role,
      s.specialty ?? "—",
      STATUS_LABELS[s.employmentStatus] ?? s.employmentStatus,
      s.workLocation ?? "—",
      s.department ?? "—",
      s.email ?? "—",
      s.phone ?? "—",
      duration,
      s.notes ?? "",
    ];

    const dataRow = ws.addRow(values);
    dataRow.height = 22;
    dataRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.font      = { name: "Arial", size: 10 };
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      cell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
      cell.border    = {
        top:    { style: "hair",  color: { argb: "FFCCCCCC" } },
        bottom: { style: "hair",  color: { argb: "FFCCCCCC" } },
        left:   { style: "thin",  color: { argb: "FFB8D4BC" } },
        right:  { style: "thin",  color: { argb: "FFB8D4BC" } },
      };
    });
  });

  // Footer row
  const footerRowNum = 5 + enriched.length;
  ws.mergeCells(footerRowNum, 1, footerRowNum, COLS.length);
  const footerCell = ws.getCell(`A${footerRowNum}`);
  footerCell.value     = "منصة إدارة الاجتماعات والتخطيط — سري وللاستخدام الداخلي فقط";
  footerCell.font      = { name: "Arial", size: 9, italic: true, color: { argb: "FF8A978A" } };
  footerCell.alignment = { horizontal: "center", readingOrder: "rtl" };
  footerCell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2EA" } };
  ws.getRow(footerRowNum).height = 18;

  const buf = await wb.xlsx.writeBuffer() as Buffer;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  const safeName = encodeURIComponent(`كوادر-الخطة-${planId}`);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${safeName}.xlsx`);
  res.send(buf);
});

// ─── Dashboard stats ────────────────────────────────────────────────────────

router.get("/plans-dashboard", async (_req, res): Promise<void> => {
  const all = await db.select().from(plansTable);
  const total = all.length;
  const active = all.filter(p => p.status === "active" || p.status === "in_progress").length;
  const overdue = all.filter(p => p.status === "overdue").length;
  const readiness = all.filter(p => p.type === "readiness").length;
  const operational = all.filter(p => p.type === "operational").length;

  // Compute overall progress across all active plans
  let progressSum = 0;
  for (const p of all.filter(pl => pl.status !== "draft" && pl.status !== "completed")) {
    progressSum += await computePlanProgress(p.id);
  }
  const activePlans = all.filter(pl => pl.status !== "draft" && pl.status !== "completed").length;
  const overallProgress = activePlans > 0 ? Math.round(progressSum / activePlans) : 0;

  // Recent active plans
  const recentActive = await db.select().from(plansTable)
    .where(eq(plansTable.status, "active")).orderBy(desc(plansTable.updatedAt)).limit(5);
  const enrichedRecent = await Promise.all(recentActive.map(enrichPlan));

  res.json({ total, active, overdue, readiness, operational, overallProgress, recentPlans: enrichedRecent });
});

export default router;

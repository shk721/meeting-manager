import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  plansTable, planPhasesTable, planWorksstreamsTable, planTemplatesTable,
  tasksTable, decisionsTable, meetingsTable, meetingAttendeesTable,
} from "@workspace/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ─── helpers ────────────────────────────────────────────────────────────────

async function computePlanProgress(planId: number): Promise<number> {
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
    name: "خطة التحول الرقمي",
    type: "operational",
    description: "قالب لتنفيذ مشاريع التحول الرقمي وتبني التقنيات الحديثة",
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

  const enriched = await enrichPlan(plan);
  res.status(201).json(enriched);
});

router.get("/plans/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, id));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const phases = await db.select().from(planPhasesTable)
    .where(eq(planPhasesTable.planId, id)).orderBy(planPhasesTable.orderIndex);
  const phaseIds = phases.map(p => p.id);

  const workstreams = phaseIds.length > 0
    ? await db.select().from(planWorksstreamsTable)
        .where(inArray(planWorksstreamsTable.phaseId, phaseIds))
        .orderBy(planWorksstreamsTable.orderIndex)
    : [];

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

import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { auditLogTable, usersTable } from "@workspace/db/schema";

const router: IRouter = Router();

// ─── GET /audit-log ───────────────────────────────────────────────────────────
// Query params: entityType, entityId, limit (default 50)

router.get("/audit-log", async (req, res) => {
  const { entityType, entityId, limit: limitParam } = req.query as Record<string, string | undefined>;
  const limit = Math.min(parseInt(limitParam ?? "50", 10) || 50, 200);

  const conditions = [];
  if (entityType) conditions.push(eq(auditLogTable.entityType, entityType));
  if (entityId) {
    const eid = parseInt(entityId, 10);
    if (!isNaN(eid)) conditions.push(eq(auditLogTable.entityId, eid));
  }

  const rows = await db.select().from(auditLogTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogTable.createdAt))
    .limit(limit);

  // Enrich with actor name
  const enriched = await Promise.all(rows.map(async row => {
    const [actor] = row.actorId
      ? await db.select({ fullName: usersTable.fullName, email: usersTable.email })
          .from(usersTable).where(eq(usersTable.id, row.actorId))
      : [null];
    return {
      ...row,
      actor: actor ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }));

  res.json(enriched);
});

export default router;

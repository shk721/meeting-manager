import { Router, type IRouter } from "express";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  transactionsTable,
  transactionIdentifiersTable,
  transactionLinksTable,
  transactionContextLinksTable,
  usersTable,
  auditLogTable,
} from "@workspace/db/schema";

const router: IRouter = Router();

// ── List transactions ─────────────────────────────────────────────────────────
router.get("/transactions", async (req, res) => {
  try {
    const {
      status, actionRequired, priority, transactionType, purpose,
      assigneeId, search, limit: limitParam, offset: offsetParam,
    } = req.query as Record<string, string | undefined>;

    const limit = Math.min(parseInt(limitParam ?? "50", 10) || 50, 200);
    const offset = parseInt(offsetParam ?? "0", 10) || 0;

    const conditions: any[] = [];
    if (status) conditions.push(eq(transactionsTable.platformStatus, status));
    if (actionRequired) conditions.push(eq(transactionsTable.actionRequired, actionRequired));
    if (priority) conditions.push(eq(transactionsTable.priority, priority));
    if (transactionType) conditions.push(eq(transactionsTable.transactionType, transactionType));
    if (purpose) conditions.push(eq(transactionsTable.purpose, purpose));
    if (assigneeId) conditions.push(eq(transactionsTable.assigneeId, parseInt(assigneeId, 10)));
    if (search) {
      conditions.push(or(
        ilike(transactionsTable.title, `%${search}%`),
        ilike(transactionsTable.summary ?? transactionsTable.title, `%${search}%`),
      ));
    }

    const rows = await db
      .select()
      .from(transactionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with primary identifier and assignee name
    const enriched = await Promise.all(rows.map(async (tx) => {
      const [primaryId] = await db
        .select()
        .from(transactionIdentifiersTable)
        .where(and(
          eq(transactionIdentifiersTable.transactionId, tx.id),
          eq(transactionIdentifiersTable.isPrimary, true),
        ))
        .limit(1);

      const [assignee] = tx.assigneeId
        ? await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, tx.assigneeId))
        : [null];

      return { ...tx, primaryIdentifier: primaryId ?? null, assigneeName: assignee?.fullName ?? null };
    }));

    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// ── Get single transaction (with all sub-entities) ────────────────────────────
router.get("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
    if (!tx) return void res.status(404).json({ error: "Not found" });

    const [identifiers, contextLinks, outgoingLinks, incomingLinks] = await Promise.all([
      db.select().from(transactionIdentifiersTable).where(eq(transactionIdentifiersTable.transactionId, id)),
      db.select().from(transactionContextLinksTable).where(eq(transactionContextLinksTable.transactionId, id)),
      db.select().from(transactionLinksTable).where(eq(transactionLinksTable.fromTransactionId, id)),
      db.select().from(transactionLinksTable).where(eq(transactionLinksTable.toTransactionId, id)),
    ]);

    const [assignee, verifiedBy, createdBy] = await Promise.all([
      tx.assigneeId ? db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, tx.assigneeId)).then(r => r[0] ?? null) : null,
      tx.verifiedById ? db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, tx.verifiedById)).then(r => r[0] ?? null) : null,
      tx.createdById ? db.select({ id: usersTable.id, fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, tx.createdById)).then(r => r[0] ?? null) : null,
    ]);

    res.json({ ...tx, identifiers, contextLinks, outgoingLinks, incomingLinks, assignee, verifiedBy, createdBy });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// ── Create transaction ────────────────────────────────────────────────────────
router.post("/transactions", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const {
      transactionType, title, summary, sendingParty, receivingParty,
      transactionDate, receiptDate, dueDate, purpose, confidentiality, priority,
      platformStatus, officialSystemStatus, actionRequired, requiredAction,
      externalUrl, notes, dataSource, sourceSystem,
      assigneeId, organizationId,
      identifiers = [],
    } = req.body;

    if (!transactionType || !title) {
      return void res.status(400).json({ error: "transactionType and title are required" });
    }

    const [tx] = await db.insert(transactionsTable).values({
      transactionType, title, summary, sendingParty, receivingParty,
      transactionDate, receiptDate, dueDate,
      purpose: purpose ?? "for_info",
      confidentiality: confidentiality ?? "normal",
      priority: priority ?? "normal",
      platformStatus: platformStatus ?? "new",
      officialSystemStatus, actionRequired: actionRequired ?? "pending_classification",
      requiredAction, externalUrl, notes,
      dataSource: dataSource ?? "manual", sourceSystem,
      assigneeId: assigneeId ? parseInt(assigneeId, 10) : null,
      organizationId: organizationId ?? req.user?.organizationId ?? null,
      createdById: userId,
    }).returning();

    // Insert identifiers if provided
    if (identifiers.length > 0) {
      await db.insert(transactionIdentifiersTable).values(
        identifiers.map((id: any) => ({ ...id, transactionId: tx.id }))
      );
    }

    await db.insert(auditLogTable).values({
      entityType: "transaction", entityId: tx.id, action: "create",
      actorId: userId, actorIp: req.ip ?? null,
      changes: { title, transactionType }, context: null, sessionId: null,
    });

    res.status(201).json(tx);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// ── Update transaction ────────────────────────────────────────────────────────
router.patch("/transactions/:id", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id, 10);
    const [existing] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, id));
    if (!existing) return void res.status(404).json({ error: "Not found" });

    const allowed = [
      "transactionType", "title", "summary", "sendingParty", "receivingParty",
      "transactionDate", "receiptDate", "dueDate", "purpose", "confidentiality",
      "priority", "platformStatus", "officialSystemStatus", "actionRequired",
      "requiredAction", "completionEvidence", "replySentAt", "replyReference",
      "closedReason", "closedAt", "externalUrl", "notes", "dataSource",
      "sourceSystem", "assigneeId", "verifiedById",
    ] as const;

    const updates: Record<string, any> = { updatedAt: new Date() };
    const changes: Record<string, any> = {};
    for (const key of allowed) {
      if (key in req.body) {
        updates[key] = req.body[key];
        if (existing[key] !== req.body[key]) {
          changes[key] = { from: existing[key], to: req.body[key] };
        }
      }
    }

    const [updated] = await db.update(transactionsTable).set(updates).where(eq(transactionsTable.id, id)).returning();

    if (Object.keys(changes).length > 0) {
      await db.insert(auditLogTable).values({
        entityType: "transaction", entityId: id, action: "update",
        actorId: userId, actorIp: req.ip ?? null,
        changes, context: null, sessionId: null,
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// ── Delete transaction ────────────────────────────────────────────────────────
router.delete("/transactions/:id", async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const id = parseInt(req.params.id, 10);
    await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
    await db.insert(auditLogTable).values({
      entityType: "transaction", entityId: id, action: "delete",
      actorId: userId, actorIp: req.ip ?? null,
      changes: null, context: null, sessionId: null,
    });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

// ── Identifiers ───────────────────────────────────────────────────────────────
router.post("/transactions/:id/identifiers", async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id, 10);
    const { number, numberType, issuingSystem, issueDate, isPrimary, externalUrl } = req.body;
    if (!number || !numberType) return void res.status(400).json({ error: "number and numberType required" });

    if (isPrimary) {
      await db.update(transactionIdentifiersTable)
        .set({ isPrimary: false })
        .where(eq(transactionIdentifiersTable.transactionId, transactionId));
    }

    const [row] = await db.insert(transactionIdentifiersTable)
      .values({ transactionId, number, numberType, issuingSystem, issueDate, isPrimary: !!isPrimary, externalUrl })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add identifier" });
  }
});

router.delete("/transactions/:id/identifiers/:identifierId", async (req, res) => {
  try {
    await db.delete(transactionIdentifiersTable)
      .where(and(
        eq(transactionIdentifiersTable.id, parseInt(req.params.identifierId, 10)),
        eq(transactionIdentifiersTable.transactionId, parseInt(req.params.id, 10)),
      ));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete identifier" });
  }
});

// ── Transaction-to-transaction links ──────────────────────────────────────────
router.post("/transactions/:id/links", async (req, res) => {
  try {
    const fromTransactionId = parseInt(req.params.id, 10);
    const { toTransactionId, linkType, notes } = req.body;
    if (!toTransactionId || !linkType) return void res.status(400).json({ error: "toTransactionId and linkType required" });

    const [row] = await db.insert(transactionLinksTable)
      .values({ fromTransactionId, toTransactionId: parseInt(toTransactionId, 10), linkType, notes })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add link" });
  }
});

router.delete("/transactions/:id/links/:linkId", async (req, res) => {
  try {
    await db.delete(transactionLinksTable)
      .where(and(
        eq(transactionLinksTable.id, parseInt(req.params.linkId, 10)),
        eq(transactionLinksTable.fromTransactionId, parseInt(req.params.id, 10)),
      ));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete link" });
  }
});

// ── Context links (links to platform entities) ────────────────────────────────
router.post("/transactions/:id/context-links", async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id, 10);
    const { entityType, entityId, notes } = req.body;
    if (!entityType || !entityId) return void res.status(400).json({ error: "entityType and entityId required" });

    const [row] = await db.insert(transactionContextLinksTable)
      .values({ transactionId, entityType, entityId: parseInt(entityId, 10), notes })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add context link" });
  }
});

router.delete("/transactions/:id/context-links/:linkId", async (req, res) => {
  try {
    await db.delete(transactionContextLinksTable)
      .where(and(
        eq(transactionContextLinksTable.id, parseInt(req.params.linkId, 10)),
        eq(transactionContextLinksTable.transactionId, parseInt(req.params.id, 10)),
      ));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete context link" });
  }
});

export default router;

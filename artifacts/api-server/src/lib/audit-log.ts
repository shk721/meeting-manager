import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db/schema";

interface AuditParams {
  entityType: string;
  entityId: number;
  action: string;
  actorId?: number;
  actorIp?: string;
  changes?: Record<string, [unknown, unknown]>;
  context?: string;
  sessionId?: string;
}

// Fire-and-forget: never awaited, never throws to callers.
// A failed audit log insert must not fail the originating request.
export function auditLog(params: AuditParams): void {
  db.insert(auditLogTable).values({
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    actorId: params.actorId ?? null,
    actorIp: params.actorIp ?? null,
    changes: (params.changes ?? null) as any,
    context: params.context ?? null,
    sessionId: params.sessionId ?? null,
  }).then(() => {}).catch((err: Error) => {
    console.error("[audit-log] insert failed:", err.message);
  });
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInsertChain = {
  values: vi.fn().mockReturnThis(),
  then: vi.fn().mockImplementation(function(this: any, fn: () => void) { fn(); return this; }),
  catch: vi.fn().mockReturnThis(),
};

vi.mock("@workspace/db", () => ({
  db: {
    insert: vi.fn(() => mockInsertChain),
  },
  auditLogTable: {},
}));

// Import AFTER mock
const { auditLog } = await import("../../lib/audit-log.js");
const { db } = await import("@workspace/db");

describe("auditLog — fire-and-forget helper", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertChain.values.mockReturnThis();
    mockInsertChain.then.mockImplementation(function(this: any, fn: () => void) { fn(); return this; });
    mockInsertChain.catch.mockReturnThis();
    (db.insert as any).mockReturnValue(mockInsertChain);
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("returns void synchronously — never awaitable", () => {
    const result = auditLog({ entityType: "organization", entityId: 1, action: "create" });
    expect(result).toBeUndefined();
  });

  it("calls db.insert once per invocation", () => {
    auditLog({ entityType: "governance_context", entityId: 42, action: "update", actorId: 1 });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  it("never throws even when db.insert throws synchronously", () => {
    (db.insert as any).mockImplementationOnce(() => { throw new Error("DB connection lost"); });
    expect(() => auditLog({ entityType: "task", entityId: 1, action: "delete" })).not.toThrow();
  });

  it("logs console.error when db.insert throws synchronously", () => {
    (db.insert as any).mockImplementationOnce(() => { throw new Error("connection refused"); });
    auditLog({ entityType: "task", entityId: 1, action: "delete" });
    expect(consoleSpy).toHaveBeenCalledWith("[audit-log] insert failed:", "connection refused");
  });

  it("accepts all optional params without throwing", () => {
    expect(() => auditLog({
      entityType: "deliverable",
      entityId: 5,
      action: "status_change",
      actorId: 2,
      actorIp: "192.168.1.1",
      changes: { status: ["not_started", "in_progress"] as [unknown, unknown] },
      context: "plan_review",
      sessionId: "session-abc123",
    })).not.toThrow();
  });

  it("handles undefined optional fields gracefully (no throws)", () => {
    expect(() => auditLog({
      entityType: "organization",
      entityId: 1,
      action: "create",
      actorId: undefined,
      actorIp: undefined,
      changes: undefined,
    })).not.toThrow();
  });
});

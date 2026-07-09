import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    orderBy: vi.fn().mockResolvedValue([]),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    set: vi.fn().mockReturnThis(),
  },
  governanceContextsTable: { id: "id", name: "name", type: "type", status: "status", organizationId: "organization_id", departmentId: "department_id", description: "description" },
  governanceMembersTable: { id: "id", governanceContextId: "governance_context_id" },
  committeesTable: {},
  committeeRepresentativesTable: { committeeId: "committee_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));

import { db } from "@workspace/db";
import governanceRouter from "../governance";

const mockDb = db as any;

function makeReqRes(overrides: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {}) {
  const req: any = { params: overrides.params ?? {}, query: overrides.query ?? {}, body: overrides.body ?? {}, session: { userId: 1 } };
  const res: any = {
    _status: 200, _body: undefined,
    status(c: number) { this._status = c; return this; },
    json(b: unknown) { this._body = b; return this; },
  };
  return { req, res };
}

function getHandler(method: string, path: string) {
  const layer = (governanceRouter as any).stack.find((l: any) =>
    Object.keys(l.route?.methods ?? {})[0] === method && l.route?.path === path
  );
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /governance-contexts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);
  });

  it("returns all contexts", async () => {
    const ctxs = [{ id: 1, name: "لجنة X", type: "committee", status: "active", organizationId: null, departmentId: null }];
    mockDb.orderBy.mockResolvedValue(ctxs);
    const { req, res } = makeReqRes();
    await getHandler("get", "/governance-contexts")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveLength(1);
  });

  it("filters by type in-memory", async () => {
    const ctxs = [
      { id: 1, name: "لجنة A", type: "committee", status: "active", organizationId: null, departmentId: null },
      { id: 2, name: "فريق B", type: "team", status: "active", organizationId: null, departmentId: null },
    ];
    mockDb.orderBy.mockResolvedValue(ctxs);
    const { req, res } = makeReqRes({ query: { type: "committee" } });
    await getHandler("get", "/governance-contexts")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((c: any) => c.type === "committee")).toBe(true);
  });

  it("filters by status in-memory", async () => {
    const ctxs = [
      { id: 1, name: "X", type: "committee", status: "active", organizationId: null, departmentId: null },
      { id: 2, name: "Y", type: "team", status: "inactive", organizationId: null, departmentId: null },
    ];
    mockDb.orderBy.mockResolvedValue(ctxs);
    const { req, res } = makeReqRes({ query: { status: "active" } });
    await getHandler("get", "/governance-contexts")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((c: any) => c.status === "active")).toBe(true);
  });
});

describe("POST /governance-contexts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
  });

  it("creates context and returns 201", async () => {
    const ctx = { id: 1, name: "مجلس الإدارة", type: "board", quorumPercent: 50 };
    mockDb.returning.mockResolvedValue([ctx]);
    const { req, res } = makeReqRes({ body: { name: "مجلس الإدارة", type: "board" } });
    await getHandler("post", "/governance-contexts")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.type).toBe("board");
  });

  it("returns 400 when name is missing", async () => {
    const { req, res } = makeReqRes({ body: { type: "committee" } });
    await getHandler("post", "/governance-contexts")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    const { req, res } = makeReqRes({ body: { name: "X" } });
    await getHandler("post", "/governance-contexts")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /governance-contexts/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns context with nested members", async () => {
    const ctx = { id: 1, name: "لجنة X", type: "committee" };
    const members = [{ id: 1, governanceContextId: 1, userId: 1, role: "head" }];
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValueOnce([ctx]).mockResolvedValueOnce(members);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("get", "/governance-contexts/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.members).toHaveLength(1);
  });

  it("returns 404 for unknown id", async () => {
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" } });
    await getHandler("get", "/governance-contexts/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("PATCH /governance-contexts/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates context", async () => {
    const updated = { id: 1, status: "inactive", quorumPercent: 66 };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([updated]);
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { status: "inactive", quorumPercent: 66 } });
    await getHandler("patch", "/governance-contexts/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.status).toBe("inactive");
  });

  it("returns 404 when not found", async () => {
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" }, body: { status: "inactive" } });
    await getHandler("patch", "/governance-contexts/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("POST /governance-members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
  });

  it("creates internal member", async () => {
    const member = { id: 1, governanceContextId: 1, userId: 2, role: "member", isVoting: true };
    mockDb.returning.mockResolvedValue([member]);
    const { req, res } = makeReqRes({ body: { governanceContextId: 1, userId: 2, role: "member" } });
    await getHandler("post", "/governance-members")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.userId).toBe(2);
  });

  it("creates external member", async () => {
    const member = { id: 2, governanceContextId: 1, externalName: "د. خالد", isVoting: false };
    mockDb.returning.mockResolvedValue([member]);
    const { req, res } = makeReqRes({ body: { governanceContextId: 1, externalName: "د. خالد", isVoting: false } });
    await getHandler("post", "/governance-members")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.externalName).toBe("د. خالد");
  });

  it("returns 400 when governanceContextId missing", async () => {
    const { req, res } = makeReqRes({ body: { userId: 1 } });
    await getHandler("post", "/governance-members")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("DELETE /governance-contexts/:id", () => {
  it("deletes context and its members", async () => {
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("delete", "/governance-contexts/:id")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).success).toBe(true);
  });
});

describe("POST /governance-contexts/migrate/from-committees", () => {
  beforeEach(() => vi.clearAllMocks());

  it("migrates committees and returns counts", async () => {
    const committees = [{ id: 1, name: "لجنة A", type: "internal", status: "active", description: null, frequency: "monthly" }];
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    // Route calls select().from() three times with no chained where/orderBy
    mockDb.from.mockResolvedValueOnce([]);          // existing governance_contexts
    mockDb.from.mockResolvedValueOnce(committees);  // committees
    mockDb.from.mockResolvedValueOnce([]);          // representatives
    const newCtx = { id: 10, name: "لجنة A", type: "team" };
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([newCtx]);
    const { req, res } = makeReqRes();
    await getHandler("post", "/governance-contexts/migrate/from-committees")(req, res);
    expect(res._status).toBe(200);
    expect(typeof res._body.created).toBe("number");
    expect(typeof res._body.skipped).toBe("number");
  });

  it("skips already-migrated committees (idempotency check)", async () => {
    const existing = [{ id: 10, description: "[migrated:committee:1] test" }];
    const committees = [{ id: 1, name: "لجنة A", type: "internal", status: "active", description: null, frequency: null }];
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.from.mockResolvedValueOnce(existing);    // existing governance_contexts (has migrated:committee:1)
    mockDb.from.mockResolvedValueOnce(committees);  // committees
    mockDb.from.mockResolvedValueOnce([]);          // representatives
    const { req, res } = makeReqRes();
    await getHandler("post", "/governance-contexts/migrate/from-committees")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.created).toBe(0);
    expect(res._body.skipped).toBe(1);
  });
});

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
  deliverablesTable: { id: "id", planId: "plan_id", status: "status", ownerId: "owner_id", orderIndex: "order_index", phaseId: "phase_id", workstreamId: "workstream_id" },
  tasksTable: { deliverableId: "deliverable_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));

import { db } from "@workspace/db";
import deliverablesRouter from "../deliverables";

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
  const layer = (deliverablesRouter as any).stack.find((l: any) =>
    Object.keys(l.route?.methods ?? {})[0] === method && l.route?.path === path
  );
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /deliverables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);
  });

  it("returns all deliverables", async () => {
    const dlvs = [{ id: 1, planId: 1, title: "تقرير A", status: "not_started", progressPercent: 0, phaseId: null, workstreamId: null, ownerId: null }];
    mockDb.orderBy.mockResolvedValue(dlvs);
    const { req, res } = makeReqRes();
    await getHandler("get", "/deliverables")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveLength(1);
  });

  it("filters by planId", async () => {
    const dlvs = [
      { id: 1, planId: 1, title: "A", status: "not_started", progressPercent: 0, phaseId: null, workstreamId: null, ownerId: null },
      { id: 2, planId: 2, title: "B", status: "not_started", progressPercent: 0, phaseId: null, workstreamId: null, ownerId: null },
    ];
    mockDb.orderBy.mockResolvedValue(dlvs);
    const { req, res } = makeReqRes({ query: { planId: "1" } });
    await getHandler("get", "/deliverables")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((d: any) => d.planId === 1)).toBe(true);
  });

  it("filters by status", async () => {
    const dlvs = [
      { id: 1, planId: 1, title: "A", status: "accepted", progressPercent: 100, phaseId: null, workstreamId: null, ownerId: null },
      { id: 2, planId: 1, title: "B", status: "not_started", progressPercent: 0, phaseId: null, workstreamId: null, ownerId: null },
    ];
    mockDb.orderBy.mockResolvedValue(dlvs);
    const { req, res } = makeReqRes({ query: { status: "accepted" } });
    await getHandler("get", "/deliverables")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((d: any) => d.status === "accepted")).toBe(true);
  });

  it("filters by workstreamId", async () => {
    const dlvs = [
      { id: 1, planId: 1, workstreamId: 3, title: "X", status: "not_started", progressPercent: 0, phaseId: null, ownerId: null },
      { id: 2, planId: 1, workstreamId: 4, title: "Y", status: "not_started", progressPercent: 0, phaseId: null, ownerId: null },
    ];
    mockDb.orderBy.mockResolvedValue(dlvs);
    const { req, res } = makeReqRes({ query: { workstreamId: "3" } });
    await getHandler("get", "/deliverables")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((d: any) => d.workstreamId === 3)).toBe(true);
  });
});

describe("POST /deliverables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
  });

  it("creates deliverable with 201", async () => {
    const dlv = { id: 1, planId: 1, title: "تقرير الفجوات", status: "not_started", progressPercent: 0 };
    mockDb.returning.mockResolvedValue([dlv]);
    const { req, res } = makeReqRes({ body: { planId: 1, title: "تقرير الفجوات" } });
    await getHandler("post", "/deliverables")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.planId).toBe(1);
  });

  it("returns 400 when planId missing", async () => {
    const { req, res } = makeReqRes({ body: { title: "X" } });
    await getHandler("post", "/deliverables")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when title missing", async () => {
    const { req, res } = makeReqRes({ body: { planId: 1 } });
    await getHandler("post", "/deliverables")(req, res);
    expect(res._status).toBe(400);
  });

  it("accepts optional fields", async () => {
    const dlv = { id: 2, planId: 1, phaseId: 1, workstreamId: 2, ownerId: 3, title: "X", status: "not_started", progressPercent: 0 };
    mockDb.returning.mockResolvedValue([dlv]);
    const { req, res } = makeReqRes({ body: { planId: 1, title: "X", phaseId: 1, workstreamId: 2, ownerId: 3 } });
    await getHandler("post", "/deliverables")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.ownerId).toBe(3);
  });
});

describe("GET /deliverables/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns deliverable with linked tasks", async () => {
    const dlv = { id: 1, planId: 1, title: "تقرير", status: "not_started", progressPercent: 0 };
    const tasks = [{ id: 10, deliverableId: 1, title: "مهمة 1" }];
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValueOnce([dlv]).mockResolvedValueOnce(tasks);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("get", "/deliverables/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.tasks).toHaveLength(1);
  });

  it("returns 404 when not found", async () => {
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" } });
    await getHandler("get", "/deliverables/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("PATCH /deliverables/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates progress and status", async () => {
    const updated = { id: 1, planId: 1, title: "X", status: "in_progress", progressPercent: 50 };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([updated]);
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { status: "in_progress", progressPercent: 50 } });
    await getHandler("patch", "/deliverables/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.progressPercent).toBe(50);
  });

  it("accepts acceptedAt for status=accepted", async () => {
    const updated = { id: 1, planId: 1, title: "X", status: "accepted", progressPercent: 100, acceptedAt: "2026-07-10T00:00:00Z" };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([updated]);
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { status: "accepted", acceptedAt: "2026-07-10T00:00:00Z" } });
    await getHandler("patch", "/deliverables/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.status).toBe("accepted");
  });

  it("returns 404 when not found", async () => {
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" }, body: { status: "in_progress" } });
    await getHandler("patch", "/deliverables/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("DELETE /deliverables/:id", () => {
  it("deletes deliverable", async () => {
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("delete", "/deliverables/:id")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).success).toBe(true);
  });
});

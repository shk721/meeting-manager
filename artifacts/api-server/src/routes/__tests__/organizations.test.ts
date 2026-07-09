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
    $dynamic: vi.fn().mockReturnThis(),
  },
  organizationsTable: { id: "id", name: "name" },
  departmentsTable: { id: "id", organizationId: "organization_id", parentId: "parent_id", level: "level", orderIndex: "order_index" },
  userDepartmentsTable: { id: "id", userId: "user_id", departmentId: "department_id", isPrimary: "is_primary" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));

import { db } from "@workspace/db";
import organizationsRouter from "../organizations";

const mockDb = db as any;

function makeReqRes(overrides: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {}) {
  const req: any = { params: overrides.params ?? {}, query: overrides.query ?? {}, body: overrides.body ?? {}, session: { userId: 1 } };
  const res: any = {
    _status: 200, _body: undefined,
    status(c: number) { this._status = c; return this; },
    json(b: unknown) { this._body = b; return this; },
    sendStatus(c: number) { this._status = c; return this; },
  };
  return { req, res };
}

function getHandler(method: string, path: string) {
  const layer = (organizationsRouter as any).stack.find((l: any) =>
    Object.keys(l.route?.methods ?? {})[0] === method && l.route?.path === path
  );
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);
  });

  it("returns array of organizations", async () => {
    const orgs = [{ id: 1, name: "وزارة الداخلية", type: "government", status: "active" }];
    mockDb.orderBy.mockResolvedValue(orgs);
    const { req, res } = makeReqRes();
    await getHandler("get", "/organizations")(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body).toHaveLength(1);
  });

  it("returns empty array when no orgs exist", async () => {
    mockDb.orderBy.mockResolvedValue([]);
    const { req, res } = makeReqRes();
    await getHandler("get", "/organizations")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual([]);
  });
});

describe("POST /organizations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
  });

  it("creates organization and returns 201", async () => {
    const org = { id: 1, name: "وزارة الداخلية", type: "government", status: "active" };
    mockDb.returning.mockResolvedValue([org]);
    const { req, res } = makeReqRes({ body: { name: "وزارة الداخلية", type: "government" } });
    await getHandler("post", "/organizations")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.name).toBe("وزارة الداخلية");
  });

  it("returns 400 when name is missing", async () => {
    const { req, res } = makeReqRes({ body: { type: "government" } });
    await getHandler("post", "/organizations")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /organizations/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns org with nested departments", async () => {
    const org = { id: 1, name: "وزارة الداخلية" };
    const depts = [{ id: 1, organizationId: 1, name: "إدارة عامة" }];
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    // First where() resolves org; second where() returns this so orderBy() can chain
    mockDb.where.mockResolvedValueOnce([org]).mockReturnThis();
    mockDb.orderBy.mockResolvedValue(depts);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("get", "/organizations/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.departments).toBeDefined();
  });

  it("returns 404 when org not found", async () => {
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" } });
    await getHandler("get", "/organizations/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("PATCH /organizations/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates and returns updated org", async () => {
    const updated = { id: 1, name: "وزارة المالية", status: "active" };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([updated]);
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { name: "وزارة المالية" } });
    await getHandler("patch", "/organizations/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.name).toBe("وزارة المالية");
  });

  it("returns 404 when org not found", async () => {
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" }, body: { name: "X" } });
    await getHandler("patch", "/organizations/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("POST /departments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates department and returns 201", async () => {
    const dept = { id: 1, organizationId: 1, name: "إدارة التخطيط", level: 2 };
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([dept]);
    const { req, res } = makeReqRes({ body: { organizationId: 1, name: "إدارة التخطيط", level: 2 } });
    await getHandler("post", "/departments")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.organizationId).toBe(1);
  });

  it("returns 400 when organizationId missing", async () => {
    const { req, res } = makeReqRes({ body: { name: "X" } });
    await getHandler("post", "/departments")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("DELETE /departments/:id", () => {
  it("deletes department and user-department records", async () => {
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("delete", "/departments/:id")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).success).toBe(true);
  });
});

describe("POST /user-departments", () => {
  it("creates assignment and returns 201", async () => {
    const row = { id: 1, userId: 1, departmentId: 1, isPrimary: true, role: "member" };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([row]);
    const { req, res } = makeReqRes({ body: { userId: 1, departmentId: 1, isPrimary: true } });
    await getHandler("post", "/user-departments")(req, res);
    expect(res._status).toBe(201);
    expect((res._body as any).isPrimary).toBe(true);
  });

  it("returns 400 when userId missing", async () => {
    const { req, res } = makeReqRes({ body: { departmentId: 1 } });
    await getHandler("post", "/user-departments")(req, res);
    expect(res._status).toBe(400);
  });
});

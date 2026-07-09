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
  agendaItemsTable: { id: "id", meetingId: "meeting_id", orderIndex: "order_index", status: "status" },
  meetingsTable: { id: "id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
}));

import { db } from "@workspace/db";
import agendaItemsRouter from "../agenda-items";

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
  const layer = (agendaItemsRouter as any).stack.find((l: any) =>
    Object.keys(l.route?.methods ?? {})[0] === method && l.route?.path === path
  );
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /agenda-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.orderBy.mockResolvedValue([]);
  });

  it("returns all agenda items", async () => {
    const items = [
      { id: 1, meetingId: 1, title: "بند 1", orderIndex: 0, status: "pending" },
      { id: 2, meetingId: 1, title: "بند 2", orderIndex: 1, status: "discussed" },
    ];
    mockDb.orderBy.mockResolvedValue(items);
    const { req, res } = makeReqRes();
    await getHandler("get", "/agenda-items")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveLength(2);
  });

  it("filters by meetingId in-memory", async () => {
    const items = [
      { id: 1, meetingId: 1, title: "بند 1", orderIndex: 0, status: "pending" },
      { id: 2, meetingId: 2, title: "بند 2", orderIndex: 0, status: "pending" },
    ];
    mockDb.orderBy.mockResolvedValue(items);
    const { req, res } = makeReqRes({ query: { meetingId: "1" } });
    await getHandler("get", "/agenda-items")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((i: any) => i.meetingId === 1)).toBe(true);
  });

  it("filters by status in-memory", async () => {
    const items = [
      { id: 1, meetingId: 1, title: "بند 1", orderIndex: 0, status: "pending" },
      { id: 2, meetingId: 1, title: "بند 2", orderIndex: 1, status: "discussed" },
    ];
    mockDb.orderBy.mockResolvedValue(items);
    const { req, res } = makeReqRes({ query: { status: "pending" } });
    await getHandler("get", "/agenda-items")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.every((i: any) => i.status === "pending")).toBe(true);
  });

  it("returns empty array when no matching items", async () => {
    mockDb.orderBy.mockResolvedValue([]);
    const { req, res } = makeReqRes({ query: { meetingId: "999" } });
    await getHandler("get", "/agenda-items")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual([]);
  });
});

describe("POST /agenda-items", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([]);
  });

  it("creates item and returns 201", async () => {
    const item = { id: 1, meetingId: 5, title: "مراجعة الميزانية", orderIndex: 0, status: "pending" };
    mockDb.returning.mockResolvedValue([item]);
    const { req, res } = makeReqRes({ body: { meetingId: 5, title: "مراجعة الميزانية", orderIndex: 0 } });
    await getHandler("post", "/agenda-items")(req, res);
    expect(res._status).toBe(201);
    expect(res._body.status).toBe("pending");
  });

  it("returns 400 when meetingId missing", async () => {
    const { req, res } = makeReqRes({ body: { title: "بند" } });
    await getHandler("post", "/agenda-items")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when title missing", async () => {
    const { req, res } = makeReqRes({ body: { meetingId: 1 } });
    await getHandler("post", "/agenda-items")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /agenda-items/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns item by id", async () => {
    const item = { id: 1, meetingId: 1, title: "بند", orderIndex: 0, status: "pending" };
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([item]);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("get", "/agenda-items/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.id).toBe(1);
  });

  it("returns 404 when not found", async () => {
    mockDb.select.mockReturnThis(); mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" } });
    await getHandler("get", "/agenda-items/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("PATCH /agenda-items/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates status", async () => {
    const updated = { id: 1, meetingId: 1, title: "بند", status: "discussed", orderIndex: 0 };
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([updated]);
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { status: "discussed" } });
    await getHandler("patch", "/agenda-items/:id")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.status).toBe("discussed");
  });

  it("returns 404 when not found", async () => {
    mockDb.update.mockReturnThis(); mockDb.set.mockReturnThis();
    mockDb.where.mockReturnThis(); mockDb.returning.mockResolvedValue([]);
    const { req, res } = makeReqRes({ params: { id: "999" }, body: { status: "discussed" } });
    await getHandler("patch", "/agenda-items/:id")(req, res);
    expect(res._status).toBe(404);
  });
});

describe("DELETE /agenda-items/:id", () => {
  it("deletes item", async () => {
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue(undefined);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler("delete", "/agenda-items/:id")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).success).toBe(true);
  });
});

describe("POST /agenda-items/migrate/from-meetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("migrates meetings with agendaItems text[]", async () => {
    const meetings = [{ id: 1, agendaItems: ["بند 1", "بند 2", "بند 3"] }];
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    // First from() is terminal (meetings); subsequent from() calls chain to where()
    mockDb.from.mockResolvedValueOnce(meetings);
    mockDb.where.mockResolvedValue([]);  // no existing agenda_items for meeting
    mockDb.insert.mockReturnThis(); mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{}]);
    const { req, res } = makeReqRes();
    await getHandler("post", "/agenda-items/migrate/from-meetings")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.meetingsMigrated).toBe(1);
    expect(res._body.meetingsSkipped).toBe(0);
  });

  it("skips meetings with empty agendaItems", async () => {
    const meetings = [{ id: 1, agendaItems: [] }, { id: 2, agendaItems: null }];
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.from.mockResolvedValueOnce(meetings);
    const { req, res } = makeReqRes();
    await getHandler("post", "/agenda-items/migrate/from-meetings")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.meetingsMigrated).toBe(0);
  });

  it("skips already-migrated meetings (idempotency)", async () => {
    const meetings = [{ id: 1, agendaItems: ["بند 1"] }];
    const existingItems = [{ id: 10, meetingId: 1 }];
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.from.mockResolvedValueOnce(meetings);
    mockDb.where.mockResolvedValue(existingItems);
    const { req, res } = makeReqRes();
    await getHandler("post", "/agenda-items/migrate/from-meetings")(req, res);
    expect(res._status).toBe(200);
    expect(res._body.meetingsMigrated).toBe(0);
    expect(res._body.meetingsSkipped).toBe(1);
  });
});

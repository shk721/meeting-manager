import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 101, date: "2025-07-14" }]),
    delete: vi.fn().mockReturnThis(),
  },
  meetingsTable: { id: "id", isRecurring: "is_recurring", parentMeetingId: "parent_meeting_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  or: vi.fn((...args: unknown[]) => ({ or: args })),
}));

import { db } from "@workspace/db";

const mockDb = db as any;

const baseMeeting = {
  id: 1, title: "اجتماع أسبوعي", date: "2025-07-07", time: "10:00",
  status: "scheduled", project: null, team: null, location: null,
  objectives: null, chairpersonId: null, agendaItems: [],
  isRecurring: false, parentMeetingId: null,
};

function makeReqRes(overrides: { body?: any; params?: Record<string, string> } = {}) {
  const req: any = {
    params: overrides.params ?? {},
    query: {},
    body: overrides.body ?? {},
    session: { userId: 1 },
  };
  const res: any = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
  };
  return { req, res };
}

import recurringRouter from "../recurring";

function getHandler(method: string, path: string) {
  const layer = (recurringRouter as any).stack.find((l: any) => {
    const routeMethod = Object.keys(l.route?.methods ?? {})[0];
    return routeMethod === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

describe("POST /meetings/:id/make-recurring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([baseMeeting]);
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{ id: 101, date: "2025-07-14" }]);
  });

  it("returns 400 for invalid meeting id", async () => {
    const { req, res } = makeReqRes({ params: { id: "abc" }, body: { freq: "weekly", interval: 1 } });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 for invalid freq", async () => {
    const { req, res } = makeReqRes({ params: { id: "1" }, body: { freq: "hourly", interval: 1 } });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.where.mockResolvedValueOnce([]);
    const { req, res } = makeReqRes({ params: { id: "999" }, body: { freq: "weekly", interval: 1 } });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(404);
  });

  it("creates instances for weekly recurrence", async () => {
    const { req, res } = makeReqRes({
      params: { id: "1" },
      body: { freq: "weekly", days: ["MO"], interval: 1 },
    });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("instances");
    expect(res._body.instances.length).toBeGreaterThan(0);
  });

  it("respects endDate and stops early", async () => {
    const { req, res } = makeReqRes({
      params: { id: "1" },
      body: { freq: "weekly", days: ["MO"], interval: 1, endDate: "2025-07-21" },
    });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.instances.length).toBeLessThan(12);
  });

  it("creates monthly instances", async () => {
    const { req, res } = makeReqRes({
      params: { id: "1" },
      body: { freq: "monthly", interval: 1 },
    });
    const handler = getHandler("post", "/meetings/:id/make-recurring");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.instances.length).toBeGreaterThan(0);
  });
});

describe("GET /recurring/:id/instances", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([
      { id: 2, title: "نسخة 1", date: "2025-07-14", time: "10:00", status: "scheduled", parentMeetingId: 1 },
      { id: 3, title: "نسخة 2", date: "2025-07-21", time: "10:00", status: "scheduled", parentMeetingId: 1 },
    ]);
  });

  it("lists all instances for a recurring series", async () => {
    const { req, res } = makeReqRes({ params: { id: "1" } });
    const handler = getHandler("get", "/recurring/:id/instances");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body.length).toBe(2);
  });
});

describe("DELETE /recurring/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where
      .mockResolvedValueOnce([{ ...baseMeeting, isRecurring: true }])
      .mockResolvedValue([]);
    mockDb.delete.mockReturnThis();
  });

  it("deletes series and returns deleted true", async () => {
    const { req, res } = makeReqRes({ params: { id: "1" } });
    const handler = getHandler("delete", "/recurring/:id");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("deleted", true);
  });

  it("returns 404 when not a recurring meeting", async () => {
    mockDb.where.mockReset();
    mockDb.where.mockResolvedValueOnce([{ ...baseMeeting, isRecurring: false }]);
    const { req, res } = makeReqRes({ params: { id: "1" } });
    const handler = getHandler("delete", "/recurring/:id");
    await handler(req, res);
    expect(res._status).toBe(404);
  });
});

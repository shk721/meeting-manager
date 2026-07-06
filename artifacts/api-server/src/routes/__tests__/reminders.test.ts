import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1, meetingId: 5, userId: 1, minutesBefore: 30, isSent: false }]),
    delete: vi.fn().mockReturnThis(),
  },
  remindersTable: { id: "id", meetingId: "meeting_id", userId: "user_id", minutesBefore: "minutes_before" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import { db } from "@workspace/db";

const mockDb = db as any;

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

import remindersRouter from "../reminders";

function getHandler(method: string, path: string) {
  const layer = (remindersRouter as any).stack.find((l: any) => {
    const routeMethod = Object.keys(l.route?.methods ?? {})[0];
    return routeMethod === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

describe("POST /meetings/:id/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.returning.mockResolvedValue([{ id: 1, meetingId: 5, userId: 1, minutesBefore: 30, isSent: false }]);
  });

  it("returns 400 for invalid minutesBefore value", async () => {
    const { req, res } = makeReqRes({ params: { id: "5" }, body: { minutesBefore: 45 } });
    const handler = getHandler("post", "/meetings/:id/reminders");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("creates reminder with valid minutesBefore", async () => {
    const { req, res } = makeReqRes({ params: { id: "5" }, body: { minutesBefore: 30 } });
    const handler = getHandler("post", "/meetings/:id/reminders");
    await handler(req, res);
    expect(res._status).toBe(201);
    expect(res._body).toHaveProperty("minutesBefore", 30);
  });
});

describe("GET /meetings/:id/reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([{ id: 1, meetingId: 5, userId: 1, minutesBefore: 30, isSent: false }]);
  });

  it("returns list of reminders for meeting", async () => {
    const { req, res } = makeReqRes({ params: { id: "5" } });
    const handler = getHandler("get", "/meetings/:id/reminders");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body.length).toBe(1);
  });
});

describe("DELETE /reminders/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.delete.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
  });

  it("deletes reminder and returns deleted true", async () => {
    const { req, res } = makeReqRes({ params: { id: "1" } });
    const handler = getHandler("delete", "/reminders/:id");
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("deleted", true);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  meetingsTable: { date: "date", id: "id" },
  meetingAttendeesTable: { meetingId: "meeting_id" },
}));

vi.mock("drizzle-orm", () => ({
  gte: vi.fn((_col: unknown, val: unknown) => ({ gte: val })),
  lte: vi.fn((_col: unknown, val: unknown) => ({ lte: val })),
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  and: vi.fn((...args: unknown[]) => ({ and: args })),
}));

import { db } from "@workspace/db";

const mockDb = db as any;

const mockMeetings = [
  { id: 1, title: "اجتماع أ", date: "2025-07-10", time: "09:00", status: "scheduled", isRecurring: false, parentMeetingId: null },
  { id: 2, title: "اجتماع ب", date: "2025-07-15", time: "14:00", status: "completed", isRecurring: false, parentMeetingId: null },
];

function makeReqRes(overrides: { query?: Record<string, string>; params?: Record<string, string> } = {}) {
  const req: any = {
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: {},
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

import calendarRouter from "../calendar";

function getHandler(method: string, path: string) {
  const layer = (calendarRouter as any).stack.find((l: any) => {
    const routeMethod = Object.keys(l.route?.methods ?? {})[0];
    return routeMethod === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /calendar/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
  });

  it("returns 400 when start or end missing", async () => {
    const { req, res } = makeReqRes({ query: {} });
    const handler = getHandler("get", "/calendar/events");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns events in date range", async () => {
    mockDb.where
      .mockResolvedValueOnce(mockMeetings)
      .mockResolvedValue([{ userId: 5 }]);

    const { req, res } = makeReqRes({ query: { start: "2025-07-01", end: "2025-07-31" } });
    const handler = getHandler("get", "/calendar/events");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body.length).toBe(2);
  });

  it("returns empty array when no events in range", async () => {
    mockDb.where.mockResolvedValue([]);

    const { req, res } = makeReqRes({ query: { start: "2025-01-01", end: "2025-01-02" } });
    const handler = getHandler("get", "/calendar/events");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual([]);
  });
});

describe("GET /calendar/day/:date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
  });

  it("returns 400 for invalid date format", async () => {
    const { req, res } = makeReqRes({ params: { date: "invalid" } });
    const handler = getHandler("get", "/calendar/day/:date");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns meetings for a specific day", async () => {
    const dayMeetings = [{ id: 1, title: "اجتماع", date: "2025-07-10", time: "09:00", status: "scheduled", location: null }];
    mockDb.where
      .mockResolvedValueOnce(dayMeetings)
      .mockResolvedValue([{ userId: 2 }]);

    const { req, res } = makeReqRes({ params: { date: "2025-07-10" } });
    const handler = getHandler("get", "/calendar/day/:date");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body.length).toBe(1);
  });

  it("returns empty array when no meetings on day", async () => {
    mockDb.where.mockResolvedValue([]);

    const { req, res } = makeReqRes({ params: { date: "2025-07-01" } });
    const handler = getHandler("get", "/calendar/day/:date");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual([]);
  });
});

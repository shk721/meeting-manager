import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  meetingsTable: { id: "id", date: "date", status: "status" },
  meetingAttendeesTable: { userId: "user_id", meetingId: "meeting_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ eq: val })),
  inArray: vi.fn((_col: unknown, vals: unknown) => ({ in: vals })),
}));

import { db } from "@workspace/db";

const mockDb = db as any;

const attendeeRows = [
  { userId: 1, meetingId: 10 },
  { userId: 2, meetingId: 10 },
];

const dayMeetings = [
  { id: 10, title: "اجتماع مجدول", date: "2025-07-10", time: "09:00", status: "scheduled" },
];

function makeReqRes(query: Record<string, string> = {}) {
  const req: any = {
    params: {},
    query,
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

import schedulingRouter from "../scheduling";

function getHandler(method: string, path: string) {
  const layer = (schedulingRouter as any).stack.find((l: any) => {
    const routeMethod = Object.keys(l.route?.methods ?? {})[0];
    return routeMethod === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /scheduling/availability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);
  });

  it("returns 400 when attendees missing", async () => {
    const { req, res } = makeReqRes({ date: "2025-07-10" });
    const handler = getHandler("get", "/scheduling/availability");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when date missing", async () => {
    const { req, res } = makeReqRes({ attendees: "1,2" });
    const handler = getHandler("get", "/scheduling/availability");
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it("returns busy blocks when attendees have meetings on that date", async () => {
    mockDb.where
      .mockResolvedValueOnce(attendeeRows)
      .mockResolvedValueOnce(dayMeetings);

    const { req, res } = makeReqRes({ attendees: "1,2", date: "2025-07-10" });
    const handler = getHandler("get", "/scheduling/availability");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("busy");
    expect(Array.isArray(res._body.busy)).toBe(true);
  });

  it("returns empty busy array when no meetings on day", async () => {
    mockDb.where
      .mockResolvedValueOnce(attendeeRows)
      .mockResolvedValueOnce([]);

    const { req, res } = makeReqRes({ attendees: "1,2", date: "2025-07-11" });
    const handler = getHandler("get", "/scheduling/availability");
    await handler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.busy).toHaveLength(0);
  });
});

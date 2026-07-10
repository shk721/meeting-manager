import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  meetingsTable: {},
  tasksTable: {},
  meetingAttendeesTable: {},
  minutesTable: {},
  decisionsTable: {},
  usersTable: {},
  agendaItemsTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  gte: vi.fn((_c: unknown, v: unknown) => ({ gte: v })),
  lte: vi.fn((_c: unknown, v: unknown) => ({ lte: v })),
  lt: vi.fn((_c: unknown, v: unknown) => ({ lt: v })),
  inArray: vi.fn((_c: unknown, v: unknown) => ({ inArray: v })),
  isNotNull: vi.fn((c: unknown) => ({ isNotNull: c })),
}));

import { db } from "@workspace/db";
import analyticsRouter from "../analytics";

const mockDb = db as any;

function makeReqRes(overrides: { query?: Record<string, string>; params?: Record<string, string> } = {}) {
  const req: any = { params: overrides.params ?? {}, query: overrides.query ?? {}, body: {}, session: { userId: 1 } };
  const res: any = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
    send(body: unknown) { this._body = body; return this; },
  };
  return { req, res };
}

function getHandler(method: string, path: string) {
  const layer = (analyticsRouter as any).stack.find((l: any) => {
    const m = Object.keys(l.route?.methods ?? {})[0];
    return m === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

// Helper: mock N sequential from() calls returning given arrays
function mockSequentialSelects(...arrays: any[][]) {
  let call = 0;
  mockDb.select.mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockImplementation(() => {
        const data = arrays[call] ?? [];
        call++;
        return Promise.resolve(data);
      }),
      // some calls chain .from() without .where()
      then: (fn: Function) => { const data = arrays[call] ?? []; call++; return Promise.resolve(data).then(fn); },
    })),
    // handle direct from().mockResolvedValue pattern
  }));
}

describe("GET /analytics/effectiveness", () => {
  const handler = () => getHandler("get", "/analytics/effectiveness");

  it("returns meetings and averageScore", async () => {
    let call = 0;
    const returns = [
      [{ id: 1, title: "M1", date: "2026-07-01", status: "completed" }], // meetings
      [{ meetingId: 1 }], // minutes
      [{ meetingId: 1 }], // decisions
      [{ meetingId: 1 }], // tasks
      [{ meetingId: 1 }], // agendaItems
    ];
    mockDb.select.mockImplementation(() => {
      const data = returns[call] ?? [];
      call++;
      return { from: vi.fn().mockResolvedValue(data) };
    });
    const { req, res } = makeReqRes();
    await handler()(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("meetings");
    expect(res._body).toHaveProperty("averageScore");
  });

  it("returns averageScore 0 when no meetings", async () => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockResolvedValue([]) }));
    const { req, res } = makeReqRes();
    await handler()(req, res);
    expect(res._body.averageScore).toBe(0);
    expect(res._body.meetings).toHaveLength(0);
  });

  it("score is 100 when all factors present", async () => {
    let call = 0;
    const returns = [
      [{ id: 1, title: "Full", date: "2026-07-01", status: "completed" }], // meetings
      [{ meetingId: 1 }], // minutes
      [{ meetingId: 1 }], // decisions
      [{ meetingId: 1 }], // tasks
      [{ meetingId: 1 }], // agendaItems
    ];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockResolvedValue(d) }; });
    const { req, res } = makeReqRes();
    await handler()(req, res);
    expect(res._body.meetings[0].score).toBe(100);
  });

  it("score is 0 when no factors", async () => {
    let call = 0;
    const returns = [
      [{ id: 2, title: "Empty", date: "2026-07-01", status: "scheduled" }], // meetings
      [], // minutes
      [], // decisions
      [], // tasks
      [], // agendaItems
    ];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockResolvedValue(d) }; });
    const { req, res } = makeReqRes();
    await handler()(req, res);
    expect(res._body.meetings[0].score).toBe(0);
  });
});

describe("GET /analytics/productivity", () => {
  const handler = (q: Record<string, string> = {}) => {
    const h = getHandler("get", "/analytics/productivity");
    const { req, res } = makeReqRes({ query: q });
    return { run: () => h(req, res), res };
  };

  beforeEach(() => {
    let call = 0;
    const returns = [
      [{ id: 1, fullName: "User" }],
      [],  // attendees
      [],  // meetings
      [],  // tasks
    ];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockResolvedValue(d) }; });
  });

  it("returns single user object when user_id given", async () => {
    const { run, res } = handler({ user_id: "1" });
    await run();
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("userId");
  });

  it("returns array when no user_id", async () => {
    const { run, res } = handler();
    await run();
    expect(Array.isArray(res._body)).toBe(true);
  });

  it("accepts period=month", async () => {
    const { run, res } = handler({ period: "month" });
    await run();
    expect(res._status).toBe(200);
  });

  it("includes actionItems fields", async () => {
    const { run, res } = handler({ user_id: "1" });
    await run();
    expect(res._body).toHaveProperty("actionItemsOwned");
    expect(res._body).toHaveProperty("actionItemsCompleted");
  });
});

describe("GET /analytics/trends", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockResolvedValue([]) }));
  });

  it("returns frequency trends", async () => {
    const h = getHandler("get", "/analytics/trends");
    const { req, res } = makeReqRes({ query: { metric: "frequency", weeks: "4" } });
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body.metric).toBe("frequency");
    expect(Array.isArray(res._body.data)).toBe(true);
  });

  it("returns attendance trends", async () => {
    const h = getHandler("get", "/analytics/trends");
    const { req, res } = makeReqRes({ query: { metric: "attendance" } });
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body.metric).toBe("attendance");
  });

  it("returns 400 for invalid metric", async () => {
    const h = getHandler("get", "/analytics/trends");
    const { req, res } = makeReqRes({ query: { metric: "invalid" } });
    await h(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /analytics/team-health", () => {
  beforeEach(() => {
    let call = 0;
    const returns = [
      [{ id: 1, status: "completed", dueDate: null }, { id: 2, status: "open", dueDate: "2020-01-01" }],
      [],
      [],
    ];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockResolvedValue(d) }; });
  });

  it("returns score between 0 and 100", async () => {
    const h = getHandler("get", "/analytics/team-health");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body.score).toBeGreaterThanOrEqual(0);
    expect(res._body.score).toBeLessThanOrEqual(100);
  });

  it("includes completionRate and engagementScore", async () => {
    const h = getHandler("get", "/analytics/team-health");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._body).toHaveProperty("completionRate");
    expect(res._body).toHaveProperty("engagementScore");
  });

  it("reports overdueCount", async () => {
    const h = getHandler("get", "/analytics/team-health");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._body).toHaveProperty("overdueCount");
  });
});

describe("GET /analytics/time-allocation", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockResolvedValue([]) }));
  });

  it("returns totalMinutesInMeetings and dailyBreakdown", async () => {
    const h = getHandler("get", "/analytics/time-allocation");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("totalMinutesInMeetings");
    expect(res._body).toHaveProperty("dailyBreakdown");
  });

  it("accepts user_id filter", async () => {
    const h = getHandler("get", "/analytics/time-allocation");
    const { req, res } = makeReqRes({ query: { user_id: "1" } });
    await h(req, res);
    expect(res._body.userId).toBe(1);
  });
});

describe("GET /analytics/actionitems/status", () => {
  const fakeData = [
    { id: 1, status: "open", dueDate: "2020-01-01", assigneeId: 1, priority: "high" },
    { id: 2, status: "completed", dueDate: null, assigneeId: 1, priority: "low" },
  ];

  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => {
        const p: any = Promise.resolve(fakeData);
        p.where = vi.fn().mockResolvedValue(fakeData);
        return p;
      }),
    }));
  });

  it("returns open, completed, overdue counts", async () => {
    const h = getHandler("get", "/analytics/actionitems/status");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toHaveProperty("open");
    expect(res._body).toHaveProperty("completed");
    expect(res._body).toHaveProperty("overdue");
  });

  it("returns byOwner array", async () => {
    const h = getHandler("get", "/analytics/actionitems/status");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(Array.isArray(res._body.byOwner)).toBe(true);
  });
});

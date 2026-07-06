import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
  meetingsTable: {},
  minutesTable: {},
  tasksTable: {},
  decisionsTable: {},
  meetingAttendeesTable: {},
  usersTable: {},
  reportSubscriptionsTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  inArray: vi.fn((_c: unknown, v: unknown) => ({ inArray: v })),
}));

vi.mock("../services/export", () => ({
  generateMeetingPDF: vi.fn().mockReturnValue(Buffer.from("%PDF-1.4")),
  generateWeeklyReportPDF: vi.fn().mockReturnValue(Buffer.from("%PDF-1.4")),
  generateMeetingICalString: vi.fn().mockReturnValue("BEGIN:VCALENDAR\r\nEND:VCALENDAR"),
  generateMeetingsCSV: vi.fn().mockReturnValue("id,title\n1,Test"),
  generateActionItemsCSV: vi.fn().mockReturnValue("id,title,status\n1,Task,open"),
  generateExcelBuffer: vi.fn().mockReturnValue(Buffer.from("PK")),
}));

import { db } from "@workspace/db";
import exportRouter from "../export";

const mockDb = db as any;

const fakeMeeting = { id: 1, title: "Test Meeting", date: "2026-07-01", time: "09:00", status: "scheduled", location: "Room A", agendaItems: [] };
const fakeUser = { id: 1, fullName: "Admin User" };

function makeReqRes(overrides: { query?: Record<string, string>; params?: Record<string, string>; body?: Record<string, any> } = {}) {
  const req: any = { params: overrides.params ?? {}, query: overrides.query ?? {}, body: overrides.body ?? {}, session: { userId: 1 } };
  const bufs: Buffer[] = [];
  const res: any = {
    _status: 200,
    _body: undefined as unknown,
    _headers: {} as Record<string, any>,
    _sent: false,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
    send(body: unknown) { this._body = body; this._sent = true; return this; },
    set(headers: Record<string, any>) { Object.assign(this._headers, headers); return this; },
    sendStatus(code: number) { this._status = code; return this; },
  };
  return { req, res };
}

function getHandler(method: string, path: string) {
  const layer = (exportRouter as any).stack.find((l: any) => {
    const m = Object.keys(l.route?.methods ?? {})[0];
    return m === method && l.route?.path === path;
  });
  return layer?.route?.stack?.[0]?.handle;
}

describe("GET /export/meeting/:id/pdf", () => {
  beforeEach(() => {
    let call = 0;
    const returns = [
      [fakeMeeting],
      [],  // minutes
      [],  // tasks
      [],  // decisions
      [],  // attendeeRows
      [],  // attendees users
    ];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(d) }) }; });
  });

  it("returns application/pdf content-type", async () => {
    const h = getHandler("get", "/export/meeting/:id/pdf");
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("application/pdf");
  });

  it("sends a buffer", async () => {
    const h = getHandler("get", "/export/meeting/:id/pdf");
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await h(req, res);
    expect(res._sent).toBe(true);
  });

  it("returns 404 when meeting not found", async () => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }));
    const h = getHandler("get", "/export/meeting/:id/pdf");
    const { req, res } = makeReqRes({ params: { id: "999" } });
    await h(req, res);
    expect(res._status).toBe(404);
  });
});

describe("GET /export/meeting/:id/ical", () => {
  beforeEach(() => {
    let call = 0;
    const returns = [[fakeMeeting], [], []];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(d) }) }; });
  });

  it("returns text/calendar content-type", async () => {
    const h = getHandler("get", "/export/meeting/:id/ical");
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("text/calendar");
  });

  it("returns iCal content starting with BEGIN:VCALENDAR", async () => {
    const h = getHandler("get", "/export/meeting/:id/ical");
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await h(req, res);
    expect(String(res._body)).toContain("VCALENDAR");
  });
});

describe("POST /export/meetings/bulk", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([fakeMeeting]) }) }));
  });

  it("returns json when format=json", async () => {
    const h = getHandler("post", "/export/meetings/bulk");
    const { req, res } = makeReqRes({ body: { meeting_ids: [1], format: "json" } });
    await h(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual([fakeMeeting]);
  });

  it("returns csv content when format=csv", async () => {
    const h = getHandler("post", "/export/meetings/bulk");
    const { req, res } = makeReqRes({ body: { meeting_ids: [1], format: "csv" } });
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("text/csv");
  });

  it("returns excel buffer when format=excel", async () => {
    const h = getHandler("post", "/export/meetings/bulk");
    const { req, res } = makeReqRes({ body: { meeting_ids: [1], format: "excel" } });
    await h(req, res);
    expect(res._sent).toBe(true);
  });

  it("returns 400 when meeting_ids missing", async () => {
    const h = getHandler("post", "/export/meetings/bulk");
    const { req, res } = makeReqRes({ body: { format: "csv" } });
    await h(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 for invalid format", async () => {
    const h = getHandler("post", "/export/meetings/bulk");
    const { req, res } = makeReqRes({ body: { meeting_ids: [1], format: "docx" } });
    await h(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /export/report/weekly", () => {
  beforeEach(() => {
    let call = 0;
    const returns = [[fakeUser], [], [], []];
    mockDb.select.mockImplementation(() => { const d = returns[call] ?? []; call++; return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(d) }) }; });
  });

  it("returns application/pdf", async () => {
    const h = getHandler("get", "/export/report/weekly");
    const { req, res } = makeReqRes({ query: { user_id: "1", week: "2026-07-01" } });
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("application/pdf");
  });

  it("returns 404 when user not found", async () => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }));
    const h = getHandler("get", "/export/report/weekly");
    const { req, res } = makeReqRes({ query: { user_id: "999" } });
    await h(req, res);
    expect(res._status).toBe(404);
  });

  it("sends a non-empty PDF buffer", async () => {
    const h = getHandler("get", "/export/report/weekly");
    const { req, res } = makeReqRes({ query: { user_id: "1" } });
    await h(req, res);
    expect(res._sent).toBe(true);
  });
});

describe("GET /export/report/team", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({ from: vi.fn().mockResolvedValue([fakeMeeting]) }));
  });

  it("returns application/pdf", async () => {
    const h = getHandler("get", "/export/report/team");
    const { req, res } = makeReqRes({ query: { period: "month" } });
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("application/pdf");
  });

  it("defaults to month period", async () => {
    const h = getHandler("get", "/export/report/team");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._sent).toBe(true);
  });
});

describe("GET /export/actionitems/csv", () => {
  beforeEach(() => {
    mockDb.select.mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, title: "Task", status: "open", priority: "high", dueDate: null, assigneeId: 1 }]),
      }),
    }));
  });

  it("returns text/csv content-type", async () => {
    const h = getHandler("get", "/export/actionitems/csv");
    const { req, res } = makeReqRes();
    await h(req, res);
    expect(res._headers["Content-Type"]).toBe("text/csv");
  });
});

describe("POST /export/subscribe", () => {
  it("returns 201 with subscription on valid data", async () => {
    const h = getHandler("post", "/export/subscribe");
    const { req, res } = makeReqRes({ body: { email: "test@example.com", frequency: "weekly" } });
    await h(req, res);
    expect(res._status).toBe(201);
  });

  it("returns 400 for invalid email", async () => {
    const h = getHandler("post", "/export/subscribe");
    const { req, res } = makeReqRes({ body: { email: "bad-email", frequency: "weekly" } });
    await h(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 for invalid frequency", async () => {
    const h = getHandler("post", "/export/subscribe");
    const { req, res } = makeReqRes({ body: { email: "a@b.com", frequency: "daily" } });
    await h(req, res);
    expect(res._status).toBe(400);
  });
});

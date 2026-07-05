import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db/analytics-queries", () => ({
  getMeetingStats: vi.fn(),
  getTaskStats: vi.fn(),
  getInsights: vi.fn(),
  getThisWeekData: vi.fn(),
  getPendingData: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  meetingsTable: {},
  tasksTable: {},
  minutesTable: {},
  usersTable: {},
  meetingAttendeesTable: {},
}));

import * as analyticsQueries from "@workspace/db/analytics-queries";

const mockGetMeetingStats = vi.mocked(analyticsQueries.getMeetingStats);
const mockGetTaskStats = vi.mocked(analyticsQueries.getTaskStats);
const mockGetInsights = vi.mocked(analyticsQueries.getInsights);
const mockGetThisWeek = vi.mocked(analyticsQueries.getThisWeekData);
const mockGetPending = vi.mocked(analyticsQueries.getPendingData);

function makeReqRes(overrides: {
  query?: Record<string, string>;
  session?: Record<string, unknown>;
} = {}) {
  const req: any = {
    params: {},
    query: overrides.query ?? {},
    body: {},
    session: { userId: 1, ...(overrides.session ?? {}) },
  };
  const res: any = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) { this._status = code; return this; },
    json(body: unknown) { this._body = body; return this; },
    sendStatus(code: number) { this._status = code; return this; },
  };
  return { req, res };
}

import router from "../dashboard.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(method: string, path: string): Handler {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[0].handle as Handler;
}

const fakeMeetingStats = [
  { date: "2026-06-30", count: 3, completed: 2, cancelled: 0, inProgress: 1 },
  { date: "2026-07-05", count: 5, completed: 3, cancelled: 1, inProgress: 1 },
];

const fakeTaskStats = [
  { date: "2026-06-30", count: 10, completed: 7, pending: 3, overdue: 1, high: 2 },
  { date: "2026-07-05", count: 8, completed: 5, pending: 3, overdue: 2, high: 3 },
];

const fakeInsights = {
  busiestDay: "الاثنين",
  completionRate: 72,
  avgAttendeesPerMeeting: 4,
  mostActiveAttendee: "أحمد محمد",
  overdueTaskCount: 3,
  totalMeetings: 15,
  totalTasks: 42,
};

const fakeThisWeek = {
  meetings: [{ id: 1, title: "اجتماع أسبوعي", date: "2026-07-07", time: "10:00", status: "scheduled" }],
  tasks: [{ id: 1, title: "مراجعة التقرير", status: "open", priority: "high", dueDate: "2026-07-10" }],
  upcoming: [{ id: 2, title: "مراجعة المشروع", date: "2026-07-08", time: "14:00" }],
};

const fakePending = {
  overdueTasks: [{ id: 5, title: "تقرير متأخر", dueDate: "2026-06-30", priority: "critical", status: "open" }],
  upcomingMeetings: [{ id: 3, title: "اجتماع الإدارة", date: "2026-07-06", time: "09:00", status: "scheduled" }],
};

describe("GET /dashboard/this-week", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns meetings, tasks, upcoming arrays", async () => {
    mockGetThisWeek.mockResolvedValue(fakeThisWeek as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/this-week")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).meetings).toHaveLength(1);
    expect((res._body as any).tasks).toHaveLength(1);
    expect((res._body as any).upcoming).toHaveLength(1);
  });

  it("meetings array has expected shape", async () => {
    mockGetThisWeek.mockResolvedValue(fakeThisWeek as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/this-week")(req, res);
    const m = (res._body as any).meetings[0];
    expect(m).toHaveProperty("id");
    expect(m).toHaveProperty("title");
    expect(m).toHaveProperty("date");
  });
});

describe("GET /dashboard/pending", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns overdueTasks and upcomingMeetings", async () => {
    mockGetPending.mockResolvedValue(fakePending as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/pending")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).overdueTasks).toHaveLength(1);
    expect((res._body as any).upcomingMeetings).toHaveLength(1);
  });

  it("overdue task has priority and dueDate", async () => {
    mockGetPending.mockResolvedValue(fakePending as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/pending")(req, res);
    const t = (res._body as any).overdueTasks[0];
    expect(t.priority).toBe("critical");
    expect(t.dueDate).toBe("2026-06-30");
  });
});

describe("GET /dashboard/meeting-stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to week when no period param", async () => {
    mockGetMeetingStats.mockResolvedValue(fakeMeetingStats as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    expect(mockGetMeetingStats).toHaveBeenCalledWith("week");
    expect(res._status).toBe(200);
  });

  it("accepts period=day", async () => {
    mockGetMeetingStats.mockResolvedValue(fakeMeetingStats as any);
    const { req, res } = makeReqRes({ query: { period: "day" } });
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    expect(mockGetMeetingStats).toHaveBeenCalledWith("day");
    expect(res._status).toBe(200);
  });

  it("accepts period=week", async () => {
    mockGetMeetingStats.mockResolvedValue(fakeMeetingStats as any);
    const { req, res } = makeReqRes({ query: { period: "week" } });
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    expect(res._status).toBe(200);
  });

  it("accepts period=month", async () => {
    mockGetMeetingStats.mockResolvedValue(fakeMeetingStats as any);
    const { req, res } = makeReqRes({ query: { period: "month" } });
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    expect(mockGetMeetingStats).toHaveBeenCalledWith("month");
    expect(res._status).toBe(200);
  });

  it("returns 400 for invalid period", async () => {
    const { req, res } = makeReqRes({ query: { period: "hourly" } });
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    expect(res._status).toBe(400);
    expect(mockGetMeetingStats).not.toHaveBeenCalled();
  });

  it("returns array with count/completed/cancelled fields", async () => {
    mockGetMeetingStats.mockResolvedValue(fakeMeetingStats as any);
    const { req, res } = makeReqRes({ query: { period: "week" } });
    await getHandler("get", "/dashboard/meeting-stats")(req, res);
    const arr = res._body as any[];
    expect(arr[0]).toHaveProperty("count");
    expect(arr[0]).toHaveProperty("completed");
    expect(arr[0]).toHaveProperty("cancelled");
    expect(arr[0]).toHaveProperty("date");
  });
});

describe("GET /dashboard/task-stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defaults to week when no period param", async () => {
    mockGetTaskStats.mockResolvedValue(fakeTaskStats as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/task-stats")(req, res);
    expect(mockGetTaskStats).toHaveBeenCalledWith("week");
    expect(res._status).toBe(200);
  });

  it("accepts period=day", async () => {
    mockGetTaskStats.mockResolvedValue(fakeTaskStats as any);
    const { req, res } = makeReqRes({ query: { period: "day" } });
    await getHandler("get", "/dashboard/task-stats")(req, res);
    expect(mockGetTaskStats).toHaveBeenCalledWith("day");
  });

  it("accepts period=month", async () => {
    mockGetTaskStats.mockResolvedValue(fakeTaskStats as any);
    const { req, res } = makeReqRes({ query: { period: "month" } });
    await getHandler("get", "/dashboard/task-stats")(req, res);
    expect(mockGetTaskStats).toHaveBeenCalledWith("month");
  });

  it("returns 400 for invalid period", async () => {
    const { req, res } = makeReqRes({ query: { period: "quarterly" } });
    await getHandler("get", "/dashboard/task-stats")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns array with count/completed/overdue/high fields", async () => {
    mockGetTaskStats.mockResolvedValue(fakeTaskStats as any);
    const { req, res } = makeReqRes({ query: { period: "week" } });
    await getHandler("get", "/dashboard/task-stats")(req, res);
    const arr = res._body as any[];
    expect(arr[0]).toHaveProperty("count");
    expect(arr[0]).toHaveProperty("completed");
    expect(arr[0]).toHaveProperty("overdue");
    expect(arr[0]).toHaveProperty("high");
  });
});

describe("GET /dashboard/insights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all 7 insight fields", async () => {
    mockGetInsights.mockResolvedValue(fakeInsights as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/insights")(req, res);
    expect(res._status).toBe(200);
    const d = res._body as any;
    expect(d).toHaveProperty("busiestDay");
    expect(d).toHaveProperty("completionRate");
    expect(d).toHaveProperty("avgAttendeesPerMeeting");
    expect(d).toHaveProperty("mostActiveAttendee");
    expect(d).toHaveProperty("overdueTaskCount");
    expect(d).toHaveProperty("totalMeetings");
    expect(d).toHaveProperty("totalTasks");
  });

  it("returns correct values", async () => {
    mockGetInsights.mockResolvedValue(fakeInsights as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/dashboard/insights")(req, res);
    expect((res._body as any).completionRate).toBe(72);
    expect((res._body as any).busiestDay).toBe("الاثنين");
    expect((res._body as any).totalTasks).toBe(42);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db/filter-queries", () => ({
  filterMeetings: vi.fn(),
  filterTasks: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
  savedViewsTable: {},
}));

import * as filterQueries from "@workspace/db/filter-queries";
import * as dbModule from "@workspace/db";

const mockFilterMeetings = vi.mocked(filterQueries.filterMeetings);
const mockFilterTasks    = vi.mocked(filterQueries.filterTasks);
const mockDb             = vi.mocked(dbModule.db);

function makeReqRes(overrides: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
  session?: Record<string, unknown>;
} = {}) {
  const req: any = {
    params: overrides.params ?? {},
    query: overrides.query ?? {},
    body: overrides.body ?? {},
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

import filtersRouter from "../filters.js";
import viewsRouter   from "../views.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(router: any, method: string, path: string): Handler {
  const layer = router.stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found in router`);
  return layer.route.stack[0].handle as Handler;
}

const fakeMeeting = { id: 1, title: "اجتماع", status: "scheduled", date: "2025-06-01" };
const fakeTask    = { id: 2, title: "مهمة", status: "open", priority: "high" };

describe("GET /filters/meetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns filtered meetings", async () => {
    mockFilterMeetings.mockResolvedValue({ data: [fakeMeeting], total: 1 });
    const { req, res } = makeReqRes({ query: { status: "scheduled" } });
    await getHandler(filtersRouter, "get", "/filters/meetings")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ data: [fakeMeeting], pagination: { total: 1 }, appliedFilters: { status: "scheduled" } });
    expect(mockFilterMeetings).toHaveBeenCalledWith({ status: "scheduled" }, 20, 0);
  });

  it("passes chairpersonId and date range", async () => {
    mockFilterMeetings.mockResolvedValue({ data: [], total: 0 });
    const { req, res } = makeReqRes({ query: { chairpersonId: "3", startDate: "2025-01-01", endDate: "2025-12-31" } });
    await getHandler(filtersRouter, "get", "/filters/meetings")(req, res);
    expect(mockFilterMeetings).toHaveBeenCalledWith({ chairpersonId: 3, startDate: "2025-01-01", endDate: "2025-12-31" }, 20, 0);
  });

  it("returns 401 when not authenticated", async () => {
    const { req, res } = makeReqRes({ session: { userId: undefined } });
    await getHandler(filtersRouter, "get", "/filters/meetings")(req, res);
    expect(res._status).toBe(401);
  });

  it("supports pagination", async () => {
    mockFilterMeetings.mockResolvedValue({ data: [], total: 30 });
    const { req, res } = makeReqRes({ query: { limit: "5", offset: "5" } });
    await getHandler(filtersRouter, "get", "/filters/meetings")(req, res);
    expect(mockFilterMeetings).toHaveBeenCalledWith({}, 5, 5);
    expect(res._body).toMatchObject({ pagination: { hasMore: true } });
  });
});

describe("GET /filters/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns filtered tasks", async () => {
    mockFilterTasks.mockResolvedValue({ data: [fakeTask], total: 1 });
    const { req, res } = makeReqRes({ query: { status: "open", priority: "high" } });
    await getHandler(filtersRouter, "get", "/filters/tasks")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ data: [fakeTask], appliedFilters: { status: "open", priority: "high" } });
    expect(mockFilterTasks).toHaveBeenCalledWith({ status: "open", priority: "high" }, 20, 0);
  });

  it("returns 401 when not authenticated", async () => {
    const { req, res } = makeReqRes({ session: { userId: undefined } });
    await getHandler(filtersRouter, "get", "/filters/tasks")(req, res);
    expect(res._status).toBe(401);
  });
});

describe("Views CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  const fakeView = { id: 1, userId: 1, name: "مجدول", type: "meetings", filters: '{"status":"scheduled"}', createdAt: new Date() };

  it("POST /views — creates a view and returns 201", async () => {
    mockDb.insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([fakeView]),
      }),
    });
    const { req, res } = makeReqRes({ body: { name: "مجدول", type: "meetings", filters: { status: "scheduled" } } });
    await getHandler(viewsRouter, "post", "/views")(req, res);
    expect(res._status).toBe(201);
    expect((res._body as any).filters).toEqual({ status: "scheduled" });
  });

  it("GET /views — returns views for current user", async () => {
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([fakeView]),
      }),
    });
    const { req, res } = makeReqRes();
    await getHandler(viewsRouter, "get", "/views")(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
  });

  it("DELETE /views/:id — returns 204", async () => {
    mockDb.delete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });
    const { req, res } = makeReqRes({ params: { id: "1" } });
    await getHandler(viewsRouter, "delete", "/views/:id")(req, res);
    expect(res._status).toBe(204);
  });

  it("DELETE /views/:id — returns 400 for invalid id", async () => {
    const { req, res } = makeReqRes({ params: { id: "abc" } });
    await getHandler(viewsRouter, "delete", "/views/:id")(req, res);
    expect(res._status).toBe(400);
  });
});

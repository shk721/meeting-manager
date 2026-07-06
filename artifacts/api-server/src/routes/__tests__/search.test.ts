import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db/search-queries", () => ({
  searchMeetings: vi.fn(),
  searchTasks: vi.fn(),
}));

import * as searchQueries from "@workspace/db/search-queries";

const mockSearchMeetings = vi.mocked(searchQueries.searchMeetings);
const mockSearchTasks    = vi.mocked(searchQueries.searchTasks);

function makeReqRes(overrides: {
  params?: Record<string, string>;
  query?: Record<string, string>;
  session?: Record<string, unknown>;
} = {}) {
  const req: any = {
    params: overrides.params ?? {},
    query: overrides.query ?? {},
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

import router from "../search.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(method: string, path: string): Handler {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[0].handle as Handler;
}

const fakeMeeting = { id: 1, title: "اجتماع الميزانية", createdAt: new Date("2025-01-01") };
const fakeTask    = { id: 2, title: "مراجعة التقرير",   createdAt: new Date("2025-01-02") };

describe("GET /search/meetings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns meetings matching query", async () => {
    mockSearchMeetings.mockResolvedValue({ data: [fakeMeeting], total: 1 });
    const { req, res } = makeReqRes({ query: { q: "ميزانية" } });
    await getHandler("get", "/search/meetings")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ data: [fakeMeeting], pagination: { total: 1, limit: 20, offset: 0 } });
    expect(mockSearchMeetings).toHaveBeenCalledWith("ميزانية", 20, 0);
  });

  it("supports pagination params", async () => {
    mockSearchMeetings.mockResolvedValue({ data: [], total: 50 });
    const { req, res } = makeReqRes({ query: { q: "اجتماع", limit: "5", offset: "10" } });
    await getHandler("get", "/search/meetings")(req, res);
    expect(mockSearchMeetings).toHaveBeenCalledWith("اجتماع", 5, 10);
    expect(res._body).toMatchObject({ pagination: { limit: 5, offset: 10, hasMore: true } });
  });

  it("returns 400 when query is missing", async () => {
    const { req, res } = makeReqRes({ query: {} });
    await getHandler("get", "/search/meetings")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 when query is too short (< 2 chars)", async () => {
    const { req, res } = makeReqRes({ query: { q: "أ" } });
    await getHandler("get", "/search/meetings")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const { req, res } = makeReqRes({ session: { userId: undefined } });
    req.query = { q: "test" };
    await getHandler("get", "/search/meetings")(req, res);
    expect(res._status).toBe(401);
  });

  it("returns empty data when no results", async () => {
    mockSearchMeetings.mockResolvedValue({ data: [], total: 0 });
    const { req, res } = makeReqRes({ query: { q: "غير موجود" } });
    await getHandler("get", "/search/meetings")(req, res);
    expect(res._body).toMatchObject({ data: [], pagination: { total: 0, hasMore: false } });
  });
});

describe("GET /search/tasks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns tasks matching query", async () => {
    mockSearchTasks.mockResolvedValue({ data: [fakeTask], total: 1 });
    const { req, res } = makeReqRes({ query: { q: "مراجعة" } });
    await getHandler("get", "/search/tasks")(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ data: [fakeTask], pagination: { total: 1 } });
    expect(mockSearchTasks).toHaveBeenCalledWith("مراجعة", 20, 0);
  });

  it("returns 401 when not authenticated", async () => {
    const { req, res } = makeReqRes({ session: { userId: undefined } });
    req.query = { q: "test" };
    await getHandler("get", "/search/tasks")(req, res);
    expect(res._status).toBe(401);
  });
});

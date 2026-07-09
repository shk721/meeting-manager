import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module before any imports that use it
vi.mock("@workspace/db/notifications-queries", () => ({
  getUnreadCount: vi.fn(),
  getUserNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

import * as notifQueries from "@workspace/db/notifications-queries";

const mockGetUnreadCount    = vi.mocked(notifQueries.getUnreadCount);
const mockGetUserNotifs     = vi.mocked(notifQueries.getUserNotifications);
const mockMarkAsRead        = vi.mocked(notifQueries.markAsRead);
const mockMarkAllAsRead     = vi.mocked(notifQueries.markAllAsRead);
const mockDeleteNotification = vi.mocked(notifQueries.deleteNotification);

// Minimal request / response mocks
function makeReqRes(
  overrides: { params?: Record<string, string>; query?: Record<string, string>; session?: Record<string, unknown> } = {}
) {
  const req: any = {
    params: overrides.params ?? {},
    query:  overrides.query  ?? {},
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

// Pull the route handlers directly from the router stack
import router from "./notifications.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(method: string, path: string): Handler {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  const handle = layer.route.stack[0].handle as Handler;
  return handle;
}

describe("GET /notifications/unread-count", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns count for authenticated user", async () => {
    mockGetUnreadCount.mockResolvedValue(5);
    const { req, res } = makeReqRes();
    await getHandler("get", "/notifications/unread-count")(req, res);
    expect(res._body).toEqual({ count: 5 });
    expect(mockGetUnreadCount).toHaveBeenCalledWith(1);
  });

});

describe("GET /notifications", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notification list", async () => {
    const now = new Date();
    const fakeNotifs = [{ id: 1, title: "Test", message: "m", type: "t",
      userId: 1, isRead: false, metadata: null,
      relatedId: null, relatedType: null,
      createdAt: now, expiresAt: null }];
    mockGetUserNotifs.mockResolvedValue(fakeNotifs as any);
    const { req, res } = makeReqRes({ query: { limit: "10", offset: "0" } });
    await getHandler("get", "/notifications")(req, res);
    expect((res._body as any[])[0].id).toBe(1);
    expect((res._body as any[])[0].createdAt).toBe(now.toISOString());
    expect(mockGetUserNotifs).toHaveBeenCalledWith(1, 10, 0);
  });

  it("clamps limit to 100 max", async () => {
    mockGetUserNotifs.mockResolvedValue([]);
    const { req, res } = makeReqRes({ query: { limit: "999" } });
    await getHandler("get", "/notifications")(req, res);
    expect(mockGetUserNotifs).toHaveBeenCalledWith(1, 100, 0);
  });
});

describe("POST /notifications/:id/read", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks notification as read", async () => {
    mockMarkAsRead.mockResolvedValue(undefined as any);
    const { req, res } = makeReqRes({ params: { id: "7" } });
    await getHandler("post", "/notifications/:id/read")(req, res);
    expect(res._status).toBe(204);
    expect(mockMarkAsRead).toHaveBeenCalledWith(7, 1);
  });

  it("returns 400 for non-numeric id", async () => {
    const { req, res } = makeReqRes({ params: { id: "abc" } });
    await getHandler("post", "/notifications/:id/read")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("POST /notifications/read-all", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks all as read", async () => {
    mockMarkAllAsRead.mockResolvedValue(undefined as any);
    const { req, res } = makeReqRes();
    await getHandler("post", "/notifications/read-all")(req, res);
    expect(res._status).toBe(204);
    expect(mockMarkAllAsRead).toHaveBeenCalledWith(1);
  });
});

describe("DELETE /notifications/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a notification", async () => {
    mockDeleteNotification.mockResolvedValue(undefined as any);
    const { req, res } = makeReqRes({ params: { id: "3" } });
    await getHandler("delete", "/notifications/:id")(req, res);
    expect(res._status).toBe(204);
    expect(mockDeleteNotification).toHaveBeenCalledWith(3, 1);
  });

  it("returns 400 for invalid id", async () => {
    const { req, res } = makeReqRes({ params: { id: "bad" } });
    await getHandler("delete", "/notifications/:id")(req, res);
    expect(res._status).toBe(400);
  });
});

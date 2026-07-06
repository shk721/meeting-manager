import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db/preferences-queries", () => ({
  getUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}));

import * as prefsQueries from "@workspace/db/preferences-queries";

const mockGetPrefs    = vi.mocked(prefsQueries.getUserPreferences);
const mockUpdatePrefs = vi.mocked(prefsQueries.updateUserPreferences);

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

import router from "../settings.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(method: string, path: string): Handler {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[0].handle as Handler;
}

const defaultPrefs = {
  id: 1, userId: 1,
  notificationsEmail: true, notificationsPush: true, notificationsSms: false,
  emailDigest: "daily",
  twoFactorEnabled: false, twoFactorMethod: null, twoFactorPendingCode: null,
  showInDirectory: true,
  createdAt: new Date(), updatedAt: new Date(),
};

describe("GET /settings/preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns preferences for authenticated user", async () => {
    mockGetPrefs.mockResolvedValue(defaultPrefs as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/settings/preferences")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).preferences.notificationsEmail).toBe(true);
    expect((res._body as any).preferences.emailDigest).toBe("daily");
  });

  it("returns 401 when not authenticated", async () => {
    const { req, res } = makeReqRes({ session: { userId: undefined } });
    await getHandler("get", "/settings/preferences")(req, res);
    expect(res._status).toBe(401);
  });

  it("returns all expected default values", async () => {
    mockGetPrefs.mockResolvedValue(defaultPrefs as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/settings/preferences")(req, res);
    const p = (res._body as any).preferences;
    expect(p.notificationsEmail).toBe(true);
    expect(p.notificationsPush).toBe(true);
    expect(p.notificationsSms).toBe(false);
    expect(p.twoFactorEnabled).toBe(false);
    expect(p.showInDirectory).toBe(true);
  });
});

describe("PUT /settings/preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates notification settings", async () => {
    const updated = { ...defaultPrefs, notificationsEmail: false, notificationsSms: true };
    mockUpdatePrefs.mockResolvedValue(updated as any);
    const { req, res } = makeReqRes({ body: { notificationsEmail: false, notificationsSms: true } });
    await getHandler("put", "/settings/preferences")(req, res);
    expect(res._status).toBe(200);
    expect(mockUpdatePrefs).toHaveBeenCalledWith(1, { notificationsEmail: false, notificationsSms: true });
  });

  it("updates email digest frequency", async () => {
    const updated = { ...defaultPrefs, emailDigest: "weekly" };
    mockUpdatePrefs.mockResolvedValue(updated as any);
    const { req, res } = makeReqRes({ body: { emailDigest: "weekly" } });
    await getHandler("put", "/settings/preferences")(req, res);
    expect((res._body as any).preferences.emailDigest).toBe("weekly");
  });

  it("updates showInDirectory", async () => {
    const updated = { ...defaultPrefs, showInDirectory: false };
    mockUpdatePrefs.mockResolvedValue(updated as any);
    const { req, res } = makeReqRes({ body: { showInDirectory: false } });
    await getHandler("put", "/settings/preferences")(req, res);
    expect(mockUpdatePrefs).toHaveBeenCalledWith(1, { showInDirectory: false });
  });

  it("returns 400 for invalid emailDigest value", async () => {
    const { req, res } = makeReqRes({ body: { emailDigest: "hourly" } });
    await getHandler("put", "/settings/preferences")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("Two-factor endpoints", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /settings/two-factor/enable — returns secret_key and qrCode (email)", async () => {
    mockUpdatePrefs.mockResolvedValue({ ...defaultPrefs } as any);
    const { req, res } = makeReqRes({ body: { method: "email" } });
    await getHandler("post", "/settings/two-factor/enable")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).secret_key).toBeDefined();
    expect((res._body as any).qrCode).toBeDefined();
    expect((res._body as any).method).toBe("email");
  });

  it("POST /settings/two-factor/enable — returns secret_key (sms)", async () => {
    mockUpdatePrefs.mockResolvedValue({ ...defaultPrefs } as any);
    const { req, res } = makeReqRes({ body: { method: "sms" } });
    await getHandler("post", "/settings/two-factor/enable")(req, res);
    expect((res._body as any).method).toBe("sms");
  });

  it("POST /settings/two-factor/enable — returns 400 for invalid method", async () => {
    const { req, res } = makeReqRes({ body: { method: "app" } });
    await getHandler("post", "/settings/two-factor/enable")(req, res);
    expect(res._status).toBe(400);
  });

  it("POST /settings/two-factor/verify — returns enabled:true when code matches", async () => {
    mockGetPrefs.mockResolvedValue({ ...defaultPrefs, twoFactorPendingCode: "123456" } as any);
    mockUpdatePrefs.mockResolvedValue({ ...defaultPrefs, twoFactorEnabled: true } as any);
    const { req, res } = makeReqRes({ body: { code: "123456" } });
    await getHandler("post", "/settings/two-factor/verify")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).enabled).toBe(true);
  });

  it("POST /settings/two-factor/verify — returns 400 when code is wrong", async () => {
    mockGetPrefs.mockResolvedValue({ ...defaultPrefs, twoFactorPendingCode: "999999" } as any);
    const { req, res } = makeReqRes({ body: { code: "123456" } });
    await getHandler("post", "/settings/two-factor/verify")(req, res);
    expect(res._status).toBe(400);
  });

  it("POST /settings/two-factor/disable — returns disabled:true", async () => {
    mockUpdatePrefs.mockResolvedValue({ ...defaultPrefs, twoFactorEnabled: false } as any);
    const { req, res } = makeReqRes();
    await getHandler("post", "/settings/two-factor/disable")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).disabled).toBe(true);
    expect(mockUpdatePrefs).toHaveBeenCalledWith(1, { twoFactorEnabled: false, twoFactorMethod: null, twoFactorPendingCode: null });
  });
});

describe("Settings persist correctly (integration)", () => {
  it("settings are returned with correct shape after update", async () => {
    const updatedPrefs = { ...defaultPrefs, notificationsEmail: false, emailDigest: "weekly", showInDirectory: false };
    mockUpdatePrefs.mockResolvedValue(updatedPrefs as any);
    const { req, res } = makeReqRes({ body: { notificationsEmail: false, emailDigest: "weekly", showInDirectory: false } });
    await getHandler("put", "/settings/preferences")(req, res);
    const p = (res._body as any).preferences;
    expect(p.notificationsEmail).toBe(false);
    expect(p.emailDigest).toBe("weekly");
    expect(p.showInDirectory).toBe(false);
    // Unchanged fields should still be present
    expect(p).toHaveProperty("notificationsPush");
    expect(p).toHaveProperty("twoFactorEnabled");
  });
});

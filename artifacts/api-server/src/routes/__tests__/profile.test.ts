import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db/profile-queries", () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

vi.mock("@workspace/db", () => ({
  db: { select: vi.fn().mockReturnThis(), from: vi.fn().mockReturnThis(), where: vi.fn().mockResolvedValue([]) },
  usersTable: {},
}));

import * as profileQueries from "@workspace/db/profile-queries";

const mockGetProfile  = vi.mocked(profileQueries.getUserProfile);
const mockUpdateProfile = vi.mocked(profileQueries.updateUserProfile);

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

import router from "../profile.js";

type Handler = (req: any, res: any) => Promise<void>;

function getHandler(method: string, path: string): Handler {
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route ${method} ${path} not found`);
  return layer.route.stack[0].handle as Handler;
}

const fakeUser = {
  id: 1, username: "admin", fullName: "أحمد محمد", email: "admin@test.com",
  role: "admin", department: "IT", avatar: null,
  bio: "مطوّر برمجيات", phone: "+966500000000",
  timezone: "UTC", theme: "auto", language: "ar",
  createdAt: new Date("2025-01-01"),
};

describe("GET /profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns full profile for authenticated user", async () => {
    mockGetProfile.mockResolvedValue(fakeUser as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/profile")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).user.fullName).toBe("أحمد محمد");
    expect((res._body as any).user.bio).toBe("مطوّر برمجيات");
    expect((res._body as any).user.timezone).toBe("UTC");
  });

  it("returns all expected fields", async () => {
    mockGetProfile.mockResolvedValue(fakeUser as any);
    const { req, res } = makeReqRes();
    await getHandler("get", "/profile")(req, res);
    const u = (res._body as any).user;
    for (const field of ["id","username","fullName","email","role","bio","phone","timezone","theme","language","createdAt"]) {
      expect(u).toHaveProperty(field);
    }
  });
});

describe("PUT /profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates single field and returns updated profile", async () => {
    const updated = { ...fakeUser, bio: "قائد فريق" };
    mockUpdateProfile.mockResolvedValue(updated as any);
    const { req, res } = makeReqRes({ body: { bio: "قائد فريق" } });
    await getHandler("put", "/profile")(req, res);
    expect(res._status).toBe(200);
    expect((res._body as any).user.bio).toBe("قائد فريق");
    expect(mockUpdateProfile).toHaveBeenCalledWith(1, { bio: "قائد فريق" });
  });

  it("updates multiple fields at once", async () => {
    const updated = { ...fakeUser, fullName: "محمد سالم", phone: "+966511111111" };
    mockUpdateProfile.mockResolvedValue(updated as any);
    const { req, res } = makeReqRes({ body: { fullName: "محمد سالم", phone: "+966511111111" } });
    await getHandler("put", "/profile")(req, res);
    expect(mockUpdateProfile).toHaveBeenCalledWith(1, { fullName: "محمد سالم", phone: "+966511111111" });
  });

  it("returns 400 for invalid avatar URL", async () => {
    const { req, res } = makeReqRes({ body: { avatar: "not-a-url" } });
    await getHandler("put", "/profile")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 400 for invalid theme", async () => {
    const { req, res } = makeReqRes({ body: { theme: "purple" } });
    await getHandler("put", "/profile")(req, res);
    expect(res._status).toBe(400);
  });
});

describe("GET /profile/:userId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns public profile fields only", async () => {
    mockGetProfile.mockResolvedValue(fakeUser as any);
    const { req, res } = makeReqRes({ params: { userId: "1" } });
    await getHandler("get", "/profile/:userId")(req, res);
    expect(res._status).toBe(200);
    const u = (res._body as any).user;
    expect(u.fullName).toBe("أحمد محمد");
    expect(u.bio).toBe("مطوّر برمجيات");
    // Private fields should not be present
    expect(u.email).toBeUndefined();
    expect(u.phone).toBeUndefined();
  });

  it("returns 400 for invalid userId", async () => {
    const { req, res } = makeReqRes({ params: { userId: "abc" } });
    await getHandler("get", "/profile/:userId")(req, res);
    expect(res._status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockGetProfile.mockResolvedValue(null as any);
    const { req, res } = makeReqRes({ params: { userId: "999" } });
    await getHandler("get", "/profile/:userId")(req, res);
    expect(res._status).toBe(404);
  });
});

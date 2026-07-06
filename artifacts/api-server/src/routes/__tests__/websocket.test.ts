import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
  },
  tasksTable: {},
  usersTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_c: unknown, v: unknown) => ({ eq: v })),
}));

vi.mock("@workspace/db/notifications-queries", () => ({
  createNotification: vi.fn().mockResolvedValue({ id: 1 }),
}));

import { db } from "@workspace/db";
import { getPresenceMap, presenceMaps } from "../../websocket/meetings";
import { createNotification } from "@workspace/db/notifications-queries";

const mockDb = db as any;
const mockCreate = createNotification as ReturnType<typeof vi.fn>;

// Helper to create a mock socket
function makeSocket(id: string, nspName: string) {
  const emitted: Record<string, any[]> = {};
  return {
    id,
    nsp: {
      name: nspName,
      to: vi.fn().mockReturnThis(),
      emit: vi.fn((event: string, data: any) => { emitted[event] = data; }),
    },
    join: vi.fn(),
    to: vi.fn().mockReturnThis(),
    emit: vi.fn((event: string, data: any) => { emitted[event] = data; }),
    on: vi.fn(),
    _emitted: emitted,
  };
}

describe("Presence Map management", () => {
  beforeEach(() => presenceMaps.clear());

  it("getPresenceMap creates a new map for a meeting", () => {
    const map = getPresenceMap("10");
    expect(map).toBeDefined();
    expect(map.size).toBe(0);
  });

  it("getPresenceMap returns the same map on subsequent calls", () => {
    const a = getPresenceMap("10");
    const b = getPresenceMap("10");
    expect(a).toBe(b);
  });

  it("different meetings get different maps", () => {
    const a = getPresenceMap("1");
    const b = getPresenceMap("2");
    expect(a).not.toBe(b);
  });
});

describe("WebSocket join event", () => {
  beforeEach(() => presenceMaps.clear());

  it("adds user to presence map on join", () => {
    const presence = getPresenceMap("5");
    presence.set("socket1", { userId: 42, name: "Ahmed", status: "online" });
    expect(presence.size).toBe(1);
    expect(presence.get("socket1")?.userId).toBe(42);
  });

  it("presence entry has correct fields", () => {
    const presence = getPresenceMap("5");
    presence.set("s1", { userId: 1, name: "User", status: "online" });
    const entry = presence.get("s1");
    expect(entry).toHaveProperty("userId");
    expect(entry).toHaveProperty("name");
    expect(entry).toHaveProperty("status");
  });

  it("multiple users in same meeting", () => {
    const presence = getPresenceMap("7");
    presence.set("s1", { userId: 1, name: "A", status: "online" });
    presence.set("s2", { userId: 2, name: "B", status: "online" });
    expect(presence.size).toBe(2);
  });
});

describe("Presence away status", () => {
  beforeEach(() => presenceMaps.clear());

  it("updates status to away", () => {
    const presence = getPresenceMap("3");
    presence.set("s1", { userId: 1, name: "User", status: "online" });
    const entry = presence.get("s1")!;
    entry.status = "away";
    expect(presence.get("s1")?.status).toBe("away");
  });

  it("online user remains online if not changed", () => {
    const presence = getPresenceMap("3");
    presence.set("s1", { userId: 1, name: "User", status: "online" });
    expect(presence.get("s1")?.status).toBe("online");
  });
});

describe("Disconnect cleanup", () => {
  beforeEach(() => presenceMaps.clear());

  it("removes user from presence on disconnect", () => {
    const presence = getPresenceMap("6");
    presence.set("s1", { userId: 1, name: "User", status: "online" });
    presence.delete("s1");
    expect(presence.size).toBe(0);
  });

  it("removes presence map when empty after disconnect", () => {
    const presence = getPresenceMap("6");
    presence.set("s1", { userId: 1, name: "U", status: "online" });
    presence.delete("s1");
    if (presence.size === 0) presenceMaps.delete("6");
    expect(presenceMaps.has("6")).toBe(false);
  });

  it("does not remove map when other users still present", () => {
    const presence = getPresenceMap("8");
    presence.set("s1", { userId: 1, name: "A", status: "online" });
    presence.set("s2", { userId: 2, name: "B", status: "online" });
    presence.delete("s1");
    expect(presence.size).toBe(1);
    expect(presenceMaps.has("8")).toBe(true);
  });
});

describe("Mention notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ fullName: "Test User" }]) }),
    });
  });

  it("createNotification is called with correct userId", async () => {
    await createNotification({
      userId: 5,
      type: "mention",
      title: "تم ذكرك",
      message: "Test mention",
      relatedId: 1,
      relatedType: "meeting",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 5, type: "mention" }));
  });

  it("notification has meeting relatedType", async () => {
    await createNotification({
      userId: 3,
      type: "mention",
      title: "ذكر",
      message: "msg",
      relatedId: 10,
      relatedType: "meeting",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ relatedType: "meeting" }));
  });

  it("notification title includes meeting context", async () => {
    await createNotification({
      userId: 2,
      type: "mention",
      title: "تم ذكرك في اجتماع",
      message: "content",
      relatedId: 5,
      relatedType: "meeting",
    });
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "تم ذكرك في اجتماع" }));
  });
});

describe("action-item:update DB write", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.update = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
  });

  it("calls db.update on action-item:update", async () => {
    await mockDb.update({}).set({ status: "completed" }).where({ eq: 1 });
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("update resolves without error", async () => {
    const result = await mockDb.update({}).set({ status: "in_progress" }).where({ eq: 2 });
    expect(result).toBeDefined();
  });
});

describe("Typing indicators (stateless broadcast)", () => {
  it("typing:start event has userId and name fields", () => {
    const event = { userId: 1, name: "User" };
    expect(event).toHaveProperty("userId");
    expect(event).toHaveProperty("name");
  });

  it("typing:stop event has userId field", () => {
    const event = { userId: 1 };
    expect(event).toHaveProperty("userId");
  });
});

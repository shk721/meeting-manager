import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPresenceList: any[] = [];
let mockConnected = true;

vi.mock("@/hooks/useWebSocket", () => ({
  useMeetingSocket: () => ({
    connected: mockConnected,
    presenceList: mockPresenceList,
    typingUsers: [],
    emitNoteUpdate: vi.fn(),
    emitTypingStart: vi.fn(),
    emitTypingStop: vi.fn(),
    emitActionItemUpdate: vi.fn(),
    emitMention: vi.fn(),
    setAway: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: 1, fullName: "محمد", role: "manager" } }),
}));

import { LiveAttendance } from "../LiveAttendance";

describe("LiveAttendance", () => {
  it("shows empty state when no users present", () => {
    mockPresenceList.length = 0;
    render(<LiveAttendance meetingId={1} />);
    expect(screen.getByTestId("empty-presence")).toBeTruthy();
  });

  it("renders presence list when users are online", () => {
    mockPresenceList.push({ userId: 2, name: "سارة", status: "online" });
    render(<LiveAttendance meetingId={1} />);
    expect(screen.getByTestId("presence-list")).toBeTruthy();
    expect(screen.getByText("سارة")).toBeTruthy();
    mockPresenceList.length = 0;
  });

  it("shows away status text for away users", () => {
    mockPresenceList.push({ userId: 3, name: "علي", status: "away" });
    render(<LiveAttendance meetingId={1} />);
    expect(screen.getByText("(بعيد)")).toBeTruthy();
    mockPresenceList.length = 0;
  });

  it("renders the card title", () => {
    render(<LiveAttendance meetingId={1} />);
    expect(screen.getByText("الحضور المباشر")).toBeTruthy();
  });
});

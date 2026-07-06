import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockEmitNoteUpdate = vi.fn();
const mockEmitTypingStart = vi.fn();
const mockEmitTypingStop = vi.fn();

vi.mock("@/hooks/useWebSocket", () => ({
  useMeetingSocket: () => ({
    connected: true,
    presenceList: [{ userId: 2, name: "أحمد", status: "online" }],
    typingUsers: [],
    emitNoteUpdate: mockEmitNoteUpdate,
    emitTypingStart: mockEmitTypingStart,
    emitTypingStop: mockEmitTypingStop,
    emitActionItemUpdate: vi.fn(),
    emitMention: vi.fn(),
    setAway: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: 1, fullName: "محمد", role: "manager" } }),
}));

vi.mock("@/components/PresenceIndicator", () => ({
  PresenceIndicator: ({ presenceList }: any) => (
    <div data-testid="presence-indicator">{presenceList.length} حاضر</div>
  ),
}));

import { CollaborativeNotes } from "../CollaborativeNotes";

describe("CollaborativeNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("renders the card title", () => {
    render(<CollaborativeNotes meetingId={1} />);
    expect(screen.getByText("ملاحظات تعاونية")).toBeTruthy();
  });

  it("shows connected badge when socket is connected", () => {
    render(<CollaborativeNotes meetingId={1} />);
    expect(screen.getByText("مباشر")).toBeTruthy();
  });

  it("renders the textarea", () => {
    render(<CollaborativeNotes meetingId={1} />);
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("calls emitTypingStart on first keystroke", () => {
    render(<CollaborativeNotes meetingId={1} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "ن" } });
    expect(mockEmitTypingStart).toHaveBeenCalledTimes(1);
  });

  it("calls emitNoteUpdate after debounce", () => {
    render(<CollaborativeNotes meetingId={1} />);
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "ملاحظة جديدة" } });
    vi.runAllTimers();
    expect(mockEmitNoteUpdate).toHaveBeenCalledWith("ملاحظة جديدة");
  });
});

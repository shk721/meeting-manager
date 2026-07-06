import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

import { EffectivenessScoreboard } from "../EffectivenessScoreboard";

const fakeData = {
  meetings: [
    { meetingId: 1, title: "اجتماع 1", date: "2026-07-01", score: 100, breakdown: { hasAgenda: true, hasMinutes: true, hasDecisions: true, hasTasks: true } },
    { meetingId: 2, title: "اجتماع 2", date: "2026-07-02", score: 50, breakdown: { hasAgenda: true, hasMinutes: false, hasDecisions: true, hasTasks: false } },
  ],
  averageScore: 75,
};

describe("EffectivenessScoreboard", () => {
  it("shows loading skeleton", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<EffectivenessScoreboard />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders average score", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<EffectivenessScoreboard />);
    expect(screen.getByTestId("avg-score").textContent).toBe("75");
  });

  it("renders scoreboard card", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<EffectivenessScoreboard />);
    expect(screen.getByTestId("effectiveness-scoreboard")).toBeTruthy();
  });

  it("shows top meetings", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<EffectivenessScoreboard />);
    expect(screen.getByText("اجتماع 1")).toBeTruthy();
  });

  it("shows breakdown factors for top meeting", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<EffectivenessScoreboard />);
    expect(screen.getByText("جدول أعمال")).toBeTruthy();
  });
});

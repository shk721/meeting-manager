import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

import { TeamHealthIndicator } from "../TeamHealthIndicator";

describe("TeamHealthIndicator", () => {
  it("shows loading skeleton when isLoading", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<TeamHealthIndicator />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders score value", () => {
    mockUseQuery.mockReturnValue({ data: { score: 75, completionRate: 80, engagementScore: 70, overdueCount: 2, totalTasks: 10, completedTasks: 8 }, isLoading: false });
    render(<TeamHealthIndicator />);
    expect(screen.getByTestId("health-score").textContent).toBe("75");
  });

  it("shows green style for score >= 70", () => {
    mockUseQuery.mockReturnValue({ data: { score: 80, completionRate: 80, engagementScore: 80, overdueCount: 0, totalTasks: 5, completedTasks: 4 }, isLoading: false });
    render(<TeamHealthIndicator />);
    const score = screen.getByTestId("health-score");
    expect(score.className).toContain("emerald");
  });

  it("shows card", () => {
    mockUseQuery.mockReturnValue({ data: { score: 40, completionRate: 40, engagementScore: 40, overdueCount: 3, totalTasks: 10, completedTasks: 4 }, isLoading: false });
    render(<TeamHealthIndicator />);
    expect(screen.getByTestId("team-health-card")).toBeTruthy();
  });
});

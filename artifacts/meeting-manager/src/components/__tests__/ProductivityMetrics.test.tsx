import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <>{children}</>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: 1, fullName: "Test User", role: "manager" } }),
}));

import { ProductivityMetrics } from "../ProductivityMetrics";

const fakeData = { userId: 1, meetingsAttended: 5, meetingsOrganized: 2, actionItemsOwned: 10, actionItemsCompleted: 7, productivityScore: 72 };

describe("ProductivityMetrics", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
  });

  it("renders the card", () => {
    render(<ProductivityMetrics />);
    expect(screen.getByTestId("productivity-metrics")).toBeTruthy();
  });

  it("shows productivity score", () => {
    render(<ProductivityMetrics />);
    expect(screen.getByTestId("productivity-score").textContent).toBe("72");
  });

  it("renders bar chart", () => {
    render(<ProductivityMetrics />);
    expect(screen.getByTestId("bar-chart")).toBeTruthy();
  });

  it("period selector switches period", () => {
    render(<ProductivityMetrics />);
    fireEvent.click(screen.getByText("شهر"));
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(["analytics-productivity", 1, "month"]),
    }));
  });
});

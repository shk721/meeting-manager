import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <>{children}</>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

import { TrendAnalysis } from "../TrendAnalysis";

const fakeData = { metric: "frequency", weeks: 4, data: [{ week: "2026-06-30", value: 3 }] };

describe("TrendAnalysis", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
  });

  it("renders the card", () => {
    render(<TrendAnalysis />);
    expect(screen.getByTestId("trend-analysis")).toBeTruthy();
  });

  it("renders line chart when data available", () => {
    render(<TrendAnalysis />);
    expect(screen.getByTestId("line-chart")).toBeTruthy();
  });

  it("shows metric selector buttons", () => {
    render(<TrendAnalysis />);
    expect(screen.getByText("عدد الاجتماعات")).toBeTruthy();
    expect(screen.getByText("الحضور")).toBeTruthy();
  });

  it("changes query when metric selector clicked", () => {
    render(<TrendAnalysis />);
    fireEvent.click(screen.getByText("الحضور"));
    expect(mockUseQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: expect.arrayContaining(["analytics-trends", "attendance"]),
    }));
  });
});

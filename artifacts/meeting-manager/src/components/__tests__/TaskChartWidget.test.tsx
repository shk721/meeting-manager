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
  Legend: () => null,
}));

const mockUseTaskStats = vi.fn();
vi.mock("@/hooks/useDashboard", () => ({
  useTaskStats: (...args: any[]) => mockUseTaskStats(...args),
}));

import { TaskChartWidget } from "../TaskChartWidget";

const fakeData = [
  { date: "2026-06-30", count: 10, completed: 7, pending: 3, overdue: 1, high: 2 },
  { date: "2026-07-05", count: 8, completed: 5, pending: 3, overdue: 2, high: 3 },
];

describe("TaskChartWidget", () => {
  beforeEach(() => {
    mockUseTaskStats.mockReturnValue({ data: fakeData, isLoading: false });
  });

  it("renders the card title", () => {
    render(<TaskChartWidget />);
    expect(screen.getByText("المهام عبر الزمن")).toBeTruthy();
  });

  it("renders bar chart when data is available", () => {
    render(<TaskChartWidget />);
    expect(screen.getByTestId("bar-chart")).toBeTruthy();
  });

  it("shows 3 period pill buttons", () => {
    render(<TaskChartWidget />);
    expect(screen.getByText("يومي")).toBeTruthy();
    expect(screen.getByText("أسبوعي")).toBeTruthy();
    expect(screen.getByText("شهري")).toBeTruthy();
  });

  it("defaults period to week", () => {
    render(<TaskChartWidget />);
    expect(mockUseTaskStats).toHaveBeenCalledWith("week");
  });

  it("changes period when pill button clicked", () => {
    render(<TaskChartWidget />);
    fireEvent.click(screen.getByText("يومي"));
    expect(mockUseTaskStats).toHaveBeenCalledWith("day");
  });
});

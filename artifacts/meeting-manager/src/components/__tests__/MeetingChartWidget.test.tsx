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

const mockUseMeetingStats = vi.fn();
vi.mock("@/hooks/useDashboard", () => ({
  useMeetingStats: (...args: any[]) => mockUseMeetingStats(...args),
}));

import { MeetingChartWidget } from "../MeetingChartWidget";

const fakeData = [
  { date: "2026-06-30", count: 3, completed: 2, cancelled: 0, inProgress: 1 },
  { date: "2026-07-05", count: 5, completed: 3, cancelled: 1, inProgress: 1 },
];

describe("MeetingChartWidget", () => {
  beforeEach(() => {
    mockUseMeetingStats.mockReturnValue({ data: fakeData, isLoading: false });
  });

  it("renders the card title", () => {
    render(<MeetingChartWidget />);
    expect(screen.getByText("الاجتماعات عبر الزمن")).toBeTruthy();
  });

  it("renders bar chart when data is available", () => {
    render(<MeetingChartWidget />);
    expect(screen.getByTestId("bar-chart")).toBeTruthy();
  });

  it("shows 3 period pill buttons", () => {
    render(<MeetingChartWidget />);
    expect(screen.getByText("يومي")).toBeTruthy();
    expect(screen.getByText("أسبوعي")).toBeTruthy();
    expect(screen.getByText("شهري")).toBeTruthy();
  });

  it("defaults period to week", () => {
    render(<MeetingChartWidget />);
    expect(mockUseMeetingStats).toHaveBeenCalledWith("week");
  });

  it("changes period when pill button clicked", () => {
    render(<MeetingChartWidget />);
    fireEvent.click(screen.getByText("شهري"));
    expect(mockUseMeetingStats).toHaveBeenCalledWith("month");
  });
});

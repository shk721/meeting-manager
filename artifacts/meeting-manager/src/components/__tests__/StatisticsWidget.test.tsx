import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatisticsWidget } from "../StatisticsWidget";

const fakeStats = {
  totalMeetings: 20,
  upcomingMeetings: 5,
  pendingMinutes: 3,
  openTasks: 12,
  overdueTasks: 4,
  completionRate: 65,
};

describe("StatisticsWidget", () => {
  it("renders all KPI cards", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("مهام مفتوحة")).toBeTruthy();
    expect(screen.getByText("مهام متأخرة")).toBeTruthy();
    expect(screen.getByText("محاضر معلّقة")).toBeTruthy();
    expect(screen.getByText("نسبة الإنجاز")).toBeTruthy();
  });

  it("shows openTasks value", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("shows overdueTasks value", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("shows overdueTasks value", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("shows completionRate with percent sign", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("65%")).toBeTruthy();
  });
});

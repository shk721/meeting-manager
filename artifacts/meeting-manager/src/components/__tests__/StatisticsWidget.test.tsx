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
  it("renders all 5 KPI cards", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("إجمالي الاجتماعات")).toBeTruthy();
    expect(screen.getByText("محاضر بانتظار الاعتماد")).toBeTruthy();
    expect(screen.getByText("مهام مفتوحة")).toBeTruthy();
    expect(screen.getByText("مهام متأخرة")).toBeTruthy();
    expect(screen.getByText("نسبة الإنجاز")).toBeTruthy();
  });

  it("shows totalMeetings value", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("20")).toBeTruthy();
  });

  it("shows upcomingMeetings in subtitle", () => {
    render(<StatisticsWidget stats={fakeStats} />);
    expect(screen.getByText("5 اجتماعات قادمة")).toBeTruthy();
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

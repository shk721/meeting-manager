import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useDashboard", () => ({
  useInsights: vi.fn(() => ({
    data: {
      busiestDay: "الاثنين",
      completionRate: 72,
      avgAttendeesPerMeeting: 4,
      mostActiveAttendee: "أحمد محمد",
      overdueTaskCount: 3,
      totalMeetings: 15,
      totalTasks: 42,
    },
    isLoading: false,
  })),
}));

import { InsightsWidget } from "../InsightsWidget";

describe("InsightsWidget", () => {
  it("renders section title", () => {
    render(<InsightsWidget />);
    expect(screen.getByText("إحصائيات ونظرة عامة")).toBeTruthy();
  });

  it("shows busiest day", () => {
    render(<InsightsWidget />);
    expect(screen.getByText("الاثنين")).toBeTruthy();
  });

  it("shows completion rate", () => {
    render(<InsightsWidget />);
    expect(screen.getByText("72%")).toBeTruthy();
  });

  it("shows most active attendee", () => {
    render(<InsightsWidget />);
    expect(screen.getByText("أحمد محمد")).toBeTruthy();
  });

  it("shows total tasks count", () => {
    render(<InsightsWidget />);
    expect(screen.getByText("42")).toBeTruthy();
  });
});

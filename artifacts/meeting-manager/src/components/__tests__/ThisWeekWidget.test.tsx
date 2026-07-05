import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/hooks/useDashboard", () => ({
  useThisWeek: vi.fn(() => ({
    data: {
      meetings: [
        { id: 1, title: "اجتماع أسبوعي", date: "2026-07-07", time: "10:00", status: "scheduled" },
        { id: 2, title: "مراجعة المشروع", date: "2026-07-08", time: "14:00", status: "completed" },
      ],
      tasks: [
        { id: 1, title: "مراجعة التقرير", status: "open", priority: "high", dueDate: "2026-07-10" },
      ],
      upcoming: [
        { id: 3, title: "اجتماع الإدارة", date: "2026-07-09", time: "09:00" },
      ],
    },
    isLoading: false,
  })),
}));

vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import { ThisWeekWidget } from "../ThisWeekWidget";

describe("ThisWeekWidget", () => {
  it("renders the card title", () => {
    render(<ThisWeekWidget />);
    expect(screen.getByText("هذا الأسبوع")).toBeTruthy();
  });

  it("shows meetings tab by default with meeting titles", () => {
    render(<ThisWeekWidget />);
    expect(screen.getByText("اجتماع أسبوعي")).toBeTruthy();
    expect(screen.getByText("مراجعة المشروع")).toBeTruthy();
  });

  it("shows both tab buttons", () => {
    render(<ThisWeekWidget />);
    expect(screen.getByText("الاجتماعات")).toBeTruthy();
    expect(screen.getByText("المهام")).toBeTruthy();
  });

  it("switches to tasks tab on click and shows task titles", () => {
    render(<ThisWeekWidget />);
    fireEvent.click(screen.getByText("المهام"));
    expect(screen.getByText("مراجعة التقرير")).toBeTruthy();
  });

  it("shows upcoming meetings section when on meetings tab", () => {
    render(<ThisWeekWidget />);
    expect(screen.getByText("القادمة")).toBeTruthy();
    expect(screen.getByText("اجتماع الإدارة")).toBeTruthy();
  });
});

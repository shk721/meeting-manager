import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [
        { id: 1, title: "اجتماع مجدول", start: "2025-07-10T09:00:00", end: "2025-07-10T10:00:00", status: "scheduled", attendeeCount: 3, isRecurring: false, parentMeetingId: null },
        { id: 2, title: "اجتماع مكتمل", start: "2025-07-15T14:00:00", end: "2025-07-15T15:00:00", status: "completed", attendeeCount: 5, isRecurring: false, parentMeetingId: null },
      ],
      isLoading: false,
    }),
  };
});

vi.mock("wouter", () => ({
  Link: ({ href, children }: any) => <a href={href}>{children}</a>,
}));

import CalendarPage from "../../pages/calendar";

function wrapper({ children }: any) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("CalendarPage", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders page title", () => {
    render(<CalendarPage />, { wrapper });
    expect(screen.getByText("التقويم")).toBeTruthy();
  });

  it("renders month and list view toggle buttons", () => {
    render(<CalendarPage />, { wrapper });
    expect(screen.getByText("شهري")).toBeTruthy();
    expect(screen.getByText("قائمة")).toBeTruthy();
  });

  it("switches to list view and shows events", () => {
    render(<CalendarPage />, { wrapper });
    const listBtn = screen.getByText("قائمة");
    fireEvent.click(listBtn);
    expect(screen.getByText("اجتماع مجدول")).toBeTruthy();
  });

  it("shows day panel prompt when no day selected", () => {
    render(<CalendarPage />, { wrapper });
    expect(screen.getByText("اختر يوماً")).toBeTruthy();
  });

  it("shows status labels in list view", () => {
    render(<CalendarPage />, { wrapper });
    fireEvent.click(screen.getByText("قائمة"));
    expect(screen.getByText("مجدول")).toBeTruthy();
  });

  it("shows subtitle text", () => {
    render(<CalendarPage />, { wrapper });
    expect(screen.getByText("عرض الاجتماعات على التقويم الشهري")).toBeTruthy();
  });
});

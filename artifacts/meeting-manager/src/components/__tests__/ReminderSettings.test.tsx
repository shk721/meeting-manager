import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUseQueryClient = vi.fn();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (...args: any[]) => mockUseQuery(...args),
    useMutation: (...args: any[]) => mockUseMutation(...args),
    useQueryClient: () => mockUseQueryClient(),
  };
});

import { ReminderSettings } from "../ReminderSettings";

function wrapper({ children }: any) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ReminderSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: [{ id: 1, meetingId: 5, userId: 1, minutesBefore: 30, isSent: false, createdAt: "2025-07-01" }],
      isLoading: false,
    });
    mockUseMutation.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false, error: null });
    mockUseQueryClient.mockReturnValue({ invalidateQueries: vi.fn() });
  });

  it("renders reminder section header", () => {
    render(<ReminderSettings meetingId={5} />, { wrapper });
    expect(screen.getByText("التذكيرات")).toBeTruthy();
  });

  it("shows existing reminder label", () => {
    render(<ReminderSettings meetingId={5} />, { wrapper });
    const matches = screen.getAllByText("قبل 30 دقيقة");
    expect(matches.length).toBeGreaterThan(0);
  });

  it("shows add reminder pill buttons for other intervals", () => {
    render(<ReminderSettings meetingId={5} />, { wrapper });
    expect(screen.getByText("قبل 15 دقيقة")).toBeTruthy();
    expect(screen.getByText("قبل ساعة")).toBeTruthy();
    expect(screen.getByText("قبل يوم")).toBeTruthy();
  });

  it("renders without error when no reminders exist", () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    render(<ReminderSettings meetingId={10} />, { wrapper });
    expect(screen.getByText("التذكيرات")).toBeTruthy();
  });
});

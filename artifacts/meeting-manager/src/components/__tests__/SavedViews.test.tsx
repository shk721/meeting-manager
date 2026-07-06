import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock useViews hook
vi.mock("@/hooks/useViews", () => ({
  useViews: vi.fn(() => ({
    views: [
      { id: 1, userId: 1, type: "meetings", name: "مجدول فقط", filters: { status: "scheduled" }, createdAt: "" },
      { id: 2, userId: 1, type: "tasks",    name: "مهام عالية", filters: { priority: "high" },   createdAt: "" },
    ],
    create: { mutateAsync: vi.fn().mockResolvedValue({}) },
    remove: { mutate: vi.fn() },
  })),
}));

// Mock shadcn Popover to render inline
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div data-testid="popover-content">{children}</div>,
}));

import SavedViews from "../SavedViews";

const defaultProps = {
  type: "meetings" as const,
  currentFilters: { status: "scheduled" },
  onLoadView: vi.fn(),
};

describe("SavedViews", () => {
  it("renders trigger button", () => {
    render(<SavedViews {...defaultProps} />);
    // text appears in both trigger and popover header; at least one must exist
    expect(screen.getAllByText("العروض المحفوظة").length).toBeGreaterThan(0);
  });

  it("shows views of matching type only", () => {
    render(<SavedViews {...defaultProps} />);
    // type=meetings → only "مجدول فقط" should show, not "مهام عالية"
    expect(screen.getByText("مجدول فقط")).toBeTruthy();
    expect(screen.queryByText("مهام عالية")).toBeNull();
  });

  it("calls onLoadView when a saved view is clicked", () => {
    const onLoadView = vi.fn();
    render(<SavedViews {...defaultProps} onLoadView={onLoadView} />);
    fireEvent.click(screen.getByText("مجدول فقط"));
    expect(onLoadView).toHaveBeenCalledWith({ status: "scheduled" });
  });

  it("renders save input and button", () => {
    render(<SavedViews {...defaultProps} />);
    expect(screen.getByPlaceholderText("اسم العرض")).toBeTruthy();
    expect(screen.getByText("حفظ")).toBeTruthy();
  });

  it("calls create.mutateAsync when save button is clicked with a name", async () => {
    const { useViews } = await import("@/hooks/useViews");
    const mockCreate = vi.fn().mockResolvedValue({});
    (useViews as any).mockReturnValue({
      views: [],
      create: { mutateAsync: mockCreate },
      remove: { mutate: vi.fn() },
    });

    render(<SavedViews {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText("اسم العرض"), { target: { value: "عرض جديد" } });
    fireEvent.click(screen.getByText("حفظ"));
    await vi.waitFor(() => expect(mockCreate).toHaveBeenCalledWith({
      name: "عرض جديد",
      type: "meetings",
      filters: { status: "scheduled" },
    }));
  });
});

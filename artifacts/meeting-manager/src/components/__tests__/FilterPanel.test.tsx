import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock shadcn Select to avoid Radix UI jsdom issues with empty-string values
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value ?? ""} onChange={e => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import FilterPanel from "../FilterPanel";
import type { FilterCriteria } from "@/hooks/useFilters";

const defaultProps = {
  type: "meetings" as const,
  criteria: {} as FilterCriteria,
  onCriteriaChange: vi.fn(),
  onApply: vi.fn(),
  onClear: vi.fn(),
  appliedCount: 0,
  users: [{ id: 1, fullName: "أحمد محمد" }],
};

describe("FilterPanel", () => {
  it("renders filter toggle button", () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText("تصفية")).toBeTruthy();
  });

  it("shows applied count badge when appliedCount > 0", () => {
    render(<FilterPanel {...defaultProps} appliedCount={2} />);
    expect(screen.getByText("2")).toBeTruthy();
  });

  it("opens filter panel on button click", () => {
    render(<FilterPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("تصفية"));
    expect(screen.getByText("خيارات التصفية")).toBeTruthy();
  });

  it("calls onApply when تطبيق button is clicked", () => {
    const onApply = vi.fn();
    render(<FilterPanel {...defaultProps} onApply={onApply} />);
    fireEvent.click(screen.getByText("تصفية"));
    fireEvent.click(screen.getByText("تطبيق"));
    expect(onApply).toHaveBeenCalled();
  });

  it("calls onClear when مسح button is clicked", () => {
    const onClear = vi.fn();
    render(<FilterPanel {...defaultProps} onClear={onClear} />);
    fireEvent.click(screen.getByText("تصفية"));
    fireEvent.click(screen.getByText("مسح"));
    expect(onClear).toHaveBeenCalled();
  });

  it("shows task-specific filters when type=tasks", () => {
    render(<FilterPanel {...defaultProps} type="tasks" />);
    fireEvent.click(screen.getByText("تصفية"));
    expect(screen.getByText("الأولوية")).toBeTruthy();
  });
});

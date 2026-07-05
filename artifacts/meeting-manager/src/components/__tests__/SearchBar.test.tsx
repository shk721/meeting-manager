import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchBar from "../SearchBar";

describe("SearchBar", () => {
  it("renders with placeholder text", () => {
    render(<SearchBar query="" onQueryChange={vi.fn()} onClear={vi.fn()} placeholder="بحث في الاجتماعات…" />);
    expect(screen.getByPlaceholderText("بحث في الاجتماعات…")).toBeTruthy();
  });

  it("calls onQueryChange when typing", () => {
    const onQueryChange = vi.fn();
    render(<SearchBar query="" onQueryChange={onQueryChange} onClear={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "اجتماع" } });
    expect(onQueryChange).toHaveBeenCalledWith("اجتماع");
  });

  it("shows clear button when query is non-empty", () => {
    render(<SearchBar query="test" onQueryChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText("مسح البحث")).toBeTruthy();
  });

  it("calls onClear when clear button is clicked", () => {
    const onClear = vi.fn();
    render(<SearchBar query="test" onQueryChange={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByLabelText("مسح البحث"));
    expect(onClear).toHaveBeenCalled();
  });

  it("shows result count when query >= 2 chars and total provided", () => {
    render(<SearchBar query="اجتماع" onQueryChange={vi.fn()} onClear={vi.fn()} total={7} />);
    expect(screen.getByText("7 نتيجة")).toBeTruthy();
  });

  it("shows loading state when isLoading is true", () => {
    render(<SearchBar query="abc" onQueryChange={vi.fn()} onClear={vi.fn()} isLoading />);
    expect(screen.getByText("جارٍ البحث…")).toBeTruthy();
  });
});

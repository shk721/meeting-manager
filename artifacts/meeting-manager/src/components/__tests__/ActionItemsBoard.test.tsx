import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

import { ActionItemsBoard } from "../ActionItemsBoard";

const fakeData = {
  open: 5,
  completed: 10,
  overdue: 2,
  total: 15,
  byOwner: [
    { userId: 1, open: 3, completed: 5, overdue: 1 },
    { userId: 2, open: 2, completed: 5, overdue: 1 },
  ],
};

describe("ActionItemsBoard", () => {
  it("shows loading skeleton", () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<ActionItemsBoard />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows open count", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<ActionItemsBoard />);
    expect(screen.getByTestId("open-count").textContent).toBe("5");
  });

  it("shows overdue count", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<ActionItemsBoard />);
    const overdueEl = screen.getByTestId("overdue-count");
    expect(overdueEl.textContent).toBe("2");
  });

  it("renders the card", () => {
    mockUseQuery.mockReturnValue({ data: fakeData, isLoading: false });
    render(<ActionItemsBoard />);
    expect(screen.getByTestId("action-items-board")).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ExportModal } from "../ExportModal";

describe("ExportModal", () => {
  it("renders the trigger button", () => {
    render(<ExportModal meetingId={1} />);
    expect(screen.getByText("تصدير")).toBeTruthy();
  });

  it("opens dialog on trigger click", () => {
    render(<ExportModal meetingId={1} />);
    fireEvent.click(screen.getByText("تصدير"));
    expect(screen.getByText("تصدير الاجتماع")).toBeTruthy();
  });

  it("shows format options after opening", () => {
    render(<ExportModal meetingId={1} />);
    fireEvent.click(screen.getByText("تصدير"));
    expect(screen.getByTestId("format-pdf")).toBeTruthy();
    expect(screen.getByTestId("format-ical")).toBeTruthy();
    expect(screen.getByTestId("format-csv")).toBeTruthy();
  });

  it("can change format selection", () => {
    render(<ExportModal meetingId={1} />);
    fireEvent.click(screen.getByText("تصدير"));
    const icalBtn = screen.getByTestId("format-ical");
    fireEvent.click(icalBtn);
    expect(icalBtn.className).toContain("bg-primary");
  });

  it("closes on cancel button", () => {
    render(<ExportModal meetingId={1} />);
    fireEvent.click(screen.getByText("تصدير"));
    expect(screen.getByText("تصدير الاجتماع")).toBeTruthy();
    fireEvent.click(screen.getByText("إلغاء"));
    expect(screen.queryByText("تصدير الاجتماع")).toBeNull();
  });
});

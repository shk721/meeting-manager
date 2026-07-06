import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { RecurringMeetingDialog } from "../RecurringMeetingDialog";

describe("RecurringMeetingDialog", () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(<RecurringMeetingDialog meetingId={1} open={true} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText("تعيين تكرار الاجتماع")).toBeTruthy();
  });

  it("does not render when closed", () => {
    render(<RecurringMeetingDialog meetingId={1} open={false} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByText("تعيين تكرار الاجتماع")).toBeNull();
  });

  it("shows frequency buttons: daily, weekly, monthly", () => {
    render(<RecurringMeetingDialog meetingId={1} open={true} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText("يومي")).toBeTruthy();
    expect(screen.getByText("أسبوعي")).toBeTruthy();
    expect(screen.getByText("شهري")).toBeTruthy();
  });

  it("shows weekday checkboxes when weekly is selected", () => {
    render(<RecurringMeetingDialog meetingId={1} open={true} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.getByText("إثنين")).toBeTruthy();
    expect(screen.getByText("أربعاء")).toBeTruthy();
  });

  it("hides weekday checkboxes when daily is selected", () => {
    render(<RecurringMeetingDialog meetingId={1} open={true} onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByText("يومي"));
    expect(screen.queryByText("إثنين")).toBeNull();
  });
});

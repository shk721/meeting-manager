import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock hooks
const mockUpdate = vi.fn();
vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(() => ({
    profile: {
      id: 1, username: "admin", fullName: "أحمد محمد", email: "admin@test.com",
      role: "admin", department: "IT", avatar: null,
      bio: "مطوّر برمجيات", phone: "+966500000000",
      timezone: "UTC", theme: "auto", language: "ar",
      createdAt: "2025-01-01T00:00:00.000Z",
    },
    isLoading: false,
    error: null,
    update: mockUpdate,
    isUpdating: false,
    updateError: null,
  })),
  usePublicProfile: vi.fn(() => ({ profile: null, isLoading: false })),
}));

// Mock wouter
vi.mock("wouter", () => ({
  Link: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ["/profile"],
}));

// Mock shadcn Select
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value ?? ""} onChange={e => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

import ProfilePage from "../profile";

describe("ProfilePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders profile name and bio", () => {
    render(<ProfilePage />);
    expect(screen.getAllByText("أحمد محمد").length).toBeGreaterThan(0);
    expect(screen.getAllByText("مطوّر برمجيات").length).toBeGreaterThan(0);
  });

  it("renders edit button and opens edit form on click", () => {
    render(<ProfilePage />);
    const editBtn = screen.getByText("تعديل");
    expect(editBtn).toBeTruthy();
    fireEvent.click(editBtn);
    expect(screen.getByText("تعديل الملف الشخصي")).toBeTruthy();
  });

  it("populates form with current profile data when editing", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("تعديل"));
    const nameInput = screen.getByLabelText("الاسم الكامل *") as HTMLInputElement;
    expect(nameInput.value).toBe("أحمد محمد");
  });

  it("shows validation error when fullName is empty", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("تعديل"));
    const nameInput = screen.getByLabelText("الاسم الكامل *");
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("حفظ التغييرات"));
    expect(screen.getByText("الاسم الكامل مطلوب")).toBeTruthy();
  });

  it("calls update with correct data on save", async () => {
    mockUpdate.mockResolvedValue({});
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("تعديل"));
    const bioInput = screen.getByLabelText("النبذة الشخصية") as HTMLTextAreaElement;
    fireEvent.change(bioInput, { target: { value: "مدير مشروع أول" } });
    fireEvent.click(screen.getByText("حفظ التغييرات"));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    const call = mockUpdate.mock.calls[0][0];
    expect(call.bio).toBe("مدير مشروع أول");
  });

  it("closes edit form when cancel is clicked", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("تعديل"));
    expect(screen.getByText("تعديل الملف الشخصي")).toBeTruthy();
    fireEvent.click(screen.getByText("إلغاء"));
    expect(screen.queryByText("تعديل الملف الشخصي")).toBeNull();
  });

  it("shows account info section", () => {
    render(<ProfilePage />);
    expect(screen.getByText("معلومات الحساب")).toBeTruthy();
    expect(screen.getByText("البريد الإلكتروني")).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUpdate = vi.fn();
const mockEnable2FA = vi.fn();
const mockVerify2FA = vi.fn();
const mockDisable2FA = vi.fn();

vi.mock("@/hooks/useSettings", () => ({
  useSettings: vi.fn(() => ({
    preferences: {
      id: 1, userId: 1,
      notificationsEmail: true, notificationsPush: true, notificationsSms: false,
      emailDigest: "daily",
      twoFactorEnabled: false, twoFactorMethod: null,
      showInDirectory: true,
      createdAt: "", updatedAt: "",
    },
    isLoading: false,
    error: null,
    update: mockUpdate,
    isUpdating: false,
    enable2FA: mockEnable2FA,
    verify2FA: mockVerify2FA,
    disable2FA: mockDisable2FA,
    is2FAPending: false,
  })),
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: vi.fn(() => ({
    profile: {
      id: 1, username: "admin", fullName: "أحمد", role: "admin",
      theme: "auto", language: "ar", createdAt: "2025-01-01T00:00:00Z",
    },
    isLoading: false,
  })),
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

// Mock Switch
vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange }: any) => (
    <input type="checkbox" id={id} checked={checked} onChange={e => onCheckedChange(e.target.checked)} />
  ),
}));

import SettingsPage from "../settings";

describe("SettingsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders all four tabs", () => {
    render(<SettingsPage />);
    expect(screen.getByText("الإشعارات")).toBeTruthy();
    expect(screen.getByText("الأمان")).toBeTruthy();
    expect(screen.getByText("التفضيلات")).toBeTruthy();
    expect(screen.getByText("الحساب")).toBeTruthy();
  });

  it("shows notifications settings by default", () => {
    render(<SettingsPage />);
    expect(screen.getByText("قنوات الإشعارات")).toBeTruthy();
    expect(screen.getByText("إشعارات البريد الإلكتروني")).toBeTruthy();
  });

  it("calls update when notification toggle is clicked", async () => {
    mockUpdate.mockResolvedValue({});
    render(<SettingsPage />);
    const emailSwitch = screen.getByLabelText("إشعارات البريد الإلكتروني");
    fireEvent.click(emailSwitch);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ notificationsEmail: false }));
  });

  it("shows security tab content when clicked", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("الأمان"));
    expect(screen.getByText("المصادقة الثنائية (2FA)")).toBeTruthy();
  });

  it("shows 2FA enable buttons when 2FA is disabled", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("الأمان"));
    expect(screen.getByText("تفعيل عبر البريد")).toBeTruthy();
    expect(screen.getByText("تفعيل عبر SMS")).toBeTruthy();
  });

  it("shows preferences tab with theme selector", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("التفضيلات"));
    expect(screen.getByText("المظهر واللغة")).toBeTruthy();
    expect(screen.getByText("السمة")).toBeTruthy();
    expect(screen.getByText("اللغة")).toBeTruthy();
  });

  it("shows account tab with account info", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("الحساب"));
    expect(screen.getByText("معلومات الحساب")).toBeTruthy();
    expect(screen.getByText("تاريخ التسجيل")).toBeTruthy();
  });

  it("calls enable2FA when تفعيل عبر البريد is clicked", async () => {
    mockEnable2FA.mockResolvedValue({ secret_key: "123456", method: "email" });
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("الأمان"));
    fireEvent.click(screen.getByText("تفعيل عبر البريد"));
    await waitFor(() => expect(mockEnable2FA).toHaveBeenCalledWith("email"));
  });

  it("shows email digest selector in notifications tab", () => {
    render(<SettingsPage />);
    expect(screen.getByText("ملخص البريد")).toBeTruthy();
  });

  it("shows export data button in account tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("الحساب"));
    expect(screen.getByText("تصدير بياناتي")).toBeTruthy();
  });

  it("shows privacy section in preferences tab", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("التفضيلات"));
    expect(screen.getByText("الخصوصية")).toBeTruthy();
    expect(screen.getByText("الظهور في دليل المستخدمين")).toBeTruthy();
  });

  it("calls update when showInDirectory toggle is changed", async () => {
    mockUpdate.mockResolvedValue({});
    render(<SettingsPage />);
    fireEvent.click(screen.getByText("التفضيلات"));
    const directorySwitch = screen.getByLabelText("الظهور في دليل المستخدمين");
    fireEvent.click(directorySwitch);
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ showInDirectory: false }));
  });
});

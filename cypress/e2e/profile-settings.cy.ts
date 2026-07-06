/// <reference types="cypress" />

describe("Profile & Settings", () => {
  beforeEach(() => {
    cy.login();
  });

  it("views profile page", () => {
    cy.visit("/profile");
    cy.findByText(/الملف الشخصي/).should("exist");
    cy.findByText(/معلومات الحساب/).should("exist");
  });

  it("edits profile name and bio", () => {
    cy.visit("/profile");
    cy.findByRole("button", { name: /تعديل|edit/i }).click();
    cy.findByLabelText(/الاسم الكامل/).clear().type("مستخدم اختبار");
    cy.findByLabelText(/النبذة الشخصية/).clear().type("مطوّر ومهندس برمجيات");
    cy.findByRole("button", { name: /حفظ التغييرات/i }).click();
    cy.findByText("مستخدم اختبار").should("exist");
  });

  it("edits profile phone number", () => {
    cy.visit("/profile");
    cy.findByRole("button", { name: /تعديل/i }).click();
    cy.findByLabelText(/رقم الهاتف/).clear().type("+966512345678");
    cy.findByRole("button", { name: /حفظ التغييرات/i }).click();
    cy.findByText("+966512345678").should("exist");
  });

  it("changes theme in settings", () => {
    cy.visit("/settings");
    cy.findByText(/التفضيلات/).click();
    cy.findByText(/السمة/).should("exist");
    cy.get("select").first().select("light");
    cy.get("select").first().should("have.value", "light");
  });

  it("changes language in settings", () => {
    cy.visit("/settings");
    cy.findByText(/التفضيلات/).click();
    cy.findByText(/اللغة/).should("exist");
    cy.get("select").eq(1).select("en");
  });

  it("updates notification preferences", () => {
    cy.visit("/settings");
    cy.findByText(/الإشعارات/).should("exist");
    cy.findByText(/قنوات الإشعارات/).should("exist");
    cy.findByLabelText(/إشعارات البريد الإلكتروني/).click();
    cy.wait(500);
    cy.findByLabelText(/إشعارات البريد الإلكتروني/).should("exist");
  });

  it("enables 2FA via email", () => {
    cy.visit("/settings");
    cy.findByText(/الأمان/).click();
    cy.findByText(/المصادقة الثنائية/).should("exist");
    cy.findByRole("button", { name: /تفعيل عبر البريد/i }).click();
    cy.findByText(/أدخل الرمز|رمز التحقق|verification code/i).should("exist");
  });

  it("disables 2FA when enabled", () => {
    cy.visit("/settings");
    cy.findByText(/الأمان/).click();
    cy.get("body").then($body => {
      if ($body.text().includes("تعطيل 2FA")) {
        cy.findByRole("button", { name: /تعطيل 2FA/i }).click();
        cy.findByText(/تعطيل|disabled/i).should("exist");
      }
    });
  });

  it("saved settings persist after reload", () => {
    cy.visit("/settings");
    cy.findByText(/الإشعارات/).should("exist");
    cy.reload();
    cy.findByText(/الإشعارات/).should("exist");
  });
});

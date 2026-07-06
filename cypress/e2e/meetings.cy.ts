/// <reference types="cypress" />

describe("Meetings Workflow", () => {
  beforeEach(() => {
    cy.login();
  });

  it("lists existing meetings", () => {
    cy.visit("/meetings");
    cy.findByText(/الاجتماعات/).should("exist");
    cy.get("table, [data-testid='meeting-list'], .meeting-card").should("exist");
  });

  it("creates a new meeting", () => {
    cy.visit("/meetings");
    cy.findByRole("button", { name: /إنشاء|جديد|new|create/i }).click();
    cy.findByLabelText(/عنوان|title/i).type("اجتماع اختبار E2E");
    cy.findByLabelText(/التاريخ|date/i).type("2026-12-01");
    cy.findByRole("button", { name: /حفظ|إنشاء|save|create/i }).click();
    cy.findByText("اجتماع اختبار E2E").should("exist");
  });

  it("searches meetings with debounce", () => {
    cy.visit("/meetings");
    cy.findByPlaceholderText(/بحث|search/i).type("اجتماع");
    cy.wait(400);
    cy.get("[data-testid='search-results'], table tbody tr, .meeting-card")
      .should("exist");
  });

  it("filters meetings by status", () => {
    cy.visit("/meetings");
    cy.findByRole("button", { name: /فلتر|تصفية|filter/i }).click();
    cy.findByText(/الحالة|status/i).should("exist");
  });

  it("saves a filter view", () => {
    cy.visit("/meetings");
    cy.findByRole("button", { name: /العروض المحفوظة|views/i }).click();
    cy.findByRole("button", { name: /حفظ|save/i }).click();
    cy.findByPlaceholderText(/اسم العرض|view name/i).type("اجتماعات مجدولة");
    cy.findByRole("button", { name: /حفظ|confirm/i }).last().click();
    cy.findByText("اجتماعات مجدولة").should("exist");
  });

  it("views meeting details", () => {
    cy.visit("/meetings");
    cy.get("a[href*='/meetings/'], tr[data-id]").first().click();
    cy.url().should("match", /\/meetings\/\d+/);
    cy.findByText(/تفاصيل|جدول الأعمال|details/i).should("exist");
  });

  it("edits a meeting", () => {
    cy.visit("/meetings");
    cy.get("a[href*='/meetings/']").first().click();
    cy.findByRole("button", { name: /تعديل|edit/i }).click();
    cy.findByLabelText(/عنوان|title/i).clear().type("اجتماع معدَّل");
    cy.findByRole("button", { name: /حفظ|save/i }).click();
    cy.findByText("اجتماع معدَّل").should("exist");
  });

  it("deletes a meeting", () => {
    cy.visit("/meetings");
    const meetingName = "اجتماع سيُحذف";
    cy.findByRole("button", { name: /إنشاء|جديد/i }).click();
    cy.findByLabelText(/عنوان/i).type(meetingName);
    cy.findByLabelText(/التاريخ/i).type("2026-12-31");
    cy.findByRole("button", { name: /حفظ|إنشاء/i }).click();
    cy.findByText(meetingName).should("exist");
    cy.findByRole("button", { name: /حذف|delete/i }).click();
    cy.findByRole("button", { name: /تأكيد|confirm/i }).click();
    cy.findByText(meetingName).should("not.exist");
  });
});

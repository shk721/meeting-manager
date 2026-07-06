/// <reference types="cypress" />

describe("Tasks Workflow", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/tasks");
  });

  it("lists existing tasks", () => {
    cy.findByText(/المهام/).should("exist");
    cy.get("table tbody tr, .task-card, [data-testid='task-item']")
      .should("exist");
  });

  it("creates a new task", () => {
    cy.findByRole("button", { name: /إنشاء|جديد|new|create/i }).click();
    cy.findByLabelText(/عنوان|title/i).type("مهمة اختبار E2E");
    cy.findByRole("button", { name: /حفظ|إنشاء|save|create/i }).click();
    cy.findByText("مهمة اختبار E2E").should("exist");
  });

  it("filters tasks by status", () => {
    cy.findByRole("button", { name: /فلتر|تصفية|filter/i }).click();
    cy.findByText(/الحالة|status/i).should("exist");
    cy.findByText(/مفتوح|open/i).click();
    cy.url().should("include", "status");
  });

  it("filters tasks by priority", () => {
    cy.findByRole("button", { name: /فلتر|تصفية|filter/i }).click();
    cy.findByText(/الأولوية|priority/i).should("exist");
    cy.findByText(/عالٍ|high/i).click();
    cy.get("table tbody tr, .task-card").should("exist");
  });

  it("marks a task as complete", () => {
    cy.get("table tbody tr, .task-card").first().within(() => {
      cy.findByRole("button", { name: /مكتمل|complete|إنهاء/i }).click();
    });
    cy.findByText(/مكتمل|completed/i).should("exist");
  });

  it("deletes a task", () => {
    const taskName = "مهمة ستُحذف";
    cy.findByRole("button", { name: /إنشاء|جديد/i }).click();
    cy.findByLabelText(/عنوان/i).type(taskName);
    cy.findByRole("button", { name: /حفظ|إنشاء/i }).click();
    cy.findByText(taskName).should("exist");
    cy.findByRole("button", { name: /حذف|delete/i }).click();
    cy.findByRole("button", { name: /تأكيد|confirm/i }).click();
    cy.findByText(taskName).should("not.exist");
  });
});

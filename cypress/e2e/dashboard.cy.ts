/// <reference types="cypress" />

describe("Dashboard Flow", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dashboard");
  });

  it("loads dashboard with KPI cards", () => {
    cy.findByText(/إجمالي الاجتماعات/).should("exist");
    cy.findByText(/مهام مفتوحة/).should("exist");
    cy.findByText(/نسبة الإنجاز/).should("exist");
  });

  it("shows this week meetings section", () => {
    cy.findByText(/هذا الأسبوع/).should("exist");
    cy.findByText(/الاجتماعات/).should("exist");
  });

  it("shows pending tasks section", () => {
    cy.findByText(/الإجراءات المعلقة/).should("exist");
    cy.findByText(/مهام متأخرة/).should("exist");
  });

  it("KPI card numbers are visible", () => {
    cy.get("[class*='text-2xl']").should("have.length.at.least", 5);
  });

  it("meeting chart period selector changes view", () => {
    cy.findByText(/الاجتماعات عبر الزمن/).should("exist");
    cy.findAllByLabelText(/اختر الفترة/).first().select("month");
    cy.findAllByLabelText(/اختر الفترة/).first().should("have.value", "month");
  });

  it("insights widget shows busiest day", () => {
    cy.findByText(/إحصائيات ونظرة عامة/).should("exist");
    cy.findByText(/أكثر يوم اجتماعات/).should("exist");
  });
});

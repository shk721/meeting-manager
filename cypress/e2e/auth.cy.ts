/// <reference types="cypress" />

describe("Authentication Flow", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("shows login page for unauthenticated users", () => {
    cy.url().should("include", "/login");
    cy.findByRole("heading", { name: /تسجيل الدخول|دخول|login/i }).should("exist");
  });

  it("user can log in with valid credentials", () => {
    cy.findByPlaceholderText(/اسم المستخدم|username/i).type("admin");
    cy.findByPlaceholderText(/كلمة المرور|password/i).type("admin123");
    cy.findByRole("button", { name: /دخول|تسجيل الدخول/i }).click();
    cy.url().should("include", "/dashboard");
    cy.findByText(/لوحة التحكم/i).should("exist");
  });

  it("shows error for invalid credentials", () => {
    cy.findByPlaceholderText(/اسم المستخدم|username/i).type("wronguser");
    cy.findByPlaceholderText(/كلمة المرور|password/i).type("wrongpass");
    cy.findByRole("button", { name: /دخول|تسجيل الدخول/i }).click();
    cy.findByText(/خطأ|غير صحيح|invalid|error/i).should("exist");
    cy.url().should("include", "/login");
  });

  it("session persists on page reload", () => {
    cy.login();
    cy.visit("/dashboard");
    cy.reload();
    cy.url().should("include", "/dashboard");
    cy.findByText(/لوحة التحكم/i).should("exist");
  });

  it("user can log out", () => {
    cy.login();
    cy.visit("/dashboard");
    cy.logout();
    cy.url().should("include", "/login");
  });
});

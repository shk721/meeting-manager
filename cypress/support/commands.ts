/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>;
      logout(): Chainable<void>;
      apiRequest(method: string, path: string, body?: unknown): Chainable<Cypress.Response<any>>;
    }
  }
}

Cypress.Commands.add("login", (username = "admin", password = "admin123") => {
  cy.session([username, password], () => {
    cy.visit("/");
    cy.findByPlaceholderText(/اسم المستخدم|username/i).type(username);
    cy.findByPlaceholderText(/كلمة المرور|password/i).type(password);
    cy.findByRole("button", { name: /دخول|تسجيل الدخول|login/i }).click();
    cy.url().should("include", "/dashboard");
  });
});

Cypress.Commands.add("logout", () => {
  cy.findByRole("button", { name: /خروج|تسجيل الخروج|logout/i }).click();
  cy.url().should("not.include", "/dashboard");
});

Cypress.Commands.add("apiRequest", (method, path, body?) => {
  return cy.request({
    method,
    url: `${Cypress.env("apiUrl")}${path}`,
    body,
    failOnStatusCode: false,
  });
});

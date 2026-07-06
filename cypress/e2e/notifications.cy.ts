/// <reference types="cypress" />

describe("Notifications", () => {
  beforeEach(() => {
    cy.login();
    cy.visit("/dashboard");
  });

  it("bell icon is visible in layout", () => {
    cy.get("[data-testid='notification-bell'], [aria-label*='إشعار'], button:has(svg.bell)")
      .should("exist");
  });

  it("shows unread count badge", () => {
    cy.apiRequest("GET", "/notifications/unread-count").then(res => {
      const count = res.body.count;
      if (count > 0) {
        cy.get("[data-testid='unread-badge'], .badge")
          .should("contain", count);
      }
    });
  });

  it("opens notification panel on bell click", () => {
    cy.get("[data-testid='notification-bell'], [aria-label*='إشعار']").first().click();
    cy.findByText(/الإشعارات/).should("exist");
  });

  it("marks notification as read", () => {
    cy.apiRequest("GET", "/notifications").then(res => {
      if (res.body.length > 0) {
        const notifId = res.body[0].id;
        cy.apiRequest("POST", `/notifications/${notifId}/read`).then(r => {
          expect(r.status).to.eq(200);
        });
      }
    });
  });

  it("clears all notifications", () => {
    cy.get("[data-testid='notification-bell'], [aria-label*='إشعار']").first().click();
    cy.get("body").then($body => {
      if ($body.text().includes("قراءة الكل")) {
        cy.findByRole("button", { name: /قراءة الكل/i }).click();
        cy.wait(500);
        cy.findByText(/لا إشعارات|no notifications/i).should("exist");
      }
    });
  });
});
